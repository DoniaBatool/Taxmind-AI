"""
Sub-Agent 1: PDF Tax Analyzer
PDF tax return text → structured JSON financial profile
"""

import json
import logging
from agents.openai_client import call_openai_sync as call_gemini_sync

logger = logging.getLogger(__name__)


EXTRACTION_PROMPT = """
You are a CPA and tax document specialist. Extract structured financial data from this tax return.

TAX RETURN TEXT:
{tax_text}

CLIENT ENTITY TYPE: {entity_type}

Extract and return ONLY valid JSON (no markdown, no explanation) in this exact format:
{{
  "entity_type": "S-Corp|LLC|Sole-Prop|Partnership",
  "tax_year": 2023,
  "filing_form": "1120-S|1065|Schedule-C|1040",
  "revenue": {{
    "gross_receipts": 0,
    "other_income": 0,
    "total_income": 0
  }},
  "cogs": 0,
  "gross_profit": 0,
  "deductions": {{
    "salaries_wages": 0,
    "officer_compensation": 0,
    "rent": 0,
    "taxes_licenses": 0,
    "depreciation": 0,
    "advertising": 0,
    "utilities": 0,
    "insurance": 0,
    "repairs_maintenance": 0,
    "other_deductions": 0,
    "total_deductions": 0
  }},
  "net_income": 0,
  "net_loss": 0,
  "has_officer_compensation": true,
  "red_flag_hints": ["list any obvious issues you notice"],
  "notes": "any important observations"
}}

Return ONLY the JSON object. No other text.
"""


def analyze_pdf_tax_return(tax_text: str, entity_type: str = "Unknown") -> dict:
    """
    PDF tax return text ko Gemini se analyze karwa ke structured JSON nikalo.

    Args:
        tax_text: PDF se extracted raw text
        entity_type: S-Corp, LLC, Sole-Prop, Partnership

    Returns:
        Structured dict with financial data
    """
    if not tax_text or len(tax_text) < 100:
        logger.warning("Tax text bahut chhota hai ya khali hai")
        return {"error": "Insufficient tax return text"}

    prompt = EXTRACTION_PROMPT.format(
        tax_text=tax_text[:50000],  # Gemini ke context mein fit karo (1M tokens available)
        entity_type=entity_type,
    )

    try:
        response_text = call_gemini_sync(prompt, temperature=0.1)

        # JSON clean karo agar markdown blocks hain
        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip().rstrip("```").strip()

        result = json.loads(clean)
        logger.info(f"PDF analysis complete — Net income: {result.get('net_income', 'N/A')}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}\nResponse: {response_text[:500]}")
        return {"error": "JSON parse failed", "raw_response": response_text[:500]}
    except Exception as e:
        logger.error(f"PDF analyzer error: {e}")
        return {"error": str(e)}
