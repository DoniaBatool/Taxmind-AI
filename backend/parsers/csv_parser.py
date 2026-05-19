"""
CSV Parser — P&L statement CSV files parse karo
Tumhara exact CSV format handle karta hai:
category, subcategory, amount, prior_year_amount, notes
"""

import pandas as pd
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def parse_pl_csv(file_path: str) -> list[dict]:
    """
    P&L CSV file parse karo → list of dicts

    Args:
        file_path: CSV file ka path

    Returns:
        List of row dicts
    """
    try:
        df = pd.read_csv(file_path)

        # Column names normalize karo (lowercase + strip spaces)
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

        # Amount columns ko numeric banao
        for col in ["amount", "prior_year_amount"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

        # NaN ko empty string se replace karo
        df = df.fillna("")

        return df.to_dict(orient="records")

    except Exception as e:
        logger.error(f"CSV parse error: {e}")
        return []


def get_summary_from_parsed(data: list[dict]) -> dict:
    """
    Parsed CSV data se quick financial summary nikalo

    Returns:
        Dict with total_revenue, total_cogs, gross_profit, total_expenses, net_income
    """
    if not data:
        return {}

    summary = {
        "total_revenue": 0,
        "total_cogs": 0,
        "gross_profit": 0,
        "total_expenses": 0,
        "net_income": 0,
        "prior_total_revenue": 0,
        "prior_net_income": 0,
    }

    for row in data:
        category = str(row.get("category", "")).lower()
        subcategory = str(row.get("subcategory", "")).lower()
        amount = float(row.get("amount", 0))
        prior = float(row.get("prior_year_amount", 0))

        if "total revenue" in subcategory or "total revenue" in category:
            summary["total_revenue"] = amount
            summary["prior_total_revenue"] = prior
        elif "total cogs" in subcategory or "total cogs" in category:
            summary["total_cogs"] = amount
        elif "gross profit" in category or "gross profit" in subcategory:
            summary["gross_profit"] = amount
        elif "total expenses" in subcategory or "total expenses" in category:
            summary["total_expenses"] = amount
        elif "net income" in category or "net income" in subcategory:
            summary["net_income"] = amount
            summary["prior_net_income"] = prior

    return summary


def csv_to_text(data: list[dict]) -> str:
    """
    Parsed CSV data ko human-readable text mein convert karo
    (Gemini agent ke liye prompt mein use hoga)
    """
    if not data:
        return "(No financial data)"

    lines = ["CURRENT YEAR P&L STATEMENT\n" + "=" * 50]
    current_category = None

    for row in data:
        category = row.get("category", "")
        subcategory = row.get("subcategory", "")
        amount = row.get("amount", 0)
        prior = row.get("prior_year_amount", 0)
        notes = row.get("notes", "")

        if category and category != current_category:
            current_category = category
            lines.append(f"\n{category.upper()}")
            lines.append("-" * 30)

        if subcategory:
            change = ""
            if prior and prior != 0:
                pct = ((float(amount) - float(prior)) / abs(float(prior))) * 100
                change = f" ({pct:+.1f}% vs prior year)"
            lines.append(
                f"  {subcategory:<35} ${amount:>12,.0f}  [Prior: ${prior:>10,.0f}]{change}"
            )
            if notes:
                lines.append(f"    Note: {notes}")

    return "\n".join(lines)
