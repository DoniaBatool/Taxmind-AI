"""
Client model — CA firm ke har client ka record
"""

import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(
        String, primary_key=True, default=lambda: str(uuid.uuid4())
    )
    # Owner — which firm/user this client belongs to (nullable for migration safety)
    user_id: Mapped[str | None] = mapped_column(
        String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    entity_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # S-Corp, LLC, Sole-Prop, Partnership
    industry: Mapped[str | None] = mapped_column(String(100), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    priority_level: Mapped[str] = mapped_column(
        String(20), default="on-track"
    )  # urgent | review | on-track
    one_line_summary: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner: Mapped["User | None"] = relationship(back_populates="clients")
    tax_returns: Mapped[list["TaxReturn"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    financials: Mapped[list["Financials"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    analyses: Mapped[list["Analysis"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
    reports: Mapped[list["Report"]] = relationship(
        back_populates="client", cascade="all, delete-orphan"
    )
