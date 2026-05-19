"""
Main Orchestrator Agent
- Full analysis pipeline chalata hai (background task)
- Chat queries ko appropriate sub-agent pe route karta hai
"""

import logging
from datetime import datetime
from sqlalchemy import select

from database import AsyncSessionLocal
from models import Client, TaxReturn, Financials, Analysis, Report
from agents.gemini_client import call_gemini_sync
from agents.pdf_analyzer import analyze_pdf_tax_return
from agents.comparator import compare_financials
from agents.anomaly_detector import detect_anomalies
from agents.tax_planner import find_tax_opportunities, generate_smart_questions
from agents.report_generator import generate_client_report
from parsers.csv_parser import csv_to_text, get_summary_from_parsed

logger = logging.getLogger(__name__)


# ── Full Analysis Pipeline ────────────────────────────────────────────────────

async def run_full_analysis(client_id: str, analysis_id: str, analysis_year: int):
    """
    Complete multi-agent analysis pipeline:
    1. pdf_analyzer → prior year tax data
    2. comparator → YoY comparison
    3. anomaly_detector → red flags
    4. tax_planner → opportunities + smart questions
    5. report_generator → client report
    6. DB update → dashboard refresh

    Background task mein chalta hai
    """
    logger.info(f"Starting full analysis for client {client_id}, year {analysis_year}")

    async with AsyncSessionLocal() as db:
        try:
            # Client fetch karo
            client_result = await db.execute(select(Client).where(Client.id == client_id))
            client = client_result.scalar_one_or_none()
            if not client:
                logger.error(f"Client {client_id} nahi mila")
                return

            # Prior year tax return fetch karo
            prior_year = analysis_year - 1
            tax_result = await db.execute(
                select(TaxReturn)
                .where(TaxReturn.client_id == client_id, TaxReturn.tax_year == prior_year)
                .order_by(TaxReturn.created_at.desc())
            )
            tax_return = tax_result.scalar_one_or_none()

            # Current year CSV fetch karo
            fin_result = await db.execute(
                select(Financials)
                .where(Financials.client_id == client_id, Financials.fiscal_year == analysis_year)
                .order_by(Financials.created_at.desc())
            )
            financials = fin_result.scalar_one_or_none()

            if not tax_return or not financials:
                logger.error(f"Documents missing for client {client_id}")
                # Analysis update karo error state mein
                analysis_result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
                analysis = analysis_result.scalar_one_or_none()
                if analysis:
                    analysis.status = "error"
                    analysis.one_line_summary = "Documents missing — upload tax return and P&L first"
                await db.commit()
                return

            # ── Step 1: PDF Analyzer ──────────────────────────────────────
            logger.info("Step 1: PDF Analyzer running...")
            prior_year_data = analyze_pdf_tax_return(
                tax_text=tax_return.raw_text or "",
                entity_type=client.entity_type,
            )

            # PDF parsed data save karo
            tax_return.parsed_data = prior_year_data
            await db.flush()

            # ── Step 2: Financial Comparator ──────────────────────────────
            logger.info("Step 2: Financial Comparator running...")
            current_csv_data = financials.parsed_data or []
            comparison_data = compare_financials(
                prior_year_data=prior_year_data,
                current_year_csv_data=current_csv_data,
                analysis_year=analysis_year,
            )

            # ── Step 3: Anomaly Detector ──────────────────────────────────
            logger.info("Step 3: Anomaly Detector running...")
            anomaly_result = detect_anomalies(
                comparison_data=comparison_data,
                entity_type=client.entity_type,
            )
            red_flags = anomaly_result.get("red_flags", [])
            priority_level = anomaly_result.get("priority_level", "on-track")
            one_line_summary = anomaly_result.get("one_line_summary", "")

            # ── Step 4: Tax Planner ───────────────────────────────────────
            logger.info("Step 4: Tax Planner running...")
            financial_summary = csv_to_text(current_csv_data)
            tax_opportunities = find_tax_opportunities(
                financial_summary=financial_summary,
                entity_type=client.entity_type,
                tax_year=analysis_year,
            )

            # Smart questions generate karo
            smart_questions = generate_smart_questions(
                red_flags=red_flags,
                entity_type=client.entity_type,
                tax_opportunities=tax_opportunities,
            )

            # ── Step 5: Report Generator ──────────────────────────────────
            logger.info("Step 5: Report Generator running...")
            report_markdown = generate_client_report(
                client_name=client.name,
                entity_type=client.entity_type,
                analysis_year=analysis_year,
                comparison_data=comparison_data,
                red_flags=red_flags,
                tax_opportunities=tax_opportunities,
                smart_questions=smart_questions,
            )

            # ── Step 6: DB Update ─────────────────────────────────────────
            logger.info("Step 6: Saving results to DB...")
            analysis_result = await db.execute(select(Analysis).where(Analysis.id == analysis_id))
            analysis = analysis_result.scalar_one_or_none()
            if analysis:
                analysis.comparison_data = comparison_data
                analysis.red_flags = red_flags
                analysis.tax_opportunities = tax_opportunities
                analysis.smart_questions = smart_questions
                analysis.priority_level = priority_level
                analysis.one_line_summary = one_line_summary
                analysis.status = "done"
                analysis.completed_at = datetime.utcnow()

            # Client priority update karo
            client.priority_level = priority_level
            client.one_line_summary = one_line_summary

            # Report save karo
            report = Report(
                client_id=client_id,
                analysis_id=analysis_id,
                content_markdown=report_markdown,
            )
            db.add(report)
            await db.commit()

            logger.info(f"Full analysis complete for {client.name} — Priority: {priority_level}")

        except Exception as e:
            logger.error(f"Analysis pipeline error: {e}")
            async with AsyncSessionLocal() as error_db:
                analysis_result = await error_db.execute(
                    select(Analysis).where(Analysis.id == analysis_id)
                )
                analysis = analysis_result.scalar_one_or_none()
                if analysis:
                    analysis.status = "error"
                    analysis.one_line_summary = f"Analysis failed: {str(e)[:200]}"
                await error_db.commit()


# ── Chat Orchestrator ─────────────────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """
You are TaxMind AI, an intelligent assistant for CA firms and tax professionals.
You have access to client financial data, tax returns, and AI analysis results.

Your capabilities:
- Answer questions about specific client financials
- Explain red flags and their implications
- Provide tax planning guidance
- Summarize analysis results
- Help accountants prepare for client meetings

Be professional, accurate, and concise. When discussing numbers, be specific.
If asked about something outside your knowledge, say so clearly.

Available agents you can call:
- pdf-tax-analyzer: For tax return questions
- financial-comparator: For YoY comparison questions
- anomaly-detector: For red flag analysis
- tax-planner: For tax planning questions
- report-generator: For generating reports

Current context:
{context}
"""


async def chat_with_orchestrator(
    user_message: str,
    client_id: str | None = None,
    session_id: str | None = None,
) -> dict:
    """
    User chat message ko handle karo — appropriate agent ko route karo.

    Returns:
        Dict with content, agent_used, metadata
    """
    # Context build karo agar client specified hai
    context = "No specific client selected."
    agent_used = "orchestrator"

    if client_id:
        async with AsyncSessionLocal() as db:
            client_result = await db.execute(select(Client).where(Client.id == client_id))
            client = client_result.scalar_one_or_none()
            if client:
                context = f"Client: {client.name} | Entity: {client.entity_type} | Priority: {client.priority_level}"

                # Latest analysis bhi load karo
                analysis_result = await db.execute(
                    select(Analysis)
                    .where(Analysis.client_id == client_id, Analysis.status == "done")
                    .order_by(Analysis.created_at.desc())
                )
                latest = analysis_result.scalar_one_or_none()
                if latest:
                    import json
                    context += f"\n\nLatest Analysis Summary: {latest.one_line_summary}"
                    context += f"\nRed Flags ({len(latest.red_flags or [])}): "
                    if latest.red_flags:
                        context += ", ".join(f["title"] for f in (latest.red_flags or [])[:3])

    # Intent detect karo
    message_lower = user_message.lower()
    if any(kw in message_lower for kw in ["red flag", "anomaly", "issue", "problem", "risk"]):
        agent_used = "anomaly-detector"
    elif any(kw in message_lower for kw in ["tax plan", "save", "deduction", "199a", "retirement"]):
        agent_used = "tax-planner"
    elif any(kw in message_lower for kw in ["compare", "year over", "change", "trend"]):
        agent_used = "financial-comparator"
    elif any(kw in message_lower for kw in ["report", "generate", "write", "summary"]):
        agent_used = "report-generator"

    # Gemini se response lo
    prompt = CHAT_SYSTEM_PROMPT.format(context=context) + f"\n\nUser: {user_message}\n\nAssistant:"

    try:
        response = call_gemini_sync(prompt, temperature=0.4)
        return {
            "content": response,
            "agent_used": agent_used,
            "metadata": {"client_id": client_id, "session_id": session_id},
        }
    except Exception as e:
        logger.error(f"Chat orchestrator error: {e}")
        return {
            "content": "Mujhe abhi response generate karne mein masla aaya. Dobara try karein.",
            "agent_used": "orchestrator",
            "metadata": {"error": str(e)},
        }
