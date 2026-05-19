"""
Analysis model — AI-generated analysis results per client
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    client_id: Mapped[str] = mapped_column(
        String, ForeignKey("clients.id"), nullable=False
    )
    analysis_year: Mapped[int] = mapped_column(Integer, nullable=False)

    # Sub-agent outputs
    comparison_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)    # YoY comparison
    red_flags: Mapped[list | None] = mapped_column(JSON, nullable=True)           # anomaly-detector output
    tax_opportunities: Mapped[list | None] = mapped_column(JSON, nullable=True)   # tax-planner output
    smart_questions: Mapped[list | None] = mapped_column(JSON, nullable=True)     # follow-up questions

    # Dashboard fields
    priority_level: Mapped[str] = mapped_column(String(20), default="on-track")  # urgent | review | on-track
    one_line_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")           # pending | running | done | error

    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="analyses")
    reports: Mapped[list["Report"]] = relationship(
        back_populates="analysis", cascade="all, delete-orphan"
    )
