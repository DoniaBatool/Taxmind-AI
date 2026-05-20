"""
Documents Router — PDF tax return + CSV P&L upload, list, delete
"""

import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db
from models import Client, TaxReturn, Financials
from parsers.pdf_parser import extract_text_from_pdf
from parsers.csv_parser import parse_pl_csv
from config import settings

router = APIRouter(prefix="/api/clients", tags=["documents"])

ALLOWED_PDF = {"application/pdf", "text/plain"}
ALLOWED_CSV = {"text/csv", "application/csv", "text/plain"}


async def save_upload(file: UploadFile, folder: str) -> str:
    """Save uploaded file to disk, return file path"""
    os.makedirs(folder, exist_ok=True)
    file_path = os.path.join(folder, file.filename)
    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)
    return file_path


# ── PDF Tax Return Upload ─────────────────────────────────────────────────────

@router.post("/{client_id}/tax-return")
async def upload_tax_return(
    client_id: str,
    tax_year: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload prior-year PDF tax return"""
    # Verify client exists
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Save file to disk
    folder = os.path.join(settings.upload_dir, client_id, "tax-returns")
    file_path = await save_upload(file, folder)

    # Extract text from PDF
    raw_text = extract_text_from_pdf(file_path)

    # Save to database
    tax_return = TaxReturn(
        client_id=client_id,
        tax_year=tax_year,
        raw_file_path=file_path,
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
    """Upload current-year CSV P&L statement"""
    # Verify client exists
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Save file to disk
    folder = os.path.join(settings.upload_dir, client_id, "financials")
    file_path = await save_upload(file, folder)

    # Parse CSV data
    parsed_data = parse_pl_csv(file_path)

    # Save to database
    financials = Financials(
        client_id=client_id,
        fiscal_year=fiscal_year,
        raw_file_path=file_path,
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
    """List all uploaded documents for a client"""
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
                "filename": os.path.basename(t.raw_file_path) if t.raw_file_path else "unknown",
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
                "filename": os.path.basename(f.raw_file_path) if f.raw_file_path else "unknown",
                "rows": len(f.parsed_data) if f.parsed_data else 0,
                "uploaded_at": f.created_at,
            }
            for f in financials
        ],
    }


# ── View Documents ────────────────────────────────────────────────────────────

@router.get("/{client_id}/tax-return/{doc_id}/view")
async def view_tax_return(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Serve the raw tax return file for inline viewing"""
    result = await db.execute(
        select(TaxReturn).where(TaxReturn.id == doc_id, TaxReturn.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.raw_file_path or not os.path.exists(doc.raw_file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    filename = os.path.basename(doc.raw_file_path)
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    media_type = "application/pdf" if ext == "pdf" else "text/plain; charset=utf-8"
    return FileResponse(doc.raw_file_path, media_type=media_type, filename=filename)


@router.get("/{client_id}/financials/{doc_id}/view")
async def view_financials(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Serve the raw CSV file for inline viewing"""
    result = await db.execute(
        select(Financials).where(Financials.id == doc_id, Financials.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.raw_file_path or not os.path.exists(doc.raw_file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    filename = os.path.basename(doc.raw_file_path)
    return FileResponse(doc.raw_file_path, media_type="text/csv; charset=utf-8", filename=filename)


# ── Delete Documents ──────────────────────────────────────────────────────────

@router.delete("/{client_id}/tax-return/{doc_id}")
async def delete_tax_return(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a tax return document"""
    result = await db.execute(
        select(TaxReturn).where(TaxReturn.id == doc_id, TaxReturn.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk if it exists
    if doc.raw_file_path and os.path.exists(doc.raw_file_path):
        try:
            os.remove(doc.raw_file_path)
        except OSError:
            pass

    await db.delete(doc)
    await db.commit()
    return {"message": "Tax return deleted successfully"}


@router.delete("/{client_id}/financials/{doc_id}")
async def delete_financials(client_id: str, doc_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a financials / P&L document"""
    result = await db.execute(
        select(Financials).where(Financials.id == doc_id, Financials.client_id == client_id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.raw_file_path and os.path.exists(doc.raw_file_path):
        try:
            os.remove(doc.raw_file_path)
        except OSError:
            pass

    await db.delete(doc)
    await db.commit()
    return {"message": "P&L document deleted successfully"}
