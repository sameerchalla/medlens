# MedLens - AI-Powered Clinical Information Dashboard

## Project Overview

MedLens transforms unstructured clinical reports and patient intake information into a structured, provenance-aware patient record system. Built for healthcare professionals to efficiently parse and organize clinical data.

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: Vite + React + TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React

## Core Mission

Transform unstructured reports + intake info into a structured, provenance-aware patient record with:
- AI-assisted extraction of clinical values
- Clear provenance tracking for all data points
- Reference range awareness (never invented)

## Safety Rules

### 🚨 Medical Disclaimer
A prominent disclaimer banner MUST be displayed on every view:
> "MedLens is for informational purposes only. Always consult qualified healthcare professionals for medical decisions. Do not make clinical decisions based solely on this tool."

### 🚫 Strict Safety Rule
- **NEVER** provide medical diagnosis
- **NEVER** suggest dosage changes
- **NEVER** offer treatment advice
- This is a documentation/visualization tool only

### 📊 Reference-Range Rule
- Only flag values as Low/Normal/High based **STRICTLY** on ranges present in the report
- If no range is in the source document, label it: **"No Reference Provided"**
- **NEVER** invent or assume standard reference ranges
- Always show the exact reference range from the source alongside the value

### 🔍 Provenance Rule
Every data field MUST carry metadata indicating its origin:
- `patient_reported` - Entered directly by patient
- `ai_extracted` - Parsed from uploaded document
- Include source filename for extracted data

## Data Model

### Patient Record
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
  provenance: 'patient_reported' | 'ai_extracted';
  sourceFile?: string;
  extractedAt?: string;
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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Create new patient |
| GET | `/api/patients/:id` | Get patient details |
| POST | `/api/reports/upload` | Upload clinical report |
| POST | `/api/reports/:id/extract` | Extract data from report |
| DELETE | `/api/patients/:id` | Delete patient |

## File Structure

```
medlens/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app entry
│   │   ├── models.py         # Pydantic models
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── patients.py
│   │   │   └── reports.py
│   │   └── services/
│   │       ├── __init__.py
│   │       └── extraction.py # AI extraction logic
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── types/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
└── CLAUDE.md
```

## Development

### Running Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Running Frontend
```bash
cd frontend
npm install
npm run dev
```

### API Base URL
Frontend dev server proxies `/api` to `http://localhost:8000`

## Configuration

### Environment Variables (Backend)
```
PORT=8000
HOST=0.0.0.0
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB
```

## Hackathon Scope

For this 8-hour hackathon, focus on:
1. ✅ Report upload and display
2. ✅ Basic text extraction (rule-based for MVP)
3. ✅ Patient record with provenance metadata
4. ✅ Clean, professional UI with medical disclaimer
5. ✅ Reference range display from source documents

Future enhancements (out of scope):
- Real AI/LLM integration
- User authentication
- Multi-tenant support
- Full HL7/FHIR compliance
