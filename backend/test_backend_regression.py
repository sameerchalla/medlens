"""
Backend Comprehensive Regression Test Suite for MedLens
"""

import pytest
import os
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.models import ProvenanceType, PatientCreate
from app.services.extraction import (
    determine_status,
    parse_reference_range,
    LabStatus,
    extract_local_clinical_data,
    generate_patient_summary,
    SAFETY_DISCLAIMER
)

client = TestClient(app)

def test_health_endpoint():
    """Verify health endpoint responds correctly."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

def test_provenance_enum_supports_verified_by_user():
    """Verify backend ProvenanceType enum includes verified_by_user."""
    assert ProvenanceType.VERIFIED_BY_USER == "verified_by_user"
    assert ProvenanceType.PATIENT_REPORTED == "patient_reported"
    assert ProvenanceType.AI_EXTRACTED == "ai_extracted"

def test_patient_crud_and_provenance_lifecycle():
    """Verify patient creation, adding fields with verified_by_user, and retrieval."""
    # Create
    res = client.post("/api/patients", json={"name": "Test Patient", "patient_id": "P-101", "date_of_birth": "1980-01-01"})
    assert res.status_code == 200
    p = res.json()
    pid = p["id"]

    # Add verified field
    res_field = client.post(f"/api/patients/{pid}/fields?field_name=hemoglobin&value=13.5&provenance=verified_by_user")
    assert res_field.status_code == 200

    # Retrieve and verify
    get_res = client.get(f"/api/patients/{pid}")
    assert get_res.status_code == 200
    p_data = get_res.json()
    assert p_data["fields"]["hemoglobin"]["provenance"] == "verified_by_user"
    assert p_data["fields"]["hemoglobin"]["value"] == "13.5"

def test_reference_range_invariance():
    """Verify Zero-Hallucination rule: only source ranges classify values."""
    # Standard range
    assert determine_status(9.4, "12.0 - 15.5") == LabStatus.LOW
    assert determine_status(14.0, "12.0 - 15.5") == LabStatus.NORMAL
    assert determine_status(18.0, "12.0 - 15.5") == LabStatus.HIGH

    # 'to' format
    assert determine_status(10.0, "13 to 17") == LabStatus.LOW
    assert determine_status(15.0, "13 to 17") == LabStatus.NORMAL

    # '<' format
    assert determine_status(2.5, "< 3.0") == LabStatus.NORMAL
    assert determine_status(8.2, "< 3.0") == LabStatus.HIGH

    # '>' format
    assert determine_status(95.0, "> 60") == LabStatus.NORMAL
    assert determine_status(45.0, "> 60") == LabStatus.LOW

    # Missing range -> must be UNSPECIFIED (never invent ranges)
    assert determine_status(14.0, "") == LabStatus.UNSPECIFIED
    assert determine_status(14.0, None) == LabStatus.UNSPECIFIED
    assert determine_status(14.0, "No reference provided") == LabStatus.UNSPECIFIED

def test_pdf_upload_security_and_extraction():
    """Verify upload validation and end-to-end PDF extraction."""
    # 1. Upload non-allowed extension
    res_bad = client.post("/api/reports/upload", files={"file": ("malicious.exe", b"binary", "application/octet-stream")})
    assert res_bad.status_code == 400

    # 2. Upload real PDF
    pdf_path = Path("cbc-report-format.pdf")
    if not pdf_path.exists():
        pdf_path = Path("../cbc-report-format.pdf")

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    res_upload = client.post(
        "/api/reports/upload",
        files={"file": ("cbc-report.pdf", pdf_bytes, "application/pdf")},
        data={"document_type": "lab_report"}
    )
    assert res_upload.status_code == 200
    report_data = res_upload.json()
    report_id = report_data["id"]

    # 3. Extract from uploaded report
    res_extract = client.post(f"/api/reports/{report_id}/extract")
    assert res_extract.status_code == 200
    ext_data = res_extract.json()
    assert ext_data["success"] is True
    assert ext_data["items_count"] == 13
    assert len(ext_data["lab_items"]) == 13

    # Verify extracted items
    item_names = [i["test_name"] for i in ext_data["lab_items"]]
    assert "Hemoglobin" in item_names
    assert "Total Leukocyte Count" in item_names
    assert "Platelet Count" in item_names

    # Verify safety disclaimer in summary
    assert "DISCLAIMER" in ext_data["patient_summary"]
    assert "does not provide medical advice" in ext_data["patient_summary"]

if __name__ == "__main__":
    pytest.main(["-v", __file__])
