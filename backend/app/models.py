from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ProvenanceType(str, Enum):
    PATIENT_REPORTED = "patient_reported"
    AI_EXTRACTED = "ai_extracted"
    VERIFIED_BY_USER = "verified_by_user"


class ReportType(str, Enum):
    LAB_REPORT = "lab_report"
    BLOOD_WORK = "blood_work"
    IMAGING = "imaging"
    CLINICAL_NOTES = "clinical_notes"
    INTAKE_FORM = "intake_form"
    OTHER = "other"


class ProvenanceValue(BaseModel):
    """A value with its source provenance tracked."""
    value: str | float | int | bool
    provenance: ProvenanceType
    source_file: Optional[str] = None
    extracted_at: Optional[datetime] = None

    class Config:
        use_enum_values = True


class Report(BaseModel):
    """A clinical report document."""
    id: str
    filename: str
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    document_type: ReportType = ReportType.OTHER
    content: str = ""
    extracted_fields: Dict[str, Any] = {}

    class Config:
        use_enum_values = True


class PatientRecord(BaseModel):
    """A patient record with provenance-aware fields."""
    id: str
    patient_id: Optional[str] = None
    name: Optional[str] = None
    date_of_birth: Optional[str] = None
    fields: Dict[str, ProvenanceValue] = {}
    uploaded_reports: list[Report] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PatientCreate(BaseModel):
    """Request to create a new patient."""
    patient_id: Optional[str] = Field(default=None, max_length=100)
    name: Optional[str] = Field(default=None, max_length=200)
    date_of_birth: Optional[str] = Field(default=None, max_length=50)


class ExtractionResult(BaseModel):
    """Result of extracting data from a report."""
    fields: Dict[str, ProvenanceValue]
    reference_ranges: Dict[str, str]
    raw_text: str


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
