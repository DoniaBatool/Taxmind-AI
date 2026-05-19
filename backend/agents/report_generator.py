"""
Sub-Agent 5: Report Generator
Saare sub-agent outputs → formatted client review report (Markdown)
"""

import json
import logging
from agents.gemini_client import call_gemini_sync

logger = logging.getLogger(__name__)


REPORT_PROMPT = """
You are a senior CPA writing a professional client financial review report.
Write a comprehensive, well-structured report in Markdown format.

CLIENT NAME: {client_name}
ENTITY TYPE: {entity_type}
REVIEW PERIOD: {analysis_year} vs {prior_year}

YoY COMPARISON DATA:
{comparison_data}

RED FLAGS FOUND:
{red_flags}

TAX PLANNING OPPORTUNITIES:
{tax_opportunities}

SMART QUESTIONS:
{smart_questions}

Write a professional report with these sections:
1. Executive Summary (3-4 sentences)
2. Financial Performance Overview (YoY comparison with key metrics)
3. Areas of Concern (red flags explained in plain language)
4. Tax Planning Recommendations (specific action items)
5. Questions for Client Meeting (numbered list)
6. Next Steps & Timeline

Use professional CPA language. Be specific with numbers.
Format nicely with headers, bullet points, and tables where appropriate.
"""


def generate_client_report(
    client_name: str,
    entity_type: str,
    analysis_year: int,
    comparison_data: dict,
    red_flags: list[dict],
    tax_opportunities: list[dict],
    smart_questions: list[str],
) -> str:
    """
    Complete client review report generate karo.

    Returns:
        Markdown formatted report string
    """
    prior_year = analysis_year - 1

    prompt = REPORT_PROMPT.format(
        client_name=client_name,
        entity_type=entity_type,
        analysis_year=analysis_year,
        prior_year=prior_year,
        comparison_data=json.dumps(comparison_data, indent=2)[:5000],
        red_flags=json.dumps(red_flags, indent=2)[:4000],
        tax_opportunities=json.dumps(tax_opportunities, indent=2)[:4000],
        smart_questions=json.dumps(smart_questions)[:2000],
    )

    try:
        report_text = call_gemini_sync(prompt, temperature=0.5)
        logger.info(f"Report generated for {client_name} — {len(report_text)} chars")
        return report_text

    except Exception as e:
        logger.error(f"Report generator error: {e}")
        return f"# Report Generation Failed\n\nError: {str(e)}"
