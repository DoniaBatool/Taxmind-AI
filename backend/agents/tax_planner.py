"""
Sub-Agent 4: Tax Planner
Current financials → actionable tax planning opportunities
"""

import json
import logging
from agents.openai_client import call_openai_sync as call_gemini_sync

logger = logging.getLogger(__name__)


TAX_PLANNING_PROMPT = """
You are a senior tax planning advisor (CPA). Identify tax planning opportunities for this client.

CLIENT FINANCIAL DATA:
{financial_summary}

ENTITY TYPE: {entity_type}
TAX YEAR: {tax_year}

Check for these specific opportunities:
1. Section 199A (20% QBI deduction) — eligibility and optimization
2. Estimated quarterly tax payments — underpayment risk
3. Retirement plan contributions (SEP-IRA, Solo 401k, SIMPLE IRA) — windows
4. Equipment/asset purchases — Section 179 or bonus depreciation
5. Officer compensation optimization (S-Corp) — reasonable compensation analysis
6. Missed deductions — home office, vehicle, business meals, professional development
7. Entity structure review — is current entity type optimal?
8. Year-end tax planning moves — timing of income/expenses

Return ONLY valid JSON array of opportunities:
[
  {{
    "opportunity": "Short title",
    "category": "Deduction|Credit|Timing|Structure|Retirement|Compliance",
    "description": "Detailed explanation",
    "estimated_savings": 0,
    "action_required": "What to do and by when",
    "deadline": "Dec 31, 2024 | Q4 2024 | ASAP | etc",
    "priority": "high|medium|low",
    "applies_to_entity": ["S-Corp", "LLC", "all"]
  }}
]

Return ONLY the JSON array. Be specific with dollar estimates where possible.
"""


def find_tax_opportunities(
    financial_summary: str,
    entity_type: str = "LLC",
    tax_year: int = 2024,
) -> list[dict]:
    """
    Tax planning opportunities dhundo.

    Args:
        financial_summary: Readable financial summary text
        entity_type: S-Corp, LLC, Sole-Prop, Partnership
        tax_year: Analysis year

    Returns:
        List of tax opportunities
    """
    prompt = TAX_PLANNING_PROMPT.format(
        financial_summary=financial_summary[:8000],
        entity_type=entity_type,
        tax_year=tax_year,
    )

    try:
        response_text = call_gemini_sync(prompt, temperature=0.3)

        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip().rstrip("```").strip()

        opportunities = json.loads(clean)
        if not isinstance(opportunities, list):
            opportunities = []

        # High priority pehle
        opportunities.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}.get(x.get("priority", "low"), 2))

        logger.info(f"Tax planning complete — {len(opportunities)} opportunities found")
        return opportunities

    except json.JSONDecodeError as e:
        logger.error(f"Tax planner JSON error: {e}")
        return []
    except Exception as e:
        logger.error(f"Tax planner error: {e}")
        return []


def generate_smart_questions(
    red_flags: list[dict],
    entity_type: str,
    tax_opportunities: list[dict],
) -> list[str]:
    """
    Accountant ke liye smart follow-up questions generate karo.
    """
    prompt = f"""
You are a CPA preparing for a client review meeting. Based on these red flags and tax opportunities,
generate 5-8 specific, actionable follow-up questions to ask the client.

RED FLAGS:
{json.dumps(red_flags, indent=2)[:3000]}

TAX OPPORTUNITIES:
{json.dumps(tax_opportunities, indent=2)[:3000]}

ENTITY TYPE: {entity_type}

Return ONLY a JSON array of question strings:
["Question 1?", "Question 2?", ...]

Questions should be specific, professional, and directly related to the issues found.
"""

    try:
        response = call_gemini_sync(prompt, temperature=0.4)
        clean = response.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip().rstrip("```").strip()

        questions = json.loads(clean)
        return questions if isinstance(questions, list) else []

    except Exception as e:
        logger.error(f"Smart questions error: {e}")
        return []
