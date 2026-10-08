from pydantic import BaseModel, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime
import uuid


# ── Request Schemas ──────────────────────────────────────────────────────────

class RecipientInput(BaseModel):
    name: str
    email: str

    @field_validator("name")
    @classmethod
    def name_must_not_be_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Recipient name must not be empty")
        return v

    @field_validator("email")
    @classmethod
    def email_must_not_be_empty(cls, v):
        v = v.strip()
        if not v or "@" not in v:
            raise ValueError(f"Invalid email: {v}")
        return v


class CreateJobRequest(BaseModel):
    event_name: str
    event_date: str
    cert_type: Optional[str] = "Achievement"
    recipients: List[RecipientInput]

    @field_validator("event_name")
    @classmethod
    def event_name_must_not_be_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("Event name must not be empty")
        return v

    @field_validator("recipients")
    @classmethod
    def recipients_must_not_be_empty(cls, v):
        if not v:
            raise ValueError("At least one recipient is required")
        return v


# ── Response Schemas ─────────────────────────────────────────────────────────

class CertificateResponse(BaseModel):
    id: str
    job_id: str
    recipient_name: str
    recipient_email: str
    certificate_id: Optional[str] = None
    status: str
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HistoryCertificateResponse(BaseModel):
    id: str
    job_id: str
    event_name: str
    event_date: str
    cert_type: Optional[str] = "Achievement"
    recipient_name: str
    recipient_email: str
    certificate_id: Optional[str] = None
    status: str
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class JobResponse(BaseModel):
    id: str
    event_name: str
    event_date: str
    cert_type: Optional[str] = "Achievement"
    status: str
    total_recipients: int
    successful_count: int
    failed_count: int
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CreateJobResponse(BaseModel):
    job_id: str
    message: str
