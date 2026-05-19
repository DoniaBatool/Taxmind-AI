"""
TaxReturn model — uploaded PDF tax returns ka parsed data
"""

import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class TaxReturn(Base):
    __tablename__ = "tax_returns"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    client_id: Mapped[str] = mapped_column(
        String, ForeignKey("clients.id"), nullable=False
    )
    tax_year: Mapped[int] = mapped_column(Integer, nullable=False)
    raw_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    raw_text: Mapped[str | None] = mapped_column(String, nullable=True)  # extracted PDF text
    parsed_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # Gemini structured extraction
    extraction_status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending | processing | done | error
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    # Relationship
    client: Mapped["Client"] = relationship(back_populates="tax_returns")
