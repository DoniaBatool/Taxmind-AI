"""
Chat Router — WebSocket real-time chat with AI orchestrator
"""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from database import get_db, AsyncSessionLocal
from models import ChatSession, ChatMessage
from agents.orchestrator import chat_with_orchestrator

router = APIRouter(tags=["chat"])


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """
    Real-time chat WebSocket endpoint.
    Receives messages from the frontend → routes to orchestrator → streams response back.
    """
    await websocket.accept()

    # Create a new chat session
    async with AsyncSessionLocal() as db:
        session = ChatSession()
        db.add(session)
        await db.commit()
        await db.refresh(session)
        session_id = session.id

    await websocket.send_json({"type": "session", "session_id": session_id})

    try:
        while True:
            # Receive user message
            data = await websocket.receive_text()
            payload = json.loads(data)
            user_message = payload.get("message", "")
            client_id = payload.get("client_id")  # optional context

            if not user_message.strip():
                continue

            # Save user message to DB
            async with AsyncSessionLocal() as db:
                msg = ChatMessage(
                    session_id=session_id,
                    role="user",
                    content=user_message,
                )
                db.add(msg)
                await db.commit()

            # Send typing indicator
            await websocket.send_json({"type": "typing", "agent": "orchestrator"})

            # Get response from orchestrator
            response = await chat_with_orchestrator(
                user_message=user_message,
                client_id=client_id,
                session_id=session_id,
            )

            # Stream response to client
            await websocket.send_json({
                "type": "message",
                "role": "assistant",
                "agent": response.get("agent_used", "orchestrator"),
                "content": response.get("content", ""),
                "metadata": response.get("metadata", {}),
            })

            # Save assistant message to DB
            async with AsyncSessionLocal() as db:
                ai_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    agent_name=response.get("agent_used", "orchestrator"),
                    content=response.get("content", ""),
                )
                db.add(ai_msg)
                await db.commit()

    except WebSocketDisconnect:
        pass


@router.get("/api/chat/{session_id}/history")
async def get_chat_history(session_id: str, db: AsyncSession = Depends(get_db)):
    """Fetch chat history for a session"""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()

    return [
        {
            "id": m.id,
            "role": m.role,
            "agent_name": m.agent_name,
            "content": m.content,
            "created_at": m.created_at,
        }
        for m in messages
    ]
