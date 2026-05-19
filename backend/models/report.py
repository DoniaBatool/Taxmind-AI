"""
Report model — generated client reports
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    client_id: Mapped[str] = mapped_column(
        String, ForeignKey("clients.id"), nullable=False
    )
    analysis_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("analyses.id"), nullable=True
    )
    content_markdown: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationships
    client: Mapped["Client"] = relationship(back_populates="reports")
    analysis: Mapped["Analysis"] = relationship(back_populates="reports")
