from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AlertConfigCreate(BaseModel):
    keywords: list[str] = Field(default_factory=list, description="Keywords to match in job offers")
    platforms: list[str] = Field(default_factory=list, description="Platforms to monitor")
    min_tjm: Optional[int] = Field(None, ge=0, description="Minimum daily rate (TJM) in EUR")
    remote_only: bool = Field(False, description="Only match remote offers")
    check_interval_hours: int = Field(24, ge=1, le=168, description="How often to run this alert (hours)")


class AlertConfigUpdate(BaseModel):
    keywords: Optional[list[str]] = None
    platforms: Optional[list[str]] = None
    min_tjm: Optional[int] = Field(None, ge=0)
    remote_only: Optional[bool] = None
    is_active: Optional[bool] = None
    check_interval_hours: Optional[int] = Field(None, ge=1, le=168)


class AlertConfigRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    keywords: list[str]
    platforms: list[str]
    min_tjm: Optional[int]
    remote_only: bool
    is_active: bool
    check_interval_hours: int
    last_checked_at: Optional[datetime]
    created_at: datetime
