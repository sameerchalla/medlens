# MedLens 🔬

**AI-Powered Clinical Information Dashboard**

MedLens transforms unstructured clinical reports and patient intake information into a structured, provenance-aware patient record system. Built for healthcare professionals to efficiently parse and organize clinical data while ensuring safety and traceability.

[![License: Educational](https://img.shields.io/badge/license-Educational-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Node 18+](https://img.shields.io/badge/node-18+-green.svg)](https://nodejs.org/)

## Table of Contents
- [Problem Statement](#problem-statement)
- [Core Mission & Features](#core-mission--features)
- [Safety Rules & Medical Disclaimer](#safety-rules--medical-disclaimer)
- [Data Model](#data-model)
- [API Endpoints](#api-endpoints)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend](#backend)
  - [Frontend](#frontend)
- [Environment Variables](#environment-variables)
- [Development & Testing](#development--testing)
- [License](#license)

---

## Problem Statement
Patient healthcare data is scattered across prescriptions, lab reports, clinician memory, and intake forms. This fragmentation creates critical risks:

- **Missed correlations**: Key clinical signals are lost when information lives in disconnected silos.
- **Miscommunication**: Reference ranges and units can be misread or forgotten across document types.
- **AI hallucination risk**: Automated extraction tools may invent values, ranges, or statuses that never appeared in the source document, producing dangerous clinical conclusions.

MedLens addresses this by transforming unstructured clinical reports and patient intake information into a structured, provenance‑aware patient record — where every data point carries its origin, every reference range is strictly derived from the source document, and AI‑suggested results are subject to explicit human‑in‑the‑loop verification.

## Core Mission & Features
- **Patient Information Intake** – Patients (or clinicians) can add values directly during intake. Every user‑entered field is tagged with explicit `patient_reported` provenance.
- **Medical Report Extraction** – FastAPI backend uses `pypdf` to parse uploaded PDFs and a deterministic extraction pipeline (Pydantic‑validated schema) to pull test names, values, units, and printed reference ranges. No LLM is required for the MVP – all parsing is rule‑based to eliminate hallucination risk.
- **Reference‑Range Invariance** – Values are flagged **LOW**, **NORMAL**, or **HIGH** **only** based on ranges present in the source report:
  - If a range appears in the document, the value is classified against it.
  - If no range is in the document, the status is set to **"No Reference Provided"** (or `UNSPECIFIED`) – MedLens never invents or assumes standard reference ranges.
  - The exact reference range text from the source is always displayed alongside each extracted value.
- **Human‑in‑the‑Loop Verification** – Every AI‑extracted record can be reviewed and corrected inline. When a value is edited and saved, its provenance switches to `verified_by_user` (audit trail retained).
- **Observational Correlation Alerts** – MedLens surfaces non‑diagnostic correlation observations (e.g., flagging that "fatigue" appears alongside a "low hemoglobin" result) to prompt clinical attention **without** suggesting a diagnosis or treatment.
- **Print & PDF Export** – Custom `@media print` stylesheet produces a clean A4 clinical brief:
  - Dual‑render table strategy (interactive table hidden for print, print‑only table with simplified borders).
  - Explicit print colors (amber, green, red, slate) for legibility on black‑and‑white printers.
  - Layout optimized for readability (8–11pt typography) with interactive elements hidden.

## Safety Rules & Medical Disclaimer
> **MedLens is for informational purposes only. Always consult qualified healthcare professionals for medical decisions. Do not make clinical decisions based solely on this tool.**

Strict safety rules enforced throughout the application:
- **Never provide medical diagnosis**.
- **Never suggest dosage changes**.
- **Never offer treatment advice**.
- This is a documentation/visualization tool only.
- **Reference‑Range Rule** – Only flag values as Low/Normal/High based **strictly** on ranges present in the report. If no range is in the source document, label it: **"No Reference Provided"**.
- **Provenance Rule** – Every data field MUST carry metadata indicating its origin:
  - `patient_reported` – Entered directly by patient.
  - `ai_extracted` – Parsed from uploaded document (includes source filename).
  - Optionally `verified_by_user` after human review.

## Data Model
```typescript
interface PatientRecord {
  id: string;
  patientId?: string;
  name?: string;
  dateOfBirth?: string;
  fields: Record<string, ProvenanceValue>;
  uploadedReports: Report[];
  createdAt: string;
  updatedAt: string;
}

interface ProvenanceValue {
  value: string | number;
  provenance: 'patient_reported' | 'ai_extracted' | 'verified_by_user';
  sourceFile?: string;          // filename for extracted data
  extractedAt?: string;         // timestamp when AI extraction occurred
}

interface Report {
  id: string;
  filename: string;
  uploadDate: string;
  documentType: string;
  content: string;
}
```

## API Endpoints
| Method | Endpoint                     | Description                              |
|--------|------------------------------|------------------------------------------|
| GET    | `/api/health`                | Health check                             |
| GET    | `/api/patients`              | List all patients                        |
| POST   | `/api/patients`              | Create new patient                       |
| GET    | `/api/patients/:id`          | Get patient details                      |
| POST   | `/api/reports/upload`        | Upload clinical report                   |
| POST   | `/api/reports/:id/extract`   | Extract data from report (AI‑assisted)   |
| DELETE | `/api/patients/:id`          | Delete patient                           |
| GET    | `/api/docs`                  | Swagger UI (auto‑generated by FastAPI)   |

*Frontend dev server proxies `/api` to `http://localhost:8000`.*

## Tech Stack
| Layer          | Technology                              |
|----------------|-----------------------------------------|
| **Frontend**   | React, TypeScript, Vite                 |
| **Styling**    | Tailwind CSS                            |
| **Icons**      | Lucide React                            |
| **Backend**    | Python, FastAPI, Uvicorn                |
| **PDF Parsing**| PyPDF                                   |
| **Data Validation** | Pydantic                         |
| **HTTP Client**| Axios (frontend) / httpx (backend tests)|
| **Build**      | Vite (frontend), pip (backend)          |

## Project Structure
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
│   │   │   ├── ClinicalSummary.tsx
│   │   │   ├── LabResultsTable.tsx
│   │   │   ├── MedicalDisclaimer.tsx
│   │   │   ├── PatientIntake.tsx
│   │   │   └── … (other UI components)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── PatientView.tsx
│   │   │   └── …
│   │   ├── types/
│   │   │   └── index.ts         # Shared TypeScript interfaces
│   │   ├── lib/
│   │   │   ├── api.ts           # Axios instance & endpoints
│   │   │   └── mockData.ts      # Development mock data
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── postcss.config.js
├── CLAUDE.md                   # Project instructions & safety rules
└── README.md
```

## Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** (with npm or yarn)

### Backend
```bash
# Clone the repository (if not already)
git clone <repository-url>
cd medlens/backend

# Install dependencies
pip install -r requirements.txt

# (Optional) Create a .env file from .env.example
cp .env.example .env
# Edit .env if you need to change PORT, HOST, UPLOAD_DIR, or MAX_FILE_SIZE

# Run the server
uvicorn app.main:app --reload --port 8000
```
The FastAPI backend will be available at **http://localhost:8000**  
API documentation (Swagger UI) at **http://localhost:8000/docs**

### Frontend
In a separate terminal:
```bash
cd medlens/frontend

# Install dependencies
npm install

# Start the Vite dev server
npm run dev   # runs on http://localhost:5173
```
The Vite development server proxies `/api` requests to `http://localhost:8000`.

## Environment Variables (Backend)
| Variable | Description | Default |
|----------|-------------|---------|
| `PORT`   | Port the API server listens on | `8000` |
| `HOST`   | Host interface | `0.0.0.0` |
| `UPLOAD_DIR` | Directory where uploaded reports are stored | `./uploads` |
| `MAX_FILE_SIZE` | Maximum upload size in bytes | `10485760` (10 MB) |

Create a `.env` file in the `backend/` folder based on `.env.example` to override defaults.

## Development & Testing
- **Backend tests** (if any) can be run with `pytest` from the `backend/` directory.
- **Frontend linting**: `npm run lint` (ESLint with React‑Hooks & Refresh plugins).
- **Frontend preview**: `npm run preview` to test the production build locally.
- **Production build**: `npm run build` outputs optimized assets to `frontend/dist/`.

## License
This project is created for educational/hackathon purposes. No specific license is applied; feel free to adapt and reuse with acknowledgment.

---

*Built with ❤️ for better clinical data handling.* 