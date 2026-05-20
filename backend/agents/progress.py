"""
Real-time analysis progress tracker.
Uses in-memory queues so the frontend WebSocket receives live agent status updates.
"""

import asyncio
from datetime import datetime, timezone
from typing import Dict, List

# Stored steps per analysis_id (for replay on late connect)
_steps: Dict[str, List[dict]] = {}
# Active WebSocket subscriber queues
_queues: Dict[str, List[asyncio.Queue]] = {}

AGENT_META = {
    "pdf_analyzer":      {"icon": "📄", "label": "PDF Analyzer",          "desc": "Extracting prior-year tax return data"},
    "comparator":        {"icon": "📊", "label": "Financial Comparator",   "desc": "Comparing year-over-year figures"},
    "anomaly_detector":  {"icon": "🔍", "label": "Anomaly Detector",       "desc": "Scanning for red flags & compliance risks"},
    "tax_planner":       {"icon": "💡", "label": "Tax Planner",             "desc": "Finding tax-saving opportunities"},
    "report_generator":  {"icon": "📝", "label": "Report Generator",        "desc": "Writing client review report"},
    "orchestrator":      {"icon": "🧠", "label": "Orchestrator",            "desc": "Coordinating all agents"},
}


def init_analysis(analysis_id: str) -> None:
    """Reset progress for a new analysis run."""
    _steps[analysis_id] = []
    _queues[analysis_id] = []


def push_step(analysis_id: str, agent: str, status: str, message: str = "") -> None:
    """
    Broadcast a progress step to all subscribers.

    Args:
        analysis_id: The analysis being tracked
        agent:  One of the AGENT_META keys
        status: "running" | "done" | "error"
        message: Optional detail message
    """
    meta = AGENT_META.get(agent, {})
    step = {
        "agent": agent,
        "label": meta.get("label", agent),
        "icon": meta.get("icon", "⚙️"),
        "status": status,
        "message": message or meta.get("desc", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    _steps.setdefault(analysis_id, []).append(step)
    for q in _queues.get(analysis_id, []):
        q.put_nowait(step)


def subscribe(analysis_id: str) -> asyncio.Queue:
    """
    Subscribe to progress updates for an analysis.
    Existing steps are replayed immediately so late subscribers catch up.
    """
    q: asyncio.Queue = asyncio.Queue()
    _queues.setdefault(analysis_id, []).append(q)
    # Replay history
    for step in _steps.get(analysis_id, []):
        q.put_nowait(step)
    return q


def unsubscribe(analysis_id: str, q: asyncio.Queue) -> None:
    """Remove a subscriber queue."""
    try:
        _queues.get(analysis_id, []).remove(q)
    except ValueError:
        pass
