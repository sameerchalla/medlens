/**
 * Mock Data for Demo Scenarios
 *
 * Provides deterministic, realistic patient data for demonstrations.
 * All lab values are based on realistic clinical scenarios.
 *
 * IMPORTANT: This data is for demonstration purposes only.
 * MedLens is for informational purposes only. Always consult qualified
 * healthcare professionals for medical decisions.
 */

import { ProvenanceType, ReportType, PatientRecord, Report } from '../types';

// =============================================================================
// LAB STATUS TYPES
// =============================================================================

export type LabStatus = 'LOW' | 'NORMAL' | 'HIGH' | 'UNSPECIFIED';

export interface LabItem {
  test_name: string;
  value: string;
  unit: string;
  reference_range_source: string;
  status: LabStatus;
  source_snippet: string;
}

export interface DemoExtractionResult {
  lab_items: LabItem[];
  patient_summary: string;
  source_filename: string;
}

// =============================================================================
// DEMO SCENARIO A: 52-year-old Female - Anemia & Inflammation
// =============================================================================

const DEMO_SCENARIO_A_REPORT: Report = {
  id: 'demo-report-a-001',
  filename: 'CBC_Inflammatory_Report.pdf',
  upload_date: new Date().toISOString(),
  document_type: ReportType.BLOOD_WORK,
  content: `
    Complete Blood Count (CBC) with Differential

    Patient: Demo Patient A
    Age/Sex: 52 year old / Female
    Collection Date: Current

    RESULTS:
    Hemoglobin: 9.4 g/dL (Reference: 12.0 - 15.5 g/dL)
    White Blood Cell Count (WBC): 11.8 x10^3/uL (Reference: 4.5 - 11.0 x10^3/uL)
    Platelets: 245 x10^3/uL (Reference: 150 - 450 x10^3/uL)
    Ferritin: 14 ng/mL (Reference: Not specified in this report)
    C-Reactive Protein (CRP): 8.2 mg/L (Reference: < 3.0 mg/L)

    Interpretation: Mild anemia with elevated inflammatory markers.
    Clinical correlation recommended.
  `,
  extracted_fields: {
    Hemoglobin: {
      value: 9.4,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'CBC_Inflammatory_Report.pdf',
      extracted_at: new Date().toISOString(),
    },
    WBC: {
      value: 11.8,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'CBC_Inflammatory_Report.pdf',
      extracted_at: new Date().toISOString(),
    },
    Platelets: {
      value: 245,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'CBC_Inflammatory_Report.pdf',
      extracted_at: new Date().toISOString(),
    },
    Ferritin: {
      value: 14,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'CBC_Inflammatory_Report.pdf',
      extracted_at: new Date().toISOString(),
    },
    CRP: {
      value: 8.2,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'CBC_Inflammatory_Report.pdf',
      extracted_at: new Date().toISOString(),
    },
  },
};

export const DEMO_SCENARIO_A: PatientRecord = {
  id: 'demo-patient-a-001',
  patient_id: 'DEMO-A-52F',
  name: 'Demo Patient A',
  date_of_birth: new Date(Date.now() - 52 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  fields: {
    // Patient-reported demographics
    age: {
      value: 52,
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    sex: {
      value: 'Female',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // Patient-reported symptoms
    chief_complaint: {
      value: 'Chronic fatigue, low energy, mild shortness of breath on stairs',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // Patient-reported allergies
    allergies: {
      value: 'Penicillin',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // Patient-reported medications
    current_medications: {
      value: 'Lisinopril 10mg daily, Multivitamin',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // AI-extracted lab values (see extracted_fields in report)
    diagnosis_notes: {
      value: 'Mild anemia with elevated inflammatory markers',
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'CBC_Inflammatory_Report.pdf',
      extracted_at: new Date().toISOString(),
    },
  },
  uploaded_reports: [DEMO_SCENARIO_A_REPORT],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Lab items for DEMO_SCENARIO_A (extracted from CBC_Inflammatory_Report.pdf)
export const DEMO_SCENARIO_A_LABS: LabItem[] = [
  {
    test_name: 'Hemoglobin',
    value: '9.4',
    unit: 'g/dL',
    reference_range_source: '12.0 - 15.5 g/dL',
    status: 'LOW',
    source_snippet: 'Hemoglobin: 9.4 g/dL (Reference: 12.0 - 15.5 g/dL)',
  },
  {
    test_name: 'White Blood Cell Count',
    value: '11.8',
    unit: 'x10^3/uL',
    reference_range_source: '4.5 - 11.0 x10^3/uL',
    status: 'HIGH',
    source_snippet: 'White Blood Cell Count (WBC): 11.8 x10^3/uL (Reference: 4.5 - 11.0 x10^3/uL)',
  },
  {
    test_name: 'Platelets',
    value: '245',
    unit: 'x10^3/uL',
    reference_range_source: '150 - 450 x10^3/uL',
    status: 'NORMAL',
    source_snippet: 'Platelets: 245 x10^3/uL (Reference: 150 - 450 x10^3/uL)',
  },
  {
    test_name: 'Ferritin',
    value: '14',
    unit: 'ng/mL',
    reference_range_source: '', // No reference provided in source
    status: 'UNSPECIFIED',
    source_snippet: 'Ferritin: 14 ng/mL (Reference: Not specified in this report)',
  },
  {
    test_name: 'C-Reactive Protein (CRP)',
    value: '8.2',
    unit: 'mg/L',
    reference_range_source: '< 3.0 mg/L',
    status: 'HIGH',
    source_snippet: 'C-Reactive Protein (CRP): 8.2 mg/L (Reference: < 3.0 mg/L)',
  },
];

export const DEMO_SCENARIO_A_EXTRACTION: DemoExtractionResult = {
  lab_items: DEMO_SCENARIO_A_LABS,
  source_filename: 'CBC_Inflammatory_Report.pdf',
  patient_summary: `
LABORATORY RESULTS SUMMARY
========================================

Source: CBC_Inflammatory_Report.pdf

Results Within Reference Range:
  • Platelets: 245 x10^3/uL
    Reference: 150 - 450 x10^3/uL

Results Outside Reference Range:
  • Hemoglobin: 9.4 g/dL [LOW]
    Reference: 12.0 - 15.5 g/dL
  • White Blood Cell Count: 11.8 x10^3/uL [HIGH]
    Reference: 4.5 - 11.0 x10^3/uL
  • C-Reactive Protein (CRP): 8.2 mg/L [HIGH]
    Reference: < 3.0 mg/L

Results (No Reference Range in Source Document):
  • Ferritin: 14 ng/mL
    Note: No reference range was provided in the source document.

----------------------------------------

DISCLAIMER: This summary is generated for informational purposes only.
MedLens is a documentation tool and does not provide medical advice.
Always consult qualified healthcare professionals for medical decisions.
Do not make clinical decisions based solely on this tool.
`.trim(),
};

// =============================================================================
// DEMO SCENARIO B: 46-year-old Male - Metabolic / Endocrinology
// =============================================================================

const DEMO_SCENARIO_B_REPORT: Report = {
  id: 'demo-report-b-002',
  filename: 'Metabolic_Panel_June.pdf',
  upload_date: new Date().toISOString(),
  document_type: ReportType.LAB_REPORT,
  content: `
    Comprehensive Metabolic Panel

    Patient: Demo Patient B
    Age/Sex: 46 year old / Male
    Collection Date: Current
    Fasting Status: Fasting (10-12 hours)

    RESULTS:
    Fasting Plasma Glucose: 142 mg/dL (Reference: 70 - 99 mg/dL)
    Hemoglobin A1c (HbA1c): 7.1 % (Reference: < 5.7 %)
    Total Cholesterol: 185 mg/dL (Reference: < 200 mg/dL)
    Triglycerides: 210 mg/dL (Reference: < 150 mg/dL)
    Estimated GFR: 95 mL/min/1.73m2 (Reference: > 60 mL/min/1.73m2)

    Interpretation: Elevated fasting glucose and HbA1c consistent with
    diabetes/prediabetes. Elevated triglycerides. Normal kidney function.
  `,
  extracted_fields: {
    Fasting_Glucose: {
      value: 142,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'Metabolic_Panel_June.pdf',
      extracted_at: new Date().toISOString(),
    },
    HbA1c: {
      value: 7.1,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'Metabolic_Panel_June.pdf',
      extracted_at: new Date().toISOString(),
    },
    Total_Cholesterol: {
      value: 185,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'Metabolic_Panel_June.pdf',
      extracted_at: new Date().toISOString(),
    },
    Triglycerides: {
      value: 210,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'Metabolic_Panel_June.pdf',
      extracted_at: new Date().toISOString(),
    },
    eGFR: {
      value: 95,
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'Metabolic_Panel_June.pdf',
      extracted_at: new Date().toISOString(),
    },
  },
};

export const DEMO_SCENARIO_B: PatientRecord = {
  id: 'demo-patient-b-002',
  patient_id: 'DEMO-B-46M',
  name: 'Demo Patient B',
  date_of_birth: new Date(Date.now() - 46 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  fields: {
    // Patient-reported demographics
    age: {
      value: 46,
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    sex: {
      value: 'Male',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // Patient-reported symptoms
    chief_complaint: {
      value: 'Increased thirst, frequent nighttime urination',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // Patient-reported allergies
    allergies: {
      value: 'None',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // Patient-reported medications
    current_medications: {
      value: 'Metformin 500mg daily',
      provenance: ProvenanceType.PATIENT_REPORTED,
    },
    // AI-extracted interpretation
    diagnosis_notes: {
      value: 'Elevated fasting glucose and HbA1c consistent with diabetes/prediabetes. Elevated triglycerides. Normal kidney function.',
      provenance: ProvenanceType.AI_EXTRACTED,
      source_file: 'Metabolic_Panel_June.pdf',
      extracted_at: new Date().toISOString(),
    },
  },
  uploaded_reports: [DEMO_SCENARIO_B_REPORT],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Lab items for DEMO_SCENARIO_B (extracted from Metabolic_Panel_June.pdf)
export const DEMO_SCENARIO_B_LABS: LabItem[] = [
  {
    test_name: 'Fasting Plasma Glucose',
    value: '142',
    unit: 'mg/dL',
    reference_range_source: '70 - 99 mg/dL',
    status: 'HIGH',
    source_snippet: 'Fasting Plasma Glucose: 142 mg/dL (Reference: 70 - 99 mg/dL)',
  },
  {
    test_name: 'Hemoglobin A1c (HbA1c)',
    value: '7.1',
    unit: '%',
    reference_range_source: '< 5.7 %',
    status: 'HIGH',
    source_snippet: 'Hemoglobin A1c (HbA1c): 7.1 % (Reference: < 5.7 %)',
  },
  {
    test_name: 'Total Cholesterol',
    value: '185',
    unit: 'mg/dL',
    reference_range_source: '< 200 mg/dL',
    status: 'NORMAL',
    source_snippet: 'Total Cholesterol: 185 mg/dL (Reference: < 200 mg/dL)',
  },
  {
    test_name: 'Triglycerides',
    value: '210',
    unit: 'mg/dL',
    reference_range_source: '< 150 mg/dL',
    status: 'HIGH',
    source_snippet: 'Triglycerides: 210 mg/dL (Reference: < 150 mg/dL)',
  },
  {
    test_name: 'Estimated GFR',
    value: '95',
    unit: 'mL/min/1.73m2',
    reference_range_source: '> 60 mL/min/1.73m2',
    status: 'NORMAL',
    source_snippet: 'Estimated GFR: 95 mL/min/1.73m2 (Reference: > 60 mL/min/1.73m2)',
  },
];

export const DEMO_SCENARIO_B_EXTRACTION: DemoExtractionResult = {
  lab_items: DEMO_SCENARIO_B_LABS,
  source_filename: 'Metabolic_Panel_June.pdf',
  patient_summary: `
LABORATORY RESULTS SUMMARY
========================================

Source: Metabolic_Panel_June.pdf

Results Within Reference Range:
  • Total Cholesterol: 185 mg/dL
    Reference: < 200 mg/dL
  • Estimated GFR: 95 mL/min/1.73m2
    Reference: > 60 mL/min/1.73m2

Results Outside Reference Range:
  • Fasting Plasma Glucose: 142 mg/dL [HIGH]
    Reference: 70 - 99 mg/dL
  • Hemoglobin A1c (HbA1c): 7.1 % [HIGH]
    Reference: < 5.7 %
  • Triglycerides: 210 mg/dL [HIGH]
    Reference: < 150 mg/dL

----------------------------------------

DISCLAIMER: This summary is generated for informational purposes only.
MedLens is a documentation tool and does not provide medical advice.
Always consult qualified healthcare professionals for medical decisions.
Do not make clinical decisions based solely on this tool.
`.trim(),
};

// =============================================================================
// CONVENIENCE EXPORTS
// =============================================================================

/**
 * All demo scenarios for easy iteration
 */
export const DEMO_SCENARIOS = [DEMO_SCENARIO_A, DEMO_SCENARIO_B] as const;

/**
 * Demo scenario metadata for UI display
 */
export const DEMO_SCENARIO_META = {
  A: {
    title: 'Anemia & Inflammation',
    description: '52-year-old female presenting with chronic fatigue',
    age: 52,
    sex: 'Female',
    filename: 'CBC_Inflammatory_Report.pdf',
  },
  B: {
    title: 'Metabolic / Endocrinology',
    description: '46-year-old male with elevated glucose concerns',
    age: 46,
    sex: 'Male',
    filename: 'Metabolic_Panel_June.pdf',
  },
} as const;
