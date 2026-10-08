"""Tests for ocr_parser. Run with: python -m pytest test_ocr_parser.py

These tests do not load PaddleOCR or its models.
"""

import numpy as np
import pytest

from ocr_parser import extract_lab_metrics, group_ocr_rows, parse_lab_row


@pytest.mark.parametrize(
    "row, expected",
    [
        (
            "HEMOGLOBIN | 15 | g/dl | 13 - 17 |",
            {"component": "HEMOGLOBIN", "value": "15", "unit": "g/dl",
             "ref_low": "13", "ref_high": "17", "ref_text": "13 - 17"},
        ),
        (
            "LYMPHOCYTE | L 18 | % | 20 - 40 |",
            {"component": "LYMPHOCYTE", "value": "18", "unit": "%",
             "ref_low": "20", "ref_high": "40", "ref_text": "20 - 40"},
        ),
        (
            "MEAN CELL HAEMOGLOBIN CON, MCHC | H 35.7 | % | 31.5 - 34.5 |",
            {"component": "MEAN CELL HAEMOGLOBIN CON, MCHC", "value": "35.7",
             "unit": "%", "ref_low": "31.5", "ref_high": "34.5",
             "ref_text": "31.5 - 34.5"},
        ),
        (
            "TOTAL LEUKOCYTE COUNT | 5,100 | cumm | 4,800 - 10,800 |",
            {"component": "TOTAL LEUKOCYTE COUNT", "value": "5100",
             "unit": "cumm", "ref_low": "4800", "ref_high": "10800",
             "ref_text": "4,800 - 10,800"},
        ),
        (
            "BASOPHILS | 1 | % | < 2 |",
            {"component": "BASOPHILS", "value": "1", "unit": "%",
             "ref_low": None, "ref_high": "2", "ref_text": "< 2"},
        ),
        (
            "HbA1c 5.4 % 4.0 to 5.6",
            {"component": "HbA1c", "value": "5.4", "unit": "%",
             "ref_low": "4.0", "ref_high": "5.6", "ref_text": "4.0 to 5.6"},
        ),
        (
            "Vitamin B12 250 pg/mL 200 - 900",
            {"component": "Vitamin B12", "value": "250", "unit": "pg/mL",
             "ref_low": "200", "ref_high": "900", "ref_text": "200 - 900"},
        ),
        (
            "Hemoglobin 12.5 g/dL Ref 13.0 - 17.0",
            {"component": "Hemoglobin", "value": "12.5", "unit": "g/dL",
             "ref_low": "13.0", "ref_high": "17.0", "ref_text": "13.0 - 17.0"},
        ),
        (
            "Glucose: 95 mg/dL (70-100 mg/dL)",
            {"component": "Glucose", "value": "95", "unit": "mg/dL",
             "ref_low": "70", "ref_high": "100", "ref_text": "70-100"},
        ),
        (
            # No printed range, but a recognised unit: kept, with no range.
            "Creatinine 1.1 mg/dl",
            {"component": "Creatinine", "value": "1.1", "unit": "mg/dl",
             "ref_low": None, "ref_high": None, "ref_text": ""},
        ),
    ],
)
def test_parses_lab_rows(row, expected):
    assert parse_lab_row(row) == expected


@pytest.mark.parametrize(
    "row",
    [
        "Patient Name: Ravi Kumar",
        "Age: 45 Years",
        "Date: 12/10/2025",
        "Dr. Suresh Reddy 12 Jan 2025",
        "WBC 8.5",  # no range and no unit: too ambiguous to show
        "",
    ],
)
def test_rejects_non_lab_rows(row):
    assert parse_lab_row(row) is None


def test_extract_keeps_only_lab_rows():
    rows = [
        "Patient Name: Ravi Kumar",
        "HEMOGLOBIN | 15 | g/dl | 13 - 17 |",
        "Date: 12/10/2025",
        "PLATELET COUNT | 3.5 | lakhs/cumm | 1.5 - 4.1 |",
    ]
    names = [m["component"] for m in extract_lab_metrics(rows)]
    assert names == ["HEMOGLOBIN", "PLATELET COUNT"]


def _fragment(text, x0, y0, x1, y1):
    """One OCR fragment as PaddleOCR returns it: text plus a 4-point box."""
    return text, np.array([[x0, y0], [x1, y0], [x1, y1], [x0, y1]])


def test_group_ocr_rows_builds_left_to_right_rows():
    # Image height 1000 -> row threshold 15 px. Two rows, fragments out of order.
    page = {
        "rec_texts": ["17", "HEMOGLOBIN", "15", "Patient", "g/dl"],
        "rec_boxes": [
            _fragment("17", 500, 102, 540, 118)[1],
            _fragment("HEMOGLOBIN", 10, 100, 200, 120)[1],
            _fragment("15", 300, 101, 330, 119)[1],
            _fragment("Patient", 10, 300, 120, 320)[1],
            _fragment("g/dl", 350, 99, 400, 121)[1],
        ],
    }
    rows = group_ocr_rows([page], image_height=1000)
    assert rows == ["HEMOGLOBIN | 15 | g/dl | 17", "Patient"]


def test_group_ocr_rows_handles_empty_page():
    assert group_ocr_rows([{"rec_texts": [], "rec_boxes": []}], 800) == []
