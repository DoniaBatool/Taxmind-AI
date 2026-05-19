"""
PDF Parser — Tax return se text extract karo
pdfplumber use karta hai real PDFs ke liye
.txt files bhi handle karta hai (fake data ke liye)
"""

import os
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> str:
    """
    PDF ya text file se raw text extract karo.

    Args:
        file_path: PDF ya .txt file ka path

    Returns:
        Extracted text as string
    """
    if not os.path.exists(file_path):
        logger.error(f"File nahi mili: {file_path}")
        return ""

    extension = os.path.splitext(file_path)[1].lower()

    # .txt files (fake data) seedha read karo
    if extension == ".txt":
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    # Real PDF files — pdfplumber use karo
    if extension == ".pdf":
        try:
            import pdfplumber
            full_text = []
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages, 1):
                    text = page.extract_text()
                    if text:
                        full_text.append(f"--- Page {page_num} ---\n{text}")

                    # Tables bhi extract karo
                    tables = page.extract_tables()
                    for table in tables:
                        if table:
                            table_text = "\n".join(
                                " | ".join(str(cell) if cell else "" for cell in row)
                                for row in table
                                if row
                            )
                            full_text.append(f"[TABLE]\n{table_text}")

            return "\n\n".join(full_text)

        except Exception as e:
            logger.error(f"PDF extract error: {e}")
            return ""

    logger.warning(f"Unsupported file type: {extension}")
    return ""


def get_text_preview(text: str, chars: int = 500) -> str:
    """Text ka preview return karo (debugging ke liye)"""
    if not text:
        return "(empty)"
    return text[:chars] + ("..." if len(text) > chars else "")
