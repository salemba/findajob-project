import uuid
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.job_offer import OfferType, RemoteType, OfferStatus

SOURCE_VALUES = Literal["free-work", "linkedin", "malt", "indeed", "manual"]


class JobOfferCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    source: str = Field(..., description="free-work | linkedin | malt | indeed | manual")
    source_url: Optional[str] = Field(None, max_length=2048)
    raw_text: str = Field(default="")
    type: OfferType
    tjm_min: Optional[int] = Field(None, ge=0)
    tjm_max: Optional[int] = Field(None, ge=0)
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    remote_type: RemoteType = RemoteType.HYBRID
    location: Optional[str] = Field(None, max_length=255)
    contract_duration: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    found_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        allowed = {"free-work", "linkedin", "malt", "indeed", "manual"}
        if v not in allowed:
            raise ValueError(f"source doit être dans : {allowed}")
        return v

    @model_validator(mode="after")
    def validate_ranges(self) -> "JobOfferCreate":
        if self.tjm_min is not None and self.tjm_max is not None:
            if self.tjm_max < self.tjm_min:
                raise ValueError("tjm_max doit être >= tjm_min")
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_max < self.salary_min:
                raise ValueError("salary_max doit être >= salary_min")
        return self


class JobOfferUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    company: Optional[str] = Field(None, min_length=1, max_length=255)
    source: Optional[str] = None
    source_url: Optional[str] = Field(None, max_length=2048)
    raw_text: Optional[str] = None
    type: Optional[OfferType] = None
    tjm_min: Optional[int] = Field(None, ge=0)
    tjm_max: Optional[int] = Field(None, ge=0)
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)
    remote_type: Optional[RemoteType] = None
    location: Optional[str] = Field(None, max_length=255)
    contract_duration: Optional[str] = Field(None, max_length=100)
    compatibility_score: Optional[int] = Field(None, ge=0, le=100)
    score_details: Optional[dict] = None
    keywords: Optional[list[str]] = None
    strengths: Optional[list[str]] = None
    warnings: Optional[list[str]] = None
    status: Optional[OfferStatus] = None
    is_favorite: Optional[bool] = None
    notes: Optional[str] = None
    found_at: Optional[datetime] = None

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            allowed = {"free-work", "linkedin", "malt", "indeed", "manual"}
            if v not in allowed:
                raise ValueError(f"source doit être dans : {allowed}")
        return v

    @model_validator(mode="after")
    def validate_ranges(self) -> "JobOfferUpdate":
        if self.tjm_min is not None and self.tjm_max is not None:
            if self.tjm_max < self.tjm_min:
                raise ValueError("tjm_max doit être >= tjm_min")
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_max < self.salary_min:
                raise ValueError("salary_max doit être >= salary_min")
        return self


class JobOfferRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    company: str
    source: str
    source_url: Optional[str]
    raw_text: str
    type: OfferType
    tjm_min: Optional[int]
    tjm_max: Optional[int]
    salary_min: Optional[int]
    salary_max: Optional[int]
    remote_type: RemoteType
    location: Optional[str]
    contract_duration: Optional[str]
    compatibility_score: Optional[int]
    score_details: dict
    keywords: list[str]
    strengths: list[str]
    warnings: list[str]
    status: OfferStatus
    is_favorite: bool
    notes: Optional[str]
    found_at: datetime
    created_at: datetime
    updated_at: datetime
