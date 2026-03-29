import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.document import DocumentType


class DocumentCreate(BaseModel):
    job_offer_id: uuid.UUID
    type: DocumentType
    content: str = ""
    model_used: str = Field("claude-sonnet-4-6", max_length=100)
    prompt_used: Optional[str] = None
    version: int = Field(1, ge=1)
    is_validated: bool = False
    file_path: Optional[str] = Field(None, max_length=1000)


class DocumentUpdate(BaseModel):
    content: Optional[str] = None
    model_used: Optional[str] = Field(None, max_length=100)
    prompt_used: Optional[str] = None
    version: Optional[int] = Field(None, ge=1)
    is_validated: Optional[bool] = None
    file_path: Optional[str] = Field(None, max_length=1000)


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_offer_id: uuid.UUID
    type: DocumentType
    content: str
    model_used: str
    prompt_used: Optional[str]
    version: int
    is_validated: bool
    file_path: Optional[str]
    created_at: datetime
