import uuid
from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    job_offer_id: uuid.UUID
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    cover_letter_sent: bool = False
    cv_version_sent: Optional[str] = Field(None, max_length=255)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_linkedin: Optional[str] = Field(None, max_length=500)
    follow_up_date: Optional[date] = None
    status: ApplicationStatus = ApplicationStatus.SENT
    interview_notes: Optional[str] = None
    feedback: Optional[str] = None


class ApplicationUpdate(BaseModel):
    applied_at: Optional[datetime] = None
    cover_letter_sent: Optional[bool] = None
    cv_version_sent: Optional[str] = Field(None, max_length=255)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_linkedin: Optional[str] = Field(None, max_length=500)
    follow_up_date: Optional[date] = None
    status: Optional[ApplicationStatus] = None
    interview_notes: Optional[str] = None
    feedback: Optional[str] = None


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_offer_id: uuid.UUID
    applied_at: datetime
    cover_letter_sent: bool
    cv_version_sent: Optional[str]
    contact_name: Optional[str]
    contact_email: Optional[str]
    contact_linkedin: Optional[str]
    follow_up_date: Optional[date]
    status: ApplicationStatus
    interview_notes: Optional[str]
    feedback: Optional[str]
    created_at: datetime
    updated_at: datetime


# ── Extras used by the applications router ─────────────────────────────────

ApplicationListRead = ApplicationRead  # alias for paginated list items


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus
    notes: Optional[str] = None


class TimelineEvent(BaseModel):
    date: datetime
    event_type: str
    description: Optional[str] = None
    metadata: Optional[dict] = None
