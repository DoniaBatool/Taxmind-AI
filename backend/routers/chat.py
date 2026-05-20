"""
Chat Router — AI Q&A for a specific client (REST)
"""

import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from openai import AsyncOpenAI

from database import get_db
from models import Client, Analysis, User
from auth.dependencies import get_current_user
from config import settings

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
        if analysis.overview:
            ov = analysis.overview
            ctx += f"""
FINANCIAL OVERVIEW:
  Revenue (current)  : {ov.get('revenue_current', 'N/A')}
  Revenue (prior)    : {ov.get('revenue_prior', 'N/A')}
  Net Income         : {ov.get('net_income', 'N/A')}
  Effective Tax Rate : {ov.get('effective_tax_rate', 'N/A')}
  YoY Growth         : {ov.get('yoy_growth', 'N/A')}
"""

        if analysis.red_flags:
            ctx += "\nRED FLAGS:\n"
            for f in analysis.red_flags:
                ctx += f"  [{f.get('severity','').upper()}] {f.get('issue','')}: {f.get('explanation','')}\n"

        if analysis.tax_plan:
            strategies = analysis.tax_plan.get("strategies", [])
            ctx += "\nTAX PLANNING STRATEGIES:\n"
            for s in strategies:
                ctx += f"  • {s.get('title','')}: {s.get('description','')} — Est. savings: {s.get('estimated_savings','')}\n"

        if analysis.questions_for_client:
            ctx += "\nOUTSTANDING QUESTIONS FOR CLIENT:\n"
            for q in analysis.questions_for_client:
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
    response = await _openai.chat.completions.create(
        model=settings.openai_model,
        messages=messages,
        max_tokens=700,
        temperature=0.3,
    )

    return {"reply": response.choices[0].message.content}
