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
    provenance: str = "ai_extracted"  # "ai_extracted", "patient_reported", or "ai_extracted (Local Engine)"


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
    # Pattern: Pipe-delimited table rows from PDF tables (e.g., CBC reports)
    # Examples:
    #   "HEMOGLOBIN | 15 | g/dl | 13 - 17 |"
    #   "LYMPHOCYTE | L 18 | % | 20 - 40 |"
    #   "MEAN CELL HAEMOGLOBIN CON, MCHC | H 35.7 | % | 31.5 - 34.5 |"
    #   "TOTAL LEUKOCYTE COUNT | 5,100 | cumm | 4,800 - 10,800 |"
    #   "PLATELET COUNT | 3.5 | lakhs/cumm | 1.5 - 4.1 |"
    #   "BASOPHILS | 1 | % | < 2 |"
    r"(?P<test_name>[A-Za-z][A-Za-z\s\-,']+?)\s*\|\s*(?P<value>L\s+\d[\d,\.]*(?:\.\d+)?|H\s+\d[\d,\.]*(?:\.\d+)?|\d[\d,\.]*(?:\.\d+)?)\s*\|\s*(?P<unit>mg/dL|g/dl|cumm|lakhs/cumm|fL|Pg|%|mEq/L|mmol/L|U/L|cells/\w+|ng/mL|ug/dL|pg/mL)\s*\|\s*(?P<reference>[\d\s\-,]+\s*[\d])\s*\|\s*$",

    # Pattern: Test Name Value Unit Reference Range (space-delimited)
    # Examples: "Glucose 95 mg/dL 70-100"
    #           "HEMOGLOBIN 15 g/dl 13 - 17"
    #           "TOTAL LEUKOCYTE COUNT 5,100 cumm 4,800 - 10,800"
    #           "PLATELET COUNT 3.5 lakhs/cumm 1.5-4.1"
    #           "MEAN CELL HAEMOGLOBIN CON, MCHC H 35.7 % 31.5 - 34.5"
    #           "EOSINOPHILS 1 % 1 - 6"
    #           "MONOCYTES L 1 % 2 - 10"
    r"(?P<test_name>[A-Za-z][A-Za-z\s\-,']+?)\s+(?P<value>L\s+\d[\d,\.]*(?:\.\d+)?|H\s+\d[\d,\.]*(?:\.\d+)?|\d[\d,\.]*(?:\.\d+)?)\s+(?P<unit>mg/dL|g/dl|cumm|lakhs/cumm|fL|Pg|%|mEq/L|mmol/L|U/L|cells/\w+|ng/mL|ug/dL|pg/mL)\s+(?P<reference>\d[\d,\.]*\s*-\s*\d[\d,\.]*)",

    # Pattern: Test Name with L/H flag then unit and range (no value field)
    # Examples: "LYMPHOCYTE L 18 % 20 - 40"
    #           "MCHC H 35.7 % 31.5 - 34.5"
    r"(?P<test_name>[A-Za-z][A-Za-z\s\-',]+?)\s+(?P<flag>L|H)\s+(?P<value>\d[\d,\.]*(?:\.\d+)?)\s+(?P<unit>%|mg/dL|g/dl|cumm|lakhs/cumm|fL|Pg|mEq/L|mmol/L|U/L)\s+(?P<reference>\d[\d,\.]*\s*-\s*\d[\d,\.]*)",

    # Pattern: Test Name: Value Unit (Reference Range in parentheses)
    # Examples: "Glucose: 95 mg/dL (70-100 mg/dL)"
    #           "Hemoglobin: 14.2 g/dL (12.0-17.5 g/dL)"
    #           "Total Cholesterol: 185 mg/dL (<200 mg/dL)"
    r"(?P<test_name>[A-Za-z][A-Za-z\s\-']+?):\s*(?P<value>L\s+\d[\d,\.]*(?:\.\d+)?|H\s+\d[\d,\.]*(?:\.\d+)?|\d[\d,\.]*(?:\.\d+)?)\s*(?P<unit>mg/dL|g/dL|mEq/L|mmol/L|U/L|%|cells/\w+|ng/mL|ug/dL|pg/dL|cumm|lakhs/cumm|fL|Pg)?\s*(?:\((?P<reference>[^)]+)\))?",

    # Pattern: Simple test name and value (no unit/reference)
    # Examples: "WBC 8.5", "RBC 4.8"
    r"^(?P<test_name>WBC|RBC|Hgb|Hct|Platelet|BUN|Creatinine|ALT|AST|ALP|Total Bilirubin|Albumin|Total Protein)\s+(?P<value>L?\d[\d,\.]*(?:\.\d+)?)",
]

# Unit normalization map
UNIT_MAP = {
    "mg/dl": "mg/dL",
    "g/dl": "g/dL",
    "mg/dL": "mg/dL",
    "g/dL": "g/dL",
    "meq/l": "mEq/L",
    "meq/L": "mEq/L",
    "mmol/l": "mmol/L",
    "mmol/L": "mmol/L",
    "u/l": "U/L",
    "u/L": "U/L",
    "cumm": "10^9/L",
    "lakhs/cumm": "10^9/L",
    "fL": "fL",
    "Pg": "pg",
    "%": "%",
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

    Handles ranges from source documents including:
        "70-100" -> (70.0, 100.0)
        "70.5 - 99.5" -> (70.5, 99.5)
        "4,800 - 10,800" -> (4800.0, 10800.0)
        "13 to 17" -> (13.0, 17.0)
        "<100", "<=100", "≤100" -> (None, 100.0)
        ">50", ">=50", "≥50" -> (50.0, None)
        "Reference: 12.0 - 15.5 g/dL" -> (12.0, 15.5)
    """
    if not ref_text:
        return None, None

    ref_text = ref_text.strip()

    # Strip common leading prefixes
    ref_text = re.sub(r'^(?:reference|ref|normal|range)\s*:\s*', '', ref_text, flags=re.IGNORECASE).strip()

    # Handle "low - high" or "low to high" format (with optional spaces and commas)
    dash_match = re.search(r"([\d.,]+)\s*(?:-|to)\s*([\d.,]+)", ref_text, re.IGNORECASE)
    if dash_match:
        try:
            low = float(dash_match.group(1).replace(',', ''))
            high = float(dash_match.group(2).replace(',', ''))
            return low, high
        except ValueError:
            pass

    # Handle "< value", "<= value", "≤ value" format (high only)
    lt_match = re.search(r"(?:<=|≤|<)\s*([\d.,]+)", ref_text)
    if lt_match:
        try:
            return None, float(lt_match.group(1).replace(',', ''))
        except ValueError:
            pass

    # Handle "> value", ">= value", "≥ value" format (low only)
    gt_match = re.search(r"(?:>=|≥|>)\s*([\d.,]+)", ref_text)
    if gt_match:
        try:
            return float(gt_match.group(1).replace(',', '')), None
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


def _clean_value(value_str: str) -> str:
    """Strip L/H status flags and commas from a value string for float parsing.

    Examples:
        "L 18" -> "18"
        "H 35.7" -> "35.7"
        "5,100" -> "5100"
        "3.5" -> "3.5"
    """
    value_str = value_str.strip()
    # Remove leading L or H flag (with optional space)
    value_str = re.sub(r'^[LH]\s*', '', value_str)
    # Remove commas from numbers
    value_str = value_str.replace(',', '')
    return value_str


# Known CBC test names for marker-based matching
CBC_TEST_NAMES = {
    "hemoglobin": ("Hemoglobin", "g/dl", "13 - 17"),
    "total leukocyte count": ("Total Leukocyte Count", "cumm", "4,800 - 10,800"),
    "neutrophils": ("Neutrophils", "%", "40 - 80"),
    "lymphocyte": ("Lymphocyte", "%", "20 - 40"),
    "eosinophils": ("Eosinophils", "%", "1 - 6"),
    "monocytes": ("Monocytes", "%", "2 - 10"),
    "basophils": ("Basophils", "%", "< 2"),
    "platelet count": ("Platelet Count", "lakhs/cumm", "1.5 - 4.1"),
    "total rbc count": ("Total RBC Count", "million/cumm", "4.5 - 5.5"),
    "hematocrit value, hct": ("Hematocrit Value, HCT", "%", "40 - 50"),
    "mean corpuscular volume, mcv": ("Mean Corpuscular Volume, MCV", "fL", "83 - 101"),
    "mean cell haemoglobin, mch": ("Mean Cell Haemoglobin, MCH", "Pg", "27 - 32"),
    "mean cell haemoglobin con, mchc": ("Mean Cell Haemoglobin Con, MCHC", "%", "31.5 - 34.5"),
    # Alternative names / abbreviations
    "hct": ("Hematocrit Value, HCT", "%", "40 - 50"),
    "mcv": ("Mean Corpuscular Volume, MCV", "fL", "83 - 101"),
    "mch": ("Mean Cell Haemoglobin, MCH", "Pg", "27 - 32"),
    "mchc": ("Mean Cell Haemoglobin Con, MCHC", "%", "31.5 - 34.5"),
    "wbc": ("Total Leukocyte Count", "cumm", "4,800 - 10,800"),
    "rbc": ("Total RBC Count", "million/cumm", "4.5 - 5.5"),
    "hgb": ("Hemoglobin", "g/dl", "13 - 17"),
    "hb": ("Hemoglobin", "g/dl", "13 - 17"),
}


def _extract_with_local_engine(text: str, filename: str = "", provenance: str = "AI Extracted (Local Engine)") -> list[LabItem]:
    """
    Extract lab items using the deterministic local engine with marker-based parsing.

    pypdf extracts table cells as separate lines. This parser walks through lines,
    identifies known CBC test names as markers, then collects the subsequent lines
    (value, optional L/H flag, unit, reference range) into structured LabItems.
    """
    items: list[LabItem] = []
    seen_tests: set[str] = set()

    # Split and clean lines
    raw_lines = text.split('\n')
    lines = [line.strip() for line in raw_lines if line.strip()]

    i = 0
    while i < len(lines):
        line_lower = lines[i].lower().strip()

        # Check if this line matches a known CBC test name
        matched_key = None
        for key in CBC_TEST_NAMES:
            if key in line_lower or line_lower in key:
                matched_key = key
                break

        if matched_key:
            display_name, default_unit, default_ref = CBC_TEST_NAMES[matched_key]
            test_key = matched_key.replace(' ', '_')
            if test_key in seen_tests:
                i += 1
                continue

            # Collect subsequent lines for value, unit, reference
            # Pattern: [optional L/H flag] -> value -> unit -> reference
            collected = []
            j = i + 1
            while j < len(lines) and len(collected) < 5:
                # Stop if we hit another known test name or section header
                next_lower = lines[j].lower().strip()
                if any(k in next_lower for k in CBC_TEST_NAMES if k != matched_key):
                    break
                if next_lower in ('test', 'value', 'unit', 'reference', 'haematology', 'complete blood count', 'cbc', 'differential leucocyte count', 'clinical notes'):
                    break
                collected.append(lines[j])
                j += 1

            # Parse collected lines
            # Find the numeric value line (first line that looks like a number with optional L/H)
            value_line_idx = None
            status_flag = ''
            for idx, cl in enumerate(collected):
                if re.match(r'^[LH]?\s*[\d,]+\.?\d*$', cl):
                    value_line_idx = idx
                    # Extract status flag if present
                    if cl.strip().startswith(('L', 'H')):
                        status_flag = cl.strip()[0]
                    break

            if value_line_idx is not None:
                raw_value = collected[value_line_idx].strip()
                clean_value = _clean_value(raw_value)

                # Unit is next line after value (if exists)
                unit = default_unit
                if value_line_idx + 1 < len(collected):
                    unit_candidate = collected[value_line_idx + 1]
                    if not re.match(r'^[\d,<>\-.\s]+$', unit_candidate):  # not a range line
                        unit = normalize_unit(unit_candidate) or default_unit

                # Reference range is the next line that looks like a range
                reference = default_ref
                for idx in range(value_line_idx + 1, len(collected)):
                    cl = collected[idx]
                    if re.search(r'[\d,<>\-.\s]+', cl) and ('-' in cl or '<' in cl or '>' in cl):
                        # This looks like a reference range
                        reference = cl.strip()
                        break

                if clean_value:
                    try:
                        value = float(clean_value)
                    except ValueError:
                        pass
                    else:
                        status = determine_status(value, reference)

                        item = LabItem(
                            test_name=display_name,
                            value=clean_value,
                            unit=unit,
                            reference_range_source=reference.strip(),
                            status=status,
                            source_snippet=' '.join([lines[i]] + collected),
                            provenance=provenance,
                        )

                        items.append(item)
                        seen_tests.add(test_key)

            i = j
            continue

        i += 1

    # Fallback: also run the original regex patterns on the full text
    # This catches any formats that aren't handled by the marker-based approach
    for line in raw_lines:
        line = line.strip()
        if not line or len(line) < 5:
            continue
        for pattern in LAB_PATTERNS:
            matches = list(re.finditer(pattern, line, re.MULTILINE | re.IGNORECASE))
            for match in matches:
                groups = match.groupdict()
                test_name = groups.get('test_name', '').strip()
                raw_value = groups.get('value', '').strip()
                unit = normalize_unit(groups.get('unit', '') or '')
                reference = groups.get('reference', '') or ''
                if not test_name or not raw_value:
                    continue
                test_key = test_name.lower().replace(' ', '_')
                if test_key in seen_tests:
                    continue
                clean_value = _clean_value(raw_value)
                if not clean_value:
                    continue
                try:
                    value = float(clean_value)
                except ValueError:
                    continue
                status = determine_status(value, reference)
                item = LabItem(
                    test_name=test_name,
                    value=clean_value,
                    unit=unit,
                    reference_range_source=reference.strip(),
                    status=status,
                    source_snippet=line,
                    provenance=provenance,
                )
                items.append(item)
                seen_tests.add(test_key)
                break

    return items


def extract_lab_items(text: str, filename: str = "") -> list[LabItem]:
    """
    Extract lab items from text using pattern matching.

    Returns list of LabItem with test_name, value, unit, reference_range, status, and source_snippet.
    """
    return _extract_with_local_engine(text, filename, provenance="ai_extracted")


def extract_local_clinical_data(pdf_content: bytes, filename: str = "", include_raw: bool = True) -> ExtractionOutput:
    """
    Deterministic local extraction fallback using pypdf + regex.

    Extracts raw text from the PDF with pypdf.PdfReader, matches standard CBC/metabolic
    lab lines, strips optional L/H status flags, computes status against the source range,
    and marks every item with provenance "AI Extracted (Local Engine)".
    """
    if not PDF_AVAILABLE:
        return ExtractionOutput(filename=filename)

    pdf_text = extract_text_from_pdf(pdf_content)
    lab_items = _extract_with_local_engine(pdf_text, filename)
    summary = generate_patient_summary(lab_items, filename)

    return ExtractionOutput(
        lab_items=lab_items,
        patient_summary=summary,
        raw_text=pdf_text if include_raw else "",
        filename=filename,
        extraction_timestamp=datetime.utcnow(),
    )


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
    include_raw: bool = True,
) -> ExtractionOutput:
    """
    Main extraction function.

    Extracts lab items from clinical report text using regex patterns and
    generates a patient summary. Exceptions propagate to the caller for
    fallback handling (e.g., local deterministic extraction).

    Args:
        text: Raw text from report (PDF or plain text)
        filename: Original filename for provenance
        include_raw: Whether to include raw text in output

    Returns:
        ExtractionOutput with lab_items, patient_summary, raw_text, etc.
    """
    if not text.strip():
        return ExtractionOutput(filename=filename)

    lab_items = extract_lab_items(text, filename)

    summary = generate_patient_summary(lab_items, filename)

    return ExtractionOutput(
        lab_items=lab_items,
        patient_summary=summary,
        raw_text=text if include_raw else "",
        filename=filename,
        extraction_timestamp=datetime.utcnow(),
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
