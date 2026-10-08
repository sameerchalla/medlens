from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
import uuid

from app.models import PatientRecord, PatientCreate, ProvenanceValue, ProvenanceType

router = APIRouter()

# In-memory storage (replace with database in production)
patients_db: dict[str, PatientRecord] = {}


@router.get("", response_model=List[PatientRecord])
async def list_patients():
    """Get all patient records."""
    return list(patients_db.values())


@router.post("", response_model=PatientRecord)
async def create_patient(data: PatientCreate):
    """Create a new patient record."""
    patient = PatientRecord(
        id=str(uuid.uuid4()),
        patient_id=data.patient_id,
        name=data.name,
        date_of_birth=data.date_of_birth,
        fields={},
        uploaded_reports=[],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    patients_db[patient.id] = patient
    return patient


@router.get("/{patient_id}", response_model=PatientRecord)
async def get_patient(patient_id: str):
    """Get a specific patient record."""
    if patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patients_db[patient_id]


@router.put("/{patient_id}", response_model=PatientRecord)
async def update_patient(patient_id: str, data: PatientCreate):
    """Update patient information."""
    if patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = patients_db[patient_id]
    if data.patient_id is not None:
        patient.patient_id = data.patient_id
    if data.name is not None:
        patient.name = data.name
    if data.date_of_birth is not None:
        patient.date_of_birth = data.date_of_birth
    patient.updated_at = datetime.utcnow()

    return patient


@router.delete("/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient record."""
    if patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")
    del patients_db[patient_id]
    return {"message": "Patient deleted successfully"}


@router.post("/{patient_id}/fields")
async def add_patient_field(
    patient_id: str,
    field_name: str,
    value: str | float | int | bool,
    provenance: ProvenanceType = ProvenanceType.PATIENT_REPORTED,
    source_file: str | None = None
):
    """Add or update a field on a patient record."""
    if patient_id not in patients_db:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient = patients_db[patient_id]
    patient.fields[field_name] = ProvenanceValue(
        value=value,
        provenance=provenance,
        source_file=source_file,
        extracted_at=datetime.utcnow() if provenance == ProvenanceType.AI_EXTRACTED else None
    )
    patient.updated_at = datetime.utcnow()

    return {"message": "Field added", "field": field_name}
