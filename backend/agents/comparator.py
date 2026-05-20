"""
Sub-Agent 2: Financial Comparator
Prior-year tax JSON + current-year CSV → YoY comparison table
"""

import json
import logging
from agents.openai_client import call_openai_sync as call_gemini_sync
from parsers.csv_parser import csv_to_text

logger = logging.getLogger(__name__)


COMPARISON_PROMPT = """
You are a financial analyst at a CPA firm. Compare the prior-year tax return data with the current-year P&L statement.

PRIOR YEAR TAX RETURN (Extracted Data):
{prior_year_json}

CURRENT YEAR P&L STATEMENT:
{current_year_pl}

Perform a line-by-line year-over-year comparison. Return ONLY valid JSON:
{{
  "comparison_year": 2024,
  "prior_year": 2023,
  "revenue_comparison": {{
    "prior": 0,
    "current": 0,
    "change_amount": 0,
    "change_pct": 0,
    "direction": "increase|decrease|flat",
    "interpretation": "brief explanation"
  }},
  "gross_profit_comparison": {{
    "prior": 0,
    "current": 0,
    "change_amount": 0,
    "change_pct": 0,
    "direction": "increase|decrease|flat",
    "interpretation": "brief explanation"
  }},
  "net_income_comparison": {{
    "prior": 0,
    "current": 0,
    "change_amount": 0,
    "change_pct": 0,
    "direction": "increase|decrease|flat",
    "interpretation": "brief explanation"
  }},
  "expense_categories": [
    {{
      "category": "category name",
      "prior": 0,
      "current": 0,
      "change_pct": 0,
      "notable": true
    }}
  ],
  "overall_health": "improving|stable|declining|critical",
  "key_observations": ["list of 3-5 key observations"]
}}

Return ONLY the JSON. No other text.
"""


def compare_financials(
    prior_year_data: dict,
    current_year_csv_data: list[dict],
    analysis_year: int = 2024,
) -> dict:
    """
    Prior year tax data vs current year CSV data compare karo.

    Args:
        prior_year_data: pdf_analyzer ka output (dict)
        current_year_csv_data: csv_parser ka output (list of dicts)
        analysis_year: current year

    Returns:
        YoY comparison dict
    """
    prior_json = json.dumps(prior_year_data, indent=2)
    current_pl_text = csv_to_text(current_year_csv_data)

    prompt = COMPARISON_PROMPT.format(
        prior_year_json=prior_json[:10000],
        current_year_pl=current_pl_text[:10000],
    )

    try:
        response_text = call_gemini_sync(prompt, temperature=0.1)

        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip().rstrip("```").strip()

        result = json.loads(clean)
        logger.info(f"Comparison complete — Health: {result.get('overall_health', 'N/A')}")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Comparison JSON parse error: {e}")
        return {"error": "JSON parse failed"}
    except Exception as e:
        logger.error(f"Comparator error: {e}")
        return {"error": str(e)}
