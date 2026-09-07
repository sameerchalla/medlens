import type {
  PatientRecord,
  Report,
  ExtractionResult,
  HealthResponse,
  ProvenanceType,
} from '../types';
import { ProvenanceType as ProvenanceTypeValue } from '../types';
import type { PatientCreate } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// Health check
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  return handleResponse<HealthResponse>(response);
}

// Patient endpoints
export async function getPatients(): Promise<PatientRecord[]> {
  const response = await fetch(`${API_BASE}/patients`);
  return handleResponse<PatientRecord[]>(response);
}

export async function getPatient(id: string): Promise<PatientRecord> {
  const response = await fetch(`${API_BASE}/patients/${id}`);
  return handleResponse<PatientRecord>(response);
}

export async function createPatient(data: PatientCreate): Promise<PatientRecord> {
  const response = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<PatientRecord>(response);
}

export async function updatePatient(id: string, data: PatientCreate): Promise<PatientRecord> {
  const response = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<PatientRecord>(response);
}

export async function deletePatient(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/patients/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete patient');
  }
}

export async function addPatientField(
  patientId: string,
  fieldName: string,
  value: string | number | boolean,
  provenance: ProvenanceType = ProvenanceTypeValue.PATIENT_REPORTED,
  sourceFile?: string
): Promise<void> {
  const params = new URLSearchParams({
    field_name: fieldName,
    value: String(value),
    provenance: provenance,
  });
  if (sourceFile) {
    params.append('source_file', sourceFile);
  }

  const response = await fetch(`${API_BASE}/patients/${patientId}/fields?${params}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to add field');
  }
}

// Report endpoints
export async function getReports(): Promise<Report[]> {
  const response = await fetch(`${API_BASE}/reports`);
  return handleResponse<Report[]>(response);
}

export async function getReport(id: string): Promise<Report> {
  const response = await fetch(`${API_BASE}/reports/${id}`);
  return handleResponse<Report>(response);
}

export async function uploadReport(
  file: File,
  documentType: string = 'other'
): Promise<Report> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);

  const response = await fetch(`${API_BASE}/reports/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse<Report>(response);
}

export async function extractFromReport(reportId: string): Promise<ExtractionResult> {
  const response = await fetch(`${API_BASE}/reports/${reportId}/extract`, {
    method: 'POST',
  });
  return handleResponse<ExtractionResult>(response);
}

// Text extraction endpoint
export interface TextExtractionResponse {
  success: boolean;
  mode: 'live' | 'mock';
  filename: string;
  lab_items: LabItem[];
  patient_summary: string;
  raw_text: string;
  items_count: number;
  extraction_timestamp: string;
}

export interface LabItem {
  test_name: string;
  value: string;
  unit: string;
  reference_range_source: string;
  status: 'LOW' | 'NORMAL' | 'HIGH' | 'UNSPECIFIED';
  source_snippet: string;
}

export async function extractFromText(
  text: string,
  filename: string = 'document.txt',
  mode: 'live' | 'mock' = 'live'
): Promise<TextExtractionResponse> {
  const formData = new URLSearchParams({
    text: text,
    filename: filename,
    mode: mode,
  });

  const response = await fetch(`${API_BASE}/reports/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });
  return handleResponse<TextExtractionResponse>(response);
}

export async function deleteReport(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete report');
  }
}
