import uuid
from datetime import datetime
from enum import Enum as PyEnum

from sqlalchemy import String, Text, Integer, Boolean, DateTime, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

from app.database import Base


class OfferType(str, PyEnum):
    FREELANCE = "FREELANCE"
    CDI = "CDI"
    CDD = "CDD"


class RemoteType(str, PyEnum):
    FULL_REMOTE = "FULL_REMOTE"
    HYBRID = "HYBRID"
    ON_SITE = "ON_SITE"


class OfferStatus(str, PyEnum):
    NEW = "NEW"
    ANALYZED = "ANALYZED"
    APPLIED = "APPLIED"
    INTERVIEW = "INTERVIEW"
    REJECTED = "REJECTED"
    OFFER = "OFFER"
    ARCHIVED = "ARCHIVED"


class JobOffer(Base):
    __tablename__ = "job_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    source: Mapped[str] = mapped_column(String(100), nullable=False)
    source_url: Mapped[str | None] = mapped_column(String(2048))
    raw_text: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    type: Mapped[OfferType] = mapped_column(
        Enum(OfferType, name="offer_type_enum"), nullable=False
    )
    tjm_min: Mapped[int | None] = mapped_column(Integer)
    tjm_max: Mapped[int | None] = mapped_column(Integer)
    salary_min: Mapped[int | None] = mapped_column(Integer)
    salary_max: Mapped[int | None] = mapped_column(Integer)
    remote_type: Mapped[RemoteType] = mapped_column(
        Enum(RemoteType, name="remote_type_enum"),
        nullable=False,
        default=RemoteType.HYBRID,
    )
    location: Mapped[str | None] = mapped_column(String(255))
    contract_duration: Mapped[str | None] = mapped_column(String(100))
    compatibility_score: Mapped[int | None] = mapped_column(Integer)
    score_details: Mapped[dict] = mapped_column(
        JSONB, nullable=False, server_default="{}", default=dict
    )
    keywords: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}", default=list
    )
    strengths: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}", default=list
    )
    warnings: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}", default=list
    )
    status: Mapped[OfferStatus] = mapped_column(
        Enum(OfferStatus, name="offer_status_enum"),
        nullable=False,
        default=OfferStatus.NEW,
    )
    is_favorite: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    notes: Mapped[str | None] = mapped_column(Text)
    found_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    applications: Mapped[list["Application"]] = relationship(  # noqa: F821
        "Application", back_populates="job_offer", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(  # noqa: F821
        "Document", back_populates="job_offer", cascade="all, delete-orphan"
    )

