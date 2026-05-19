"""
Sub-Agent 3: Anomaly Detector
YoY comparison → prioritized red flags with severity classification
"""

import json
import logging
from agents.gemini_client import call_gemini_sync

logger = logging.getLogger(__name__)


RED_FLAG_PROMPT = """
You are a tax compliance specialist and forensic accountant. Analyze this year-over-year comparison for red flags, anomalies, and compliance risks.

YoY COMPARISON DATA:
{comparison_json}

ENTITY TYPE: {entity_type}

Apply these rules AND use your professional judgment:
- Revenue drop/spike beyond 20% → flag
- Any single expense category change beyond 50% → flag
- Missing or zero officer compensation for S-Corp → HIGH RISK (IRS compliance)
- Net loss in current year → flag
- COGS ratio vs revenue unusually high/low → flag
- New expense categories that didn't exist before → flag
- Miscellaneous expenses spike → flag (audit trigger)

Return ONLY valid JSON list of red flags:
[
  {{
    "severity": "high|medium|low",
    "category": "Revenue|Expenses|Compliance|COGS|Profitability",
    "title": "Short title of the issue",
    "description": "Detailed explanation of what was found",
    "amount_impact": 0,
    "recommendation": "What the accountant should do about this",
    "irs_risk": true
  }}
]

Order by severity (high first). Return ONLY the JSON array. No other text.
"""

PRIORITY_RULES = {
    "high": "urgent",
    "medium": "review",
    "low": "on-track",
}


def detect_anomalies(
    comparison_data: dict,
    entity_type: str = "LLC",
) -> dict:
    """
    Comparison data mein anomalies dhundo.

    Args:
        comparison_data: comparator.py ka output
        entity_type: S-Corp, LLC, Sole-Prop, Partnership

    Returns:
        Dict with red_flags list + priority_level + one_line_summary
    """
    comparison_json = json.dumps(comparison_data, indent=2)

    prompt = RED_FLAG_PROMPT.format(
        comparison_json=comparison_json[:10000],
        entity_type=entity_type,
    )

    try:
        response_text = call_gemini_sync(prompt, temperature=0.2)

        clean = response_text.strip()
        if clean.startswith("```"):
            clean = clean.split("```")[1]
            if clean.startswith("json"):
                clean = clean[4:]
        clean = clean.strip().rstrip("```").strip()

        red_flags = json.loads(clean)

        # Priority level determine karo
        if not isinstance(red_flags, list):
            red_flags = []

        high_count = sum(1 for f in red_flags if f.get("severity") == "high")
        medium_count = sum(1 for f in red_flags if f.get("severity") == "medium")

        if high_count > 0:
            priority_level = "urgent"
        elif medium_count > 0:
            priority_level = "review"
        else:
            priority_level = "on-track"

        # One-line summary banao
        total_flags = len(red_flags)
        if total_flags == 0:
            summary = "No significant issues found — financials look healthy"
        elif priority_level == "urgent":
            summary = f"{high_count} urgent issue(s) require immediate attention"
        else:
            summary = f"{total_flags} item(s) flagged for accountant review"

        logger.info(f"Anomaly detection complete — {total_flags} flags, priority: {priority_level}")

        return {
            "red_flags": red_flags,
            "priority_level": priority_level,
            "one_line_summary": summary,
            "high_count": high_count,
            "medium_count": medium_count,
            "low_count": total_flags - high_count - medium_count,
        }

    except json.JSONDecodeError as e:
        logger.error(f"Anomaly detector JSON error: {e}")
        return {
            "red_flags": [],
            "priority_level": "review",
            "one_line_summary": "Analysis could not complete — manual review needed",
        }
    except Exception as e:
        logger.error(f"Anomaly detector error: {e}")
        return {"red_flags": [], "error": str(e)}
