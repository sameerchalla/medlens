# MedLens — AI Clinical Insight: AI-Powered Clinical Information Intelligence

## Problem Statement

Patient healthcare data is scattered across prescriptions, lab reports, clinician memory, and intake forms. This fragmentation creates critical risks:

- **Missed correlations**: Key clinical signals are lost when information lives in disconnected silos.
- **Miscommunication**: Reference ranges and units can be misread or forgotten across document types.
- **AI hallucination risk**: Automated extraction tools may invent values, ranges, or statuses that never appeared in the source document, producing dangerous clinical conclusions.

MedLens addresses this by transforming unstructured clinical reports and patient intake information into a structured, provenance-aware patient record — where every data point carries its origin, every reference range is strictly derived from the source document, and AI-suggested results are subject to explicit human-in-the-loop verification.

## Core Architecture & Features

### Patient Information Intake
Patients (or clinicians) can add values directly during intake. Every user-entered field is tagged with explicit `[Patient Provided]` provenance, distinguishing it from document-extracted data.

### Medical Report Extraction
The FastAPI backend uses `pypdf` to parse uploaded PDFs and a deterministic extraction pipeline (Pydantic-validated schema) to pull test names, values, units, and printed reference ranges. No LLM is required for the MVP — all parsing is rule-based to eliminate hallucination risk.

### Reference-Range Invariance
MedLens strictly flags values as **LOW**, **NORMAL**, or **HIGH** based **only** on ranges present in the source report:
- If a range appears in the document, the value is classified against it.
- If no range is in the document, the status is set to **UNSPECIFIED** — MedLens never invents or assumes standard reference ranges.
- The exact reference range text from the source is always displayed alongside each extracted value.

### Human-in-the-Loop Verification
Every AI-extracted record can be reviewed and corrected inline. When a value is edited and saved, its provenance auditably switches to `[Verified by User]`, ensuring the human review trail is explicit in the record.

### Observational Correlation Alerts
MedLens surfaces non-diagnostic correlation observations — e.g., flagging that "fatigue" appears in the patient summary alongside a "low hemoglobin" result — to prompt clinical attention without suggesting a diagnosis or treatment.

### Print & PDF Export
A custom `@media print` stylesheet produces a clean A4 clinical brief. Key features:
- **Dual-render table strategy**: The interactive table is wrapped in `print:hidden`; a separate print-only table with simplified borders and standard cell rendering outputs cleanly.
- **Color-adjust**: All print colors are explicitly set (amber, green, red, slate) so status badges render legibly on black-and-white printers.
- **Layout**: Interactive elements (buttons, icons, hover states) are hidden; typography is scaled for readability (8–11pt).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React, TypeScript, Vite |
| **Styling** | Tailwind CSS |
| **Icons** | Lucide React |
| **Backend** | Python, FastAPI, Uvicorn |
| **PDF Parsing** | PyPDF |
| **Data Validation** | Pydantic |

## Project Directory Tree

```
medlens/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app entry point
│   │   ├── models.py            # Pydantic models
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── patients.py      # Patient API routes
│   │   │   └── reports.py       # Report upload & extraction routes
│   │   └── services/
│   │       ├── __init__.py
│   │       └── extraction.py    # Deterministic PDF text extraction
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LabResultsTable.tsx   # Lab results table (dual-render print)
│   │   │   ├── ...
│   │   ├── pages/
│   │   ├── types/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
├── CLAUDE.md
└── README.md
```

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Backend Setup & Launch

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The FastAPI backend will be available at `http://localhost:8000`
API documentation is available at `http://localhost:8000/docs`

### 2. Frontend Setup & Launch

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server will be available at `http://localhost:5176`
The dev server proxies `/api` requests to `http://localhost:8000`

### Environment Variables (Backend)

```
PORT=8000
HOST=0.0.0.0
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

## Responsible AI & Safety Guardrails

MedLens is an **observational documentation and visualization tool only**. It is **not** a clinical decision support system, diagnostic tool, or treatment recommendation engine.

**Safety principles:**
- **No diagnosis**: MedLens never provides medical diagnoses.
- **No dosage/treatment advice**: Values are extracted and displayed only — never interpreted as dosing instructions.
- **No invented ranges**: Reference ranges are strictly sourced from the uploaded document. Missing ranges are flagged `UNSPECIFIED`.
- **Provenance tracking**: Every data point carries explicit origin metadata (`patient_reported` or `ai_extracted`), with source file attribution.
- **Human verification**: AI-extracted results can be corrected and auditably re-tagged as reviewed by a human user.

> **Medical Disclaimer**: MedLens is for informational purposes only. Always consult qualified healthcare professionals for medical decisions. Do not make clinical decisions based solely on this tool.