"""
Financials model — uploaded CSV P&L statements
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Financials(Base):
    __tablename__ = "financials"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    client_id: Mapped[str] = mapped_column(
        String, ForeignKey("clients.id"), nullable=False
    )
    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    parsed_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # parsed CSV rows
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationship
    client: Mapped["Client"] = relationship(back_populates="financials")
