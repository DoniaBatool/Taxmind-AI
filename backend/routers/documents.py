"""
Documents Router — PDF tax return + CSV P&L upload
"""

import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db
from models import Client, TaxReturn, Financials
from parsers.pdf_parser import extract_text_from_pdf
from parsers.csv_parser import parse_pl_csv
from config import settings

router = APIRouter(prefix="/api/clients", tags=["documents"])

ALLOWED_PDF = {"application/pdf", "text/plain"}
ALLOWED_CSV = {"text/csv", "application/csv", "text/plain"}


async def save_upload(file: UploadFile, folder: str) -> str:
    """File ko disk pe save karo, path return karo"""
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
    """Prior-year PDF tax return upload karo"""
    # Client check
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client nahi mila")

    # Save file
    folder = os.path.join(settings.upload_dir, client_id, "tax-returns")
    file_path = await save_upload(file, folder)

    # Text extract karo
    raw_text = extract_text_from_pdf(file_path)

    # DB mein save karo
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
        "message": f"{tax_year} ka tax return upload ho gaya",
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
    """Current-year CSV P&L statement upload karo"""
    # Client check
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client nahi mila")

    # Save file
    folder = os.path.join(settings.upload_dir, client_id, "financials")
    file_path = await save_upload(file, folder)

    # CSV parse karo
    parsed_data = parse_pl_csv(file_path)

    # DB mein save karo
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
        "message": f"{fiscal_year} ki P&L upload ho gayi",
        "rows": len(parsed_data) if parsed_data else 0,
    }
