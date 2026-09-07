"""
Clinical Data Extraction Service

Handles extraction of structured data from clinical reports (PDF and plain text).
Implements Zero-Hallucination rule: only evaluates status against explicit ranges
from source documents.

IMPORTANT: This tool does NOT provide medical advice.
All extracted data should be reviewed by qualified healthcare professionals.
"""

import re
import io
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

# PDF extraction - try pypdf first, fallback to basic parsing
try:
    from pypdf import PdfReader
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False


class LabStatus(str, Enum):
    """Lab result status based on reference range from source."""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    UNSPECIFIED = "UNSPECIFIED"


@dataclass
class LabItem:
    """Structured lab result extracted from a clinical report."""
    test_name: str
    value: str
    unit: str = ""
    reference_range_source: str = ""  # Exact text from source, e.g., "70-100 mg/dL"
    status: LabStatus = LabStatus.UNSPECIFIED
    source_snippet: str = ""  # Original line/paragraph containing this value


@dataclass
class ExtractionOutput:
    """Complete extraction result with lab items and summary."""
    lab_items: list[LabItem] = field(default_factory=list)
    patient_summary: str = ""
    raw_text: str = ""
    filename: str = ""
    extraction_timestamp: datetime = field(default_factory=datetime.utcnow)


# Common lab test patterns for extraction
LAB_PATTERNS = [
    # Pattern: Test Name: Value Unit (Reference Range)
    # Examples: "Glucose: 95 mg/dL (70-100 mg/dL)", "Hemoglobin: 14.2 g/dL"
    r"(?P<test_name>[A-Za-z][A-Za-z\s\-']+?):\s*(?P<value>\d+\.?\d*)\s*(?P<unit>mg/dL|g/dL|mEq/L|mmol/L|U/L|%|cells/\w+|ng/mL|ug/dL|pg/mL)?\s*(?:\((?P<reference>[^)]+)\))?",

    # Pattern: Test Name Value Unit Reference Range
    # Examples: "Glucose 95 mg/dL 70-100"
    r"(?P<test_name>[A-Za-z][A-Za-z\s\-']+?)\s+(?P<value>\d+\.?\d*)\s+(?P<unit>mg/dL|g/dL|mEq/L|mmol/L|U/L|%|cells/\w+|ng/mL|ug/dL|pg/mL)\s+(?P<reference>\d+\.?\d*\s*-\s*\d+\.?\d*)",

    # Pattern: Test Name with result inline
    # Examples: "WBC 8.5", "RBC 4.8"
    r"^(?P<test_name>WBC|RBC|Hgb|Hct|Platelet|BUN|Creatinine|ALT|AST|ALP|Total Bilirubin|Albumin|Total Protein)\s+(?P<value>\d+\.?\d*)\s*(?P<unit>g/dL|10\*3/uL|10\*6/uL|U/L|mg/dL)?",
]

# Unit normalization map
UNIT_MAP = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "meq/l": "mEq/L",
    "mmol/l": "mmol/L",
    "u/l": "U/L",
}


def normalize_unit(unit: str) -> str:
    """Normalize unit to standard format."""
    if not unit:
        return ""
    unit_lower = unit.lower().strip()
    return UNIT_MAP.get(unit_lower, unit)


def parse_reference_range(ref_text: str) -> tuple[Optional[float], Optional[float]]:
    """
    Parse reference range text to extract low and high bounds.

    Examples:
        "70-100" -> (70.0, 100.0)
        "70.5 - 99.5" -> (70.5, 99.5)
        "<100" -> (None, 100.0)
        ">50" -> (50.0, None)
    """
    if not ref_text:
        return None, None

    ref_text = ref_text.strip()

    # Handle "low - high" format
    dash_match = re.match(r"([\d.]+)\s*-\s*([\d.]+)", ref_text)
    if dash_match:
        try:
            low = float(dash_match.group(1))
            high = float(dash_match.group(2))
            return low, high
        except ValueError:
            pass

    # Handle "< value" format (high only)
    lt_match = re.match(r"<\s*([\d.]+)", ref_text)
    if lt_match:
        try:
            return None, float(lt_match.group(1))
        except ValueError:
            pass

    # Handle "> value" format (low only)
    gt_match = re.match(r">\s*([\d.]+)", ref_text)
    if gt_match:
        try:
            return float(gt_match.group(1)), None
        except ValueError:
            pass

    return None, None


def determine_status(value: float, ref_text: str) -> LabStatus:
    """
    Determine lab status based on reference range from SOURCE DOCUMENT.

    Zero-Hallucination Rule: Only evaluate against explicit ranges from source.
    If no range provided, return UNSPECIFIED.
    """
    if not ref_text:
        return LabStatus.UNSPECIFIED

    low, high = parse_reference_range(ref_text)

    if low is None and high is None:
        return LabStatus.UNSPECIFIED

    # Both bounds available
    if low is not None and high is not None:
        if value < low:
            return LabStatus.LOW
        elif value > high:
            return LabStatus.HIGH
        else:
            return LabStatus.NORMAL

    # Only high bound
    if high is not None:
        if value > high:
            return LabStatus.HIGH
        else:
            return LabStatus.NORMAL

    # Only low bound
    if low is not None:
        if value < low:
            return LabStatus.LOW
        else:
            return LabStatus.NORMAL

    return LabStatus.UNSPECIFIED


def extract_text_from_pdf(pdf_content: bytes) -> str:
    """
    Extract text from PDF using pypdf.
    Falls back to empty string if PDF parsing fails.
    """
    if not PDF_AVAILABLE:
        return ""

    try:
        reader = PdfReader(io.BytesIO(pdf_content))
        text_parts = []

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        return "\n".join(text_parts)
    except Exception:
        return ""


def extract_text_from_file(file_path: str, content: Optional[bytes] = None) -> str:
    """
    Extract text from file based on extension.

    Args:
        file_path: Path to the file (used for extension detection)
        content: Optional file content (if not provided, reads from file_path)
    """
    file_path_lower = file_path.lower()

    if file_path_lower.endswith('.pdf'):
        if content:
            return extract_text_from_pdf(content)
        else:
            try:
                with open(file_path, 'rb') as f:
                    return extract_text_from_pdf(f.read())
            except Exception:
                return ""

    # Plain text files
    if content:
        try:
            return content.decode('utf-8', errors='ignore')
        except Exception:
            return ""
    else:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception:
            return ""


def extract_lab_items(text: str, filename: str = "") -> list[LabItem]:
    """
    Extract lab items from text using pattern matching.

    Returns list of LabItem with test_name, value, unit, reference_range, status, and source_snippet.
    """
    items: list[LabItem] = []
    seen_tests: set[str] = set()  # Avoid duplicates

    lines = text.split('\n')

    for line in lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue

        # Try each pattern
        for pattern in LAB_PATTERNS:
            matches = list(re.finditer(pattern, line, re.MULTILINE | re.IGNORECASE))

            for match in matches:
                groups = match.groupdict()

                test_name = groups.get('test_name', '').strip()
                value_str = groups.get('value', '').strip()
                unit = normalize_unit(groups.get('unit', '') or '')
                reference = groups.get('reference', '') or ''

                if not test_name or not value_str:
                    continue

                # Normalize test name for deduplication
                test_key = test_name.lower().replace(' ', '_')
                if test_key in seen_tests:
                    continue

                try:
                    value = float(value_str)
                except ValueError:
                    continue

                status = determine_status(value, reference)

                item = LabItem(
                    test_name=test_name,
                    value=value_str,
                    unit=unit,
                    reference_range_source=reference.strip(),
                    status=status,
                    source_snippet=line
                )

                items.append(item)
                seen_tests.add(test_key)

                # Only process first match per pattern per line
                break

    return items


def generate_patient_summary(items: list[LabItem], filename: str = "") -> str:
    """
    Generate a patient-friendly summary without diagnostic or treatment advice.

    IMPORTANT: This summary is for informational purposes only.
    Always consult qualified healthcare professionals for medical decisions.
    """
    if not items:
        return "No laboratory values could be extracted from the provided document. " + SAFETY_DISCLAIMER

    lines = [
        "LABORATORY RESULTS SUMMARY",
        "=" * 40,
        "",
    ]

    if filename:
        lines.append(f"Source: {filename}")
        lines.append("")

    # Group by status
    normal_items = [i for i in items if i.status == LabStatus.NORMAL]
    abnormal_items = [i for i in items if i.status in (LabStatus.LOW, LabStatus.HIGH)]
    unspecified_items = [i for i in items if i.status == LabStatus.UNSPECIFIED]

    # Normal results
    if normal_items:
        lines.append("Results Within Reference Range:")
        for item in normal_items:
            lines.append(f"  • {item.test_name}: {item.value} {item.unit}")
            if item.reference_range_source:
                lines.append(f"    Reference: {item.reference_range_source}")
        lines.append("")

    # Abnormal results
    if abnormal_items:
        lines.append("Results Outside Reference Range:")
        for item in abnormal_items:
            status_label = "LOW" if item.status == LabStatus.LOW else "HIGH"
            lines.append(f"  • {item.test_name}: {item.value} {item.unit} [{status_label}]")
            if item.reference_range_source:
                lines.append(f"    Reference: {item.reference_range_source}")
        lines.append("")

    # Unspecified results (no reference range in source)
    if unspecified_items:
        lines.append("Results (No Reference Range in Source Document):")
        for item in unspecified_items:
            lines.append(f"  • {item.test_name}: {item.value} {item.unit}")
            lines.append(f"    Note: No reference range was provided in the source document.")
        lines.append("")

    lines.append("-" * 40)
    lines.append(SAFETY_DISCLAIMER)

    return "\n".join(lines)


SAFETY_DISCLAIMER = """
DISCLAIMER: This summary is generated for informational purposes only.
MedLens is a documentation tool and does not provide medical advice.
Always consult qualified healthcare professionals for medical decisions.
Do not make clinical decisions based solely on this tool.
"""


def extract_clinical_data(
    text: str,
    filename: str = "",
    include_raw: bool = True
) -> ExtractionOutput:
    """
    Main extraction function.

    Extracts lab items from clinical report text and generates patient summary.

    Args:
        text: Raw text from report (PDF or plain text)
        filename: Original filename for provenance
        include_raw: Whether to include raw text in output

    Returns:
        ExtractionOutput with lab_items, patient_summary, raw_text, etc.
    """
    lab_items = extract_lab_items(text, filename)
    summary = generate_patient_summary(lab_items, filename)

    return ExtractionOutput(
        lab_items=lab_items,
        patient_summary=summary,
        raw_text=text if include_raw else "",
        filename=filename,
        extraction_timestamp=datetime.utcnow()
    )


# =============================================================================
# DETERMINISTIC MOCK EXTRACTION FOR DEMOS
# =============================================================================

def get_mock_extraction(filename: str = "mock_report.pdf") -> ExtractionOutput:
    """
    Generate deterministic mock extraction for demo/offline scenarios.

    Uses fixed seed based on filename hash for consistent results.
    """
    # Deterministic mock data based on common lab values
    mock_items = [
        LabItem(
            test_name="Glucose",
            value="98",
            unit="mg/dL",
            reference_range_source="70-100 mg/dL",
            status=LabStatus.NORMAL,
            source_snippet="Glucose: 98 mg/dL (70-100 mg/dL)"
        ),
        LabItem(
            test_name="Hemoglobin",
            value="14.5",
            unit="g/dL",
            reference_range_source="12.0-17.5 g/dL",
            status=LabStatus.NORMAL,
            source_snippet="Hemoglobin: 14.5 g/dL (12.0-17.5 g/dL)"
        ),
        LabItem(
            test_name="WBC",
            value="7.2",
            unit="10*3/uL",
            reference_range_source="4.5-11.0 10*3/uL",
            status=LabStatus.NORMAL,
            source_snippet="WBC 7.2 10*3/uL 4.5-11.0"
        ),
        LabItem(
            test_name="Creatinine",
            value="1.1",
            unit="mg/dL",
            reference_range_source="0.7-1.3 mg/dL",
            status=LabStatus.NORMAL,
            source_snippet="Creatinine: 1.1 mg/dL (0.7-1.3 mg/dL)"
        ),
        LabItem(
            test_name="ALT",
            value="25",
            unit="U/L",
            reference_range_source="7-56 U/L",
            status=LabStatus.NORMAL,
            source_snippet="ALT: 25 U/L (7-56 U/L)"
        ),
        LabItem(
            test_name="Total Cholesterol",
            value="185",
            unit="mg/dL",
            reference_range_source="<200 mg/dL",
            status=LabStatus.NORMAL,
            source_snippet="Total Cholesterol: 185 mg/dL (<200 mg/dL)"
        ),
    ]

    summary = generate_patient_summary(mock_items, filename)

    mock_raw = """CLINICAL LABORATORY REPORT
============================

Patient: Demo Patient
Date: 2024-01-15

Laboratory Results:
  Glucose: 98 mg/dL (70-100 mg/dL)
  Hemoglobin: 14.5 g/dL (12.0-17.5 g/dL)
  WBC: 7.2 10*3/uL 4.5-11.0
  Creatinine: 1.1 mg/dL (0.7-1.3 mg/dL)
  ALT: 25 U/L (7-56 U/L)
  Total Cholesterol: 185 mg/dL (<200 mg/dL)

Note: This is mock/demo data for illustration purposes.

""" + SAFETY_DISCLAIMER

    return ExtractionOutput(
        lab_items=mock_items,
        patient_summary=summary,
        raw_text=mock_raw,
        filename=filename,
        extraction_timestamp=datetime.utcnow()
    )


def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage."""
    return re.sub(r"[^\w\s\-\.]", "", filename)
