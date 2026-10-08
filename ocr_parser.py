"""Turn PaddleOCR output into lab-result rows for the metrics table.

Kept free of Streamlit and PaddleOCR imports so the parsing can be tested
without downloading OCR models.

Zero-hallucination rule: a reference range is only used when it is printed
in the report. The status is computed from that printed range; if no range
is printed, the row is marked CHECK by the caller.
"""

import re

import numpy as np

# Thousands separators are allowed ("4,800 - 10,800"); decimals are optional.
NUMBER = r"\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?"

RANGE_RE = re.compile(
    rf"(?<![\d.])(?P<lo>{NUMBER})\s*(?:-|–|—|to)\s*(?P<hi>{NUMBER})(?!\d)",
    re.IGNORECASE,
)
UPPER_ONLY_RE = re.compile(rf"(?:<=|<|≤)\s*(?P<hi>{NUMBER})")
LOWER_ONLY_RE = re.compile(rf"(?:>=|>|≥)\s*(?P<lo>{NUMBER})")

# name (greedy, may contain digits such as "HbA1c"), value, optional unit.
# A printed H/L flag between name and value is stripped from the name below.
VALUE_RE = re.compile(
    rf"^(?P<name>[A-Za-z][A-Za-z0-9 ,'()\-/.]*[A-Za-z0-9)])(?:\s*:\s*|\s+)"
    rf"(?P<value>{NUMBER})(?!\d)(?=\s*(?:[A-Za-z%µ]|$))\s*(?P<unit>[A-Za-z%µ/^\d.]*)"
)
TRAILING_FLAG_RE = re.compile(r"\s+[LH]$")

# Units accepted on a row that prints no reference range.
KNOWN_UNITS = {
    "g/dl", "mg/dl", "%", "fl", "pg", "cumm", "lakhs/cumm", "mmol/l",
    "meq/l", "u/l", "iu/l", "ng/ml", "ug/dl", "pg/ml", "cells/cumm",
    "10^9/l", "10^3/ul", "/cumm", "mill/cumm",
}

# Header and demographic words that can look like a test name.
NON_TEST_WORDS = {
    "patient", "name", "date", "age", "sex", "gender", "report", "page",
    "ref", "reference", "lab", "dr", "doctor", "id", "specimen",
    "collected", "registered", "phone", "address", "hospital", "ph",
}


def group_ocr_rows(results, image_height):
    """Group OCR text fragments into visual rows, left to right.

    Fragments whose vertical centres are within 1.5% of the image height
    share a row. Each row is returned as a string joined with " | ".
    """
    rows = []
    for page in results:
        texts = page.get("rec_texts")
        if texts is None:
            texts = page.get("texts", [])
        boxes = page.get("rec_boxes")
        if boxes is None:
            boxes = page.get("dt_polys", [])

        lines = []
        for text, box in zip(texts, boxes):
            coordinates = np.asarray(box)
            if coordinates.ndim == 1:
                x_center = (coordinates[0] + coordinates[2]) / 2
                y_center = (coordinates[1] + coordinates[3]) / 2
            else:
                x_center = (coordinates[:, 0].min() + coordinates[:, 0].max()) / 2
                y_center = (coordinates[:, 1].min() + coordinates[:, 1].max()) / 2
            lines.append((y_center, x_center, str(text)))

        lines.sort(key=lambda line: line[0])
        page_rows = []
        for line in lines:
            if not page_rows or line[0] - page_rows[-1][0][0] > image_height * 0.015:
                page_rows.append([line])
            else:
                page_rows[-1].append(line)
        rows.extend(
            " | ".join(line[2] for line in sorted(row, key=lambda line: line[1]))
            for row in page_rows
        )
    return rows


def _normalise_number(text):
    """'4,800' -> '4800'; '13.0' -> '13.0'."""
    return text.replace(",", "")


def parse_lab_row(row):
    """Parse one OCR row into a metric dict, or return None if it is not a lab result.

    Returned keys: component, value, unit, ref_low, ref_high, ref_text.
    ref_low/ref_high are strings (or None), matching the demo data format.
    ref_text is the range exactly as printed in the report.
    """
    text = " ".join(part.strip() for part in row.split("|") if part.strip())
    if not text:
        return None

    # Pull the printed reference range out of the row. Prefer the last
    # two-sided range, since references usually sit at the end of a row.
    ref_low = ref_high = None
    ref_text = ""
    matches = list(RANGE_RE.finditer(text))
    if matches:
        match = matches[-1]
        ref_low = _normalise_number(match.group("lo"))
        ref_high = _normalise_number(match.group("hi"))
    else:
        match = UPPER_ONLY_RE.search(text) or LOWER_ONLY_RE.search(text)
        if match:
            if "hi" in match.groupdict():
                ref_high = _normalise_number(match.group("hi"))
            else:
                ref_low = _normalise_number(match.group("lo"))
    if match:
        ref_text = match.group(0).strip()
        text = (text[: match.start()] + " " + text[match.end():]).strip()

    value_match = VALUE_RE.match(text)
    if not value_match:
        return None

    name = TRAILING_FLAG_RE.sub("", value_match.group("name").strip(" .:-"))
    letters = re.sub(r"[^A-Za-z]", "", name)
    if len(letters) < 3:
        return None
    if any(word.lower() in NON_TEST_WORDS for word in re.findall(r"[A-Za-z]+", name)):
        return None

    unit = value_match.group("unit").strip()
    has_range = ref_low is not None or ref_high is not None
    if not has_range and unit.lower() not in KNOWN_UNITS:
        # A bare number with no range and no recognised unit is too
        # ambiguous to show as a lab result.
        return None

    return {
        "component": name,
        "value": _normalise_number(value_match.group("value")),
        "unit": unit,
        "ref_low": ref_low,
        "ref_high": ref_high,
        "ref_text": ref_text,
    }


def extract_lab_metrics(rows):
    """Parse every OCR row and keep the ones that look like lab results."""
    metrics = []
    for row in rows:
        metric = parse_lab_row(row)
        if metric is not None:
            metrics.append(metric)
    return metrics
