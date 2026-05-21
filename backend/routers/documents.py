"""
Documents Router — PDF tax return + CSV P&L upload, list, delete
Files are stored in Cloudflare R2 (persistent object storage).
"""

import os
import tempfile
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Client, TaxReturn, Financials
from parsers.pdf_parser import extract_text_from_pdf
from parsers.csv_parser import parse_pl_csv
import storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/clients", tags=["documents"])

CONTENT_TYPES = {
    "pdf": "application/pdf",
    "txt": "text/plain; charset=utf-8",
    "csv": "text/csv; charset=utf-8",
}


def _content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return CONTENT_TYPES.get(ext, "application/octet-stream")


async def _parse_upload(file: UploadFile, parser_fn):
    """
    Read upload bytes, write to a temp file, run parser, clean up.
    Returns (raw_bytes, parsed_result).
    """
    file_bytes = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"

    with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = parser_fn(tmp_path)
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    return file_bytes, result


# ── PDF Tax Return Upload ─────────────────────────────────────────────────────

@router.post("/{client_id}/tax-return")
async def upload_tax_return(
    client_id: str,
    tax_year: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload prior-year PDF tax return → store in R2."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Parse and upload to R2
    file_bytes, raw_text = await _parse_upload(file, extract_text_from_pdf)
    r2_key = f"{client_id}/tax-returns/{file.filename}"
    storage.upload_bytes(file_bytes, r2_key, _content_type(file.filename))

    # Save record to DB (raw_file_path holds the R2 key)
    tax_return = TaxReturn(
        client_id=client_id,
        tax_year=tax_year,
        raw_file_path=r2_key,
        raw_text=raw_text,
        extraction_status="done",
    )
    db.add(tax_return)
    await db.flush()
    await db.refresh(tax_return)

    return {
        "id": tax_return.id,
        "message": f"Tax return for {tax_year} uploaded successfully",
        "text_length": len(raw_text) if raw_text else 0,
    }


# ── CSV P&L Upload ────────────────────────────────────────────────────────────

@router.post("/{client_id}/financials")
async def upload_financials(
    client_id: str,
    fiscal_year: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload current-year CSV P&L statement → store in R2."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Parse and upload to R2
    file_bytes, parsed_data = await _parse_upload(file, parse_pl_csv)
    r2_key = f"{client_id}/financials/{file.filename}"
    storage.upload_bytes(file_bytes, r2_key, _content_type(file.filename))

    # Save record to DB
    financials = Financials(
        client_id=client_id,
        fiscal_year=fiscal_year,
        raw_file_path=r2_key,
        parsed_data=parsed_data,
    )
    db.add(financials)
    await db.flush()
    await db.refresh(financials)

    return {
        "id": financials.id,
        "message": f"P&L statement for {fiscal_year} uploaded successfully",
        "rows": len(parsed_data) if parsed_data else 0,
    }


# ── List Documents ────────────────────────────────────────────────────────────

@router.get("/{client_id}/documents")
async def list_documents(client_id: str, db: AsyncSession = Depends(get_db)):
    """List all uploaded documents for a client."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Client not found")

    tax_res = await db.execute(
        select(TaxReturn).where(TaxReturn.client_id == client_id).order_by(TaxReturn.created_at.desc())
    )
    fin_res = await db.execute(
        select(Financials).where(Financials.client_id == client_id).order_by(Financials.created_at.desc())
    )

    tax_returns = tax_res.scalars().all()
    financials  = fin_res.scalars().all()

    return {
        "tax_returns": [
            {
                "id": t.id,
                "tax_year": t.tax_year,
                "filename": t.raw_file_path.split("/")[-1] if t.raw_file_path else "unknown",
                "extraction_status": t.extraction_status,
                "text_length": len(t.raw_text) if t.raw_text else 0,
                "uploaded_at": t.created_at,
            }
            for t in tax_returns
        ],
        "financials": [
            {
                "id": f.id,
                "fiscal_year": f.fiscal_year,
                "filename": f.raw_file_path.split("/")[-1] if f.raw_file_path else "unknown",
                "rows": len(f.parsed_data) if f.parsed_data else 0,
                "uploaded_at": f.created_at,
            }
            for f in financials
        ],
    }


# ── View Documents (stream from R2) ──────────────────────────────────────────

@router.get("/{client_id}/tax-return/{doc_id}/view")
async def view_tax_return(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Stream tax return file from R2 for inline viewing."""
    result = await db.execute(
        select(TaxReturn).where(TaxReturn.id == doc_id, TaxReturn.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.raw_file_path:
        raise HTTPException(status_code=404, detail="File not found")

    # Backward compat: old local-disk paths
    if doc.raw_file_path.startswith("/"):
        if os.path.exists(doc.raw_file_path):
            from fastapi.responses import FileResponse
            filename   = os.path.basename(doc.raw_file_path)
            ext        = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
            media_type = "application/pdf" if ext == "pdf" else "text/plain; charset=utf-8"
            return FileResponse(doc.raw_file_path, media_type=media_type, filename=filename)
        raise HTTPException(status_code=404, detail="File no longer on disk")

    # R2 path — download and stream
    try:
        file_bytes = storage.download_bytes(doc.raw_file_path)
        filename   = doc.raw_file_path.split("/")[-1]
        return StreamingResponse(
            iter([file_bytes]),
            media_type=_content_type(filename),
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    except Exception as e:
        logger.error(f"R2 download error for {doc.raw_file_path}: {e}")
        raise HTTPException(status_code=404, detail="File not available in storage")


@router.get("/{client_id}/financials/{doc_id}/view")
async def view_financials(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Stream CSV file from R2 for inline viewing."""
    result = await db.execute(
        select(Financials).where(Financials.id == doc_id, Financials.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.raw_file_path:
        raise HTTPException(status_code=404, detail="File not found")

    # Backward compat
    if doc.raw_file_path.startswith("/"):
        if os.path.exists(doc.raw_file_path):
            from fastapi.responses import FileResponse
            return FileResponse(doc.raw_file_path, media_type="text/csv; charset=utf-8",
                                filename=os.path.basename(doc.raw_file_path))
        raise HTTPException(status_code=404, detail="File no longer on disk")

    try:
        file_bytes = storage.download_bytes(doc.raw_file_path)
        filename   = doc.raw_file_path.split("/")[-1]
        return StreamingResponse(
            iter([file_bytes]),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'inline; filename="{filename}"'},
        )
    except Exception as e:
        logger.error(f"R2 download error for {doc.raw_file_path}: {e}")
        raise HTTPException(status_code=404, detail="File not available in storage")


# ── Delete Documents ──────────────────────────────────────────────────────────

@router.delete("/{client_id}/tax-return/{doc_id}")
async def delete_tax_return(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a tax return document from DB and R2."""
    result = await db.execute(
        select(TaxReturn).where(TaxReturn.id == doc_id, TaxReturn.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.raw_file_path:
        if doc.raw_file_path.startswith("/"):
            try:
                os.remove(doc.raw_file_path)
            except OSError:
                pass
        else:
            storage.delete_file(doc.raw_file_path)

    await db.delete(doc)
    await db.commit()
    return {"message": "Tax return deleted successfully"}


@router.delete("/{client_id}/financials/{doc_id}")
async def delete_financials(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a financials / P&L document from DB and R2."""
    result = await db.execute(
        select(Financials).where(Financials.id == doc_id, Financials.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.raw_file_path:
        if doc.raw_file_path.startswith("/"):
            try:
                os.remove(doc.raw_file_path)
            except OSError:
                pass
        else:
            storage.delete_file(doc.raw_file_path)

    await db.delete(doc)
    await db.commit()
    return {"message": "P&L document deleted successfully"}
