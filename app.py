import html

import numpy as np
import streamlit as st
from PIL import Image
from paddleocr import PaddleOCR

from ocr_parser import extract_lab_metrics, group_ocr_rows


def classify_metric(value, ref_low, ref_high):
    try:
        value, ref_low, ref_high = map(float, (value, ref_low, ref_high))
    except (TypeError, ValueError):
        return "CHECK"
    if value < ref_low:
        return "LOW"
    if value > ref_high:
        return "HIGH"
    return "NORMAL"


@st.cache_resource
def get_ocr():
    return PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


if "medical_records" not in st.session_state:
    st.session_state.medical_records = [
        {
            "metrics": [
                {
                    "component": "Hemoglobin",
                    "value": "12.5",
                    "ref_low": "13.0",
                    "ref_high": "17.0",
                },
                {
                    "component": "WBC Count",
                    "value": "11.5",
                    "ref_low": "4.0",
                    "ref_high": "11.0",
                },
            ],
            "status": "Pending Review",
            "doctor_note": "",
        }
    ]

for key, initial_value in {
    "total_uploads": 0,
    "verified_count": 0,
    "flagged_count": 0,
    "active_profile_number": 1,
    "counted_upload_ids": set(),
}.items():
    if key not in st.session_state:
        st.session_state[key] = initial_value


view = st.sidebar.selectbox(
    "Switch Workspace View",
    ["Patient Workspace", "Doctor Portal", "Admin Dashboard"],
)

if view == "Patient Workspace":
    st.header("👁️ Patient Health Vault")
    report = st.session_state.medical_records[0]
    language = st.radio(
        "Translate Explanations To:",
        ["English", "Telugu"],
        horizontal=True,
    )
    ocr = get_ocr()
    uploaded_file = st.file_uploader(
        "Upload Report Photo",
        type=["jpg", "jpeg", "png"],
    )
    if uploaded_file and uploaded_file.file_id not in st.session_state.counted_upload_ids:
        st.session_state.counted_upload_ids.add(uploaded_file.file_id)
        st.session_state.total_uploads += 1

    extracted_metrics = []
    if uploaded_file:
        image = np.array(Image.open(uploaded_file).convert("RGB"))
        results = ocr.predict(image)
        ocr_rows = group_ocr_rows(results, image.shape[0])
        extracted_metrics = extract_lab_metrics(ocr_rows)
        with st.expander("Raw OCR text"):
            st.text("\n".join(ocr_rows) if ocr_rows else "No text detected.")
    status_colors = {
        "NORMAL": "#d1fae5",
        "HIGH": "#fee2e2",
        "LOW": "#fee2e2",
        "CHECK": "#fef3c7",
    }
    if uploaded_file is None:
        st.caption("Synthetic demo metrics (not extracted from the uploaded report).")
        display_metrics = report["metrics"]
    elif extracted_metrics:
        st.caption(
            "Read from the uploaded photo by OCR. A status is shown only where "
            "the report prints a reference range; otherwise it is CHECK."
        )
        display_metrics = extracted_metrics
    else:
        display_metrics = []
        st.warning(
            "No lab values could be read from this photo. Check that the page "
            "is upright, well lit and in focus. See Raw OCR text above."
        )
    if display_metrics:
        table_rows = []
        for metric in display_metrics:
            status = classify_metric(
                metric["value"], metric["ref_low"], metric["ref_high"]
            )
            ref_text = metric.get("ref_text")
            if ref_text is None:
                ref_text = f"{metric['ref_low']}-{metric['ref_high']}"
            elif not ref_text:
                ref_text = "Not printed"
            value_text = html.escape(str(metric["value"]))
            if metric.get("unit"):
                value_text += f" {html.escape(metric['unit'])}"
            table_rows.append(
                f"<tr><td>{html.escape(metric['component'])}</td><td>{value_text}</td>"
                f"<td>{html.escape(ref_text)}</td>"
                f"<td><span style='background-color:{status_colors[status]};"
                f"padding:4px 10px;border-radius:999px'>{status}</span></td></tr>"
            )
        st.markdown(
            "<table><thead><tr><th>Component</th><th>Value</th>"
            "<th>Reference Range</th><th>Status</th></tr></thead><tbody>"
            + "".join(table_rows)
            + "</tbody></table>",
            unsafe_allow_html=True,
        )
    st.subheader("📈 5-Month Metric Trend Tracker")
    trend_data = {
        "Dates": ["June", "July", "August", "September", "October"],
        "Value": [14.0, 13.8, 13.5, 12.9, 12.5],
    }
    st.caption("Synthetic demo history.")
    st.line_chart(trend_data, x="Dates", y="Value")
    st.write(f"Report status: {report['status']}")
    if language == "Telugu":
        st.info("మీ నివేదిక సాధారణంగా బాగుంది")
    st.subheader("Doctor's Note")
    if report["doctor_note"]:
        st.info(report["doctor_note"])
    else:
        st.caption("No doctor note yet.")
elif view == "Doctor Portal":
    st.header("🩺 Clinician Verification Engine")
    report = st.session_state.medical_records[0]
    st.write(f"Report status: {report['status']}")
    for metric in report["metrics"]:
        st.write(
            f"{metric['component']}: {metric['value']} "
            f"(reference range {metric['ref_low']}-{metric['ref_high']})"
        )
    clinical_note = st.text_area("Clinical Notes", key="clinical_note_input")
    st.markdown(
        """
        <style>
        div[data-testid="stHorizontalBlock"] > div[data-testid="column"]:first-child button {
            background-color: #15803d;
            color: white;
        }
        div[data-testid="stHorizontalBlock"] > div[data-testid="column"]:nth-child(2) button {
            background-color: #b91c1c;
            color: white;
        }
        </style>
        """,
        unsafe_allow_html=True,
    )
    confirm_column, flag_column = st.columns(2)
    if confirm_column.button("Confirm & Sign Report", use_container_width=True):
        report["status"] = "Verified & Confirmed"
        report["doctor_note"] = clinical_note
        st.session_state.verified_count += 1
    if flag_column.button("Flag for Re-Scan", use_container_width=True):
        report["status"] = "Flagged for Re-Scan"
        st.session_state.flagged_count += 1
elif view == "Admin Dashboard":
    st.header("📊 Administrative Infrastructure Monitor")
    columns = st.columns(4)
    columns[0].metric("Total Uploads", st.session_state.total_uploads)
    columns[1].metric("Verified Reports", st.session_state.verified_count)
    columns[2].metric("Flagged Reports", st.session_state.flagged_count)
    columns[3].metric("Active User Profile", st.session_state.active_profile_number)