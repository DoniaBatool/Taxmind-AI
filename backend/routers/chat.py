"""
Chat Router — AI Q&A for a specific client (REST)
"""

import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from openai import AsyncOpenAI

from database import get_db
from models import Client, Analysis, User
from auth.dependencies import get_current_user
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/clients", tags=["chat"])

_openai = AsyncOpenAI(api_key=settings.openai_api_key)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []   # [{role, content}] — last N turns


@router.post("/{client_id}/chat")
async def chat_with_client(
    client_id: str,
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """AI Q&A about a specific client's tax situation"""

    # ── Get client (admin can access any) ────────────────────────────────────
    query = select(Client).where(Client.id == client_id)
    if not current_user.is_admin:
        query = query.where(Client.user_id == current_user.id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # ── Get latest completed analysis ─────────────────────────────────────────
    ar = await db.execute(
        select(Analysis)
        .where(Analysis.client_id == client_id, Analysis.status == "done")
        .order_by(Analysis.created_at.desc())
    )
    analysis = ar.scalar_one_or_none()

    # ── Build system prompt ───────────────────────────────────────────────────
    ctx = f"""You are TaxMind AI, a professional tax and accounting assistant helping a CA firm.

CLIENT ON FILE:
  Name        : {client.name}
  Entity Type : {client.entity_type}
  Industry    : {client.industry or 'Not specified'}
  Priority    : {client.priority_level}
  Summary     : {client.one_line_summary or 'No summary yet — analysis may not have run.'}
"""

    if analysis:
        ctx += f"\n  Priority: {analysis.priority_level}\n  Summary: {analysis.one_line_summary or 'N/A'}\n"

        if analysis.comparison_data:
            cd = analysis.comparison_data
            ctx += "\nFINANCIAL COMPARISON (Year-over-Year):\n"
            for key, val in cd.items():
                if isinstance(val, dict):
                    ctx += f"  {key}: prior={val.get('prior','N/A')}, current={val.get('current','N/A')}\n"

        if analysis.red_flags:
            ctx += "\nRED FLAGS:\n"
            for f in analysis.red_flags:
                severity = f.get('severity', f.get('level', 'unknown')).upper()
                issue = f.get('issue', f.get('title', ''))
                explanation = f.get('explanation', f.get('description', ''))
                ctx += f"  [{severity}] {issue}: {explanation}\n"

        if analysis.tax_opportunities:
            ctx += "\nTAX OPPORTUNITIES:\n"
            for t in analysis.tax_opportunities:
                savings = t.get('estimated_savings', 0)
                ctx += f"  • {t.get('opportunity', t.get('title',''))}: {t.get('description','')} — Est. savings: ${savings:,}\n"

        if analysis.smart_questions:
            ctx += "\nSMART QUESTIONS FOR CLIENT MEETING:\n"
            for q in analysis.smart_questions:
                ctx += f"  • {q}\n"
    else:
        ctx += "\nNote: No analysis has been completed yet. Advise the user to upload documents and run AI analysis.\n"

    ctx += """
Guidelines:
- Be concise, professional, and specific.
- Use numbers from the analysis data when relevant.
- If asked about something not in the data, say so clearly.
- Respond in the same language the user writes in.
"""

    # ── Build message list ────────────────────────────────────────────────────
    messages = [{"role": "system", "content": ctx}]

    # Include last 10 turns of history to stay within token limits
    for msg in payload.history[-10:]:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": payload.message})

    # ── Call OpenAI ───────────────────────────────────────────────────────────
    try:
        response = await _openai.chat.completions.create(
            model=settings.openai_model,
            messages=messages,
            max_tokens=700,
            temperature=0.3,
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        logger.error(f"OpenAI chat error for client {client_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
