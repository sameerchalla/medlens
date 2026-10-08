// API Types for MedLens

export enum ProvenanceType {
  PATIENT_REPORTED = 'patient_reported',
  AI_EXTRACTED = 'ai_extracted',
  VERIFIED_BY_USER = 'verified_by_user',
}

export enum ReportType {
  LAB_REPORT = 'lab_report',
  BLOOD_WORK = 'blood_work',
  IMAGING = 'imaging',
  CLINICAL_NOTES = 'clinical_notes',
  INTAKE_FORM = 'intake_form',
  OTHER = 'other',
}

export interface ProvenanceValue {
  value: string | number | boolean;
  provenance: ProvenanceType;
  source_file?: string;
  extracted_at?: string;
}

export interface Report {
  id: string;
  filename: string;
  upload_date: string;
  document_type: ReportType;
  content?: string;
  extracted_fields?: Record<string, ProvenanceValue>;
}

export interface PatientRecord {
  id: string;
  patient_id?: string;
  name?: string;
  date_of_birth?: string;
  fields: Record<string, ProvenanceValue>;
  uploaded_reports: Report[];
  created_at: string;
  updated_at: string;
}

export interface ExtractionResult {
  fields: Record<string, ProvenanceValue>;
  reference_ranges: Record<string, string>;
  raw_text: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface ApiError {
  detail: string;
}

export interface PatientCreate {
  patient_id?: string;
  name?: string;
  date_of_birth?: string;
}

// Helper to determine value status based on reference range
export function getValueStatus(
  value: number,
  range: string | undefined
): 'low' | 'normal' | 'high' | 'no_reference' {
  if (!range) return 'no_reference';

  const parts = range.split('-');
  if (parts.length !== 2) return 'no_reference';

  const low = parseFloat(parts[0].trim());
  const high = parseFloat(parts[1].trim());

  if (isNaN(low) || isNaN(high)) return 'no_reference';

  if (value < low) return 'low';
  if (value > high) return 'high';
  return 'normal';
}
