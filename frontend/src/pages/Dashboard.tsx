/**
 * Dashboard Page - MedLens Clinical Information Dashboard
 *
 * Two-column layout with patient intake on the left and structured findings on the right.
 * Supports demo scenarios, document upload, and human-in-the-loop verification.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { XCircle } from 'lucide-react';
import { checkHealth } from '../lib/api';
import MedicalDisclaimer from '../components/MedicalDisclaimer';
import Header from '../components/Header';
import {
  PatientDemographics,
  ReportedSymptoms,
  Allergies,
  CurrentMedications,
} from '../components/PatientIntake';
import FileDropzone from '../components/FileDropzone';
import LabResultsTable, { LabItem } from '../components/LabResultsTable';
import {
  ClinicalSummary,
  CorrelationCallout,
  detectCorrelations,
  Correlation,
} from '../components/ClinicalSummary';
import {
  DEMO_SCENARIO_A_LABS,
  DEMO_SCENARIO_B_LABS,
  DEMO_SCENARIO_A_EXTRACTION,
  DEMO_SCENARIO_B_EXTRACTION,
  DEMO_SCENARIO_META,
} from '../lib/mockData';

type ApiStatus = 'loading' | 'connected' | 'disconnected';

interface ScenarioData {
  patient: {
    age?: number;
    sex?: string;
    symptoms?: string;
    allergies?: string;
    medications?: string;
  };
  labs: LabItem[];
  summary: string;
  sourceFilename: string;
}

/**
 * Generates a dynamic summary from lab items, including verification notes
 */
function generateDynamicSummary(labItems: LabItem[], baseSummary: string): string {
  // Find all verified items
  const verifiedItems = labItems.filter(item => item.verified && item.verified_by === 'user');

  if (verifiedItems.length === 0) {
    return baseSummary;
  }

  // Build verification notes
  const verificationNotes = verifiedItems.map(item => {
    const statusLabel = item.status !== 'UNSPECIFIED' ? `[${item.status}]` : '';
    return `• ${item.test_name}: ${item.value} ${item.unit} ${statusLabel} [Verified by User]`;
  }).join('\n');

  // Append verification notes to the summary
  return `${baseSummary}

========================================
VERIFIED BY USER
----------------------------------------
${verificationNotes}
`.trim();
}

export default function Dashboard() {
  // API Status
  const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  // Patient data
  const [patientData, setPatientData] = useState<{
    age?: number;
    sex?: string;
    symptoms?: string;
    allergies?: string;
    medications?: string;
  }>({});

  // Lab data
  const [labItems, setLabItems] = useState<LabItem[]>([]);
  const [baseSummary, setBaseSummary] = useState<string>('');
  const [sourceFilename, setSourceFilename] = useState<string>('');
  const [correlations, setCorrelations] = useState<Correlation[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate dynamic summary that includes verification notes
  const summary = useMemo(() => {
    return generateDynamicSummary(labItems, baseSummary);
  }, [labItems, baseSummary]);

  // Check API health
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        await checkHealth();
        setApiStatus('connected');
      } catch {
        setApiStatus('disconnected');
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  // Update correlations when symptoms or labs change
  useEffect(() => {
    const detected = detectCorrelations(patientData.symptoms, labItems);
    setCorrelations(detected);
  }, [patientData.symptoms, labItems]);

  // Load demo scenario
  const loadScenario = useCallback((scenario: 'A' | 'B') => {
    const meta = DEMO_SCENARIO_META[scenario];
    let data: ScenarioData;

    if (scenario === 'A') {
      data = {
        patient: {
          age: meta.age,
          sex: meta.sex,
          symptoms: 'Chronic fatigue, low energy, mild shortness of breath on stairs',
          allergies: 'Penicillin',
          medications: 'Lisinopril 10mg daily, Multivitamin',
        },
        labs: DEMO_SCENARIO_A_LABS.map((lab) => ({
          ...lab,
          provenance: 'ai_extracted' as const,
          source_file: lab.source_snippet.includes('CBC') ? 'CBC_Inflammatory_Report.pdf' : undefined,
        })),
        summary: DEMO_SCENARIO_A_EXTRACTION.patient_summary,
        sourceFilename: 'CBC_Inflammatory_Report.pdf',
      };
    } else {
      data = {
        patient: {
          age: meta.age,
          sex: meta.sex,
          symptoms: 'Increased thirst, frequent nighttime urination',
          allergies: 'None',
          medications: 'Metformin 500mg daily',
        },
        labs: DEMO_SCENARIO_B_LABS.map((lab) => ({
          ...lab,
          provenance: 'ai_extracted' as const,
          source_file: lab.source_snippet.includes('Metabolic') ? 'Metabolic_Panel_June.pdf' : undefined,
        })),
        summary: DEMO_SCENARIO_B_EXTRACTION.patient_summary,
        sourceFilename: 'Metabolic_Panel_June.pdf',
      };
    }

    setPatientData(data.patient);
    setLabItems(data.labs);
    setBaseSummary(data.summary);
    setSourceFilename(data.sourceFilename);
    setError(null);
  }, []);

  // Clear all data
  const clearData = useCallback(() => {
    setPatientData({});
    setLabItems([]);
    setBaseSummary('');
    setSourceFilename('');
    setCorrelations([]);
    setError(null);
  }, []);

  // Handle file extraction
  const handleExtract = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);

    try {
      // For demo purposes, use mock extraction
      // In production, this would call extractFromText(file content, file.name, 'live')
      setLabItems([
        {
          test_name: 'Glucose',
          value: '95',
          unit: 'mg/dL',
          reference_range_source: '70-100 mg/dL',
          status: 'NORMAL',
          source_snippet: `Glucose: 95 mg/dL (70-100 mg/dL)`,
          provenance: 'ai_extracted',
          source_file: file.name,
        },
      ]);
      setBaseSummary(`
LABORATORY RESULTS SUMMARY
========================================

Source: ${file.name}

Results Within Reference Range:
  • Glucose: 95 mg/dL
    Reference: 70-100 mg/dL

----------------------------------------

DISCLAIMER: This summary is for informational purposes only.
MedLens is a documentation tool and does not provide medical advice.
Always consult qualified healthcare professionals for medical decisions.
Do not make clinical decisions based solely on this tool.
      `.trim());
      setSourceFilename(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle lab item update (human verification)
  const handleLabUpdate = useCallback(
    (index: number, updated: LabItem) => {
      setLabItems((prev) =>
        prev.map((item, i) => (i === index ? updated : item))
      );
    },
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <MedicalDisclaimer />
      <Header apiStatus={apiStatus} />
      <main className="max-w-7xl mx-auto px-4 py-6 dark:text-slate-100">
          {/* Error Banner */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Scenario Buttons */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => loadScenario('A')}
              className="px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
            >
              Load Scenario A
            </button>
            <button
              onClick={() => loadScenario('B')}
              className="px-3 py-1.5 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/40 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
            >
              Load Scenario B
            </button>
            <button
              onClick={clearData}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            >
              Clear
            </button>
            <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">
              {apiStatus === 'connected' ? 'Backend Connected' : apiStatus === 'disconnected' ? 'Backend Offline' : 'Checking...'}
            </span>
          </div>

          {/* Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN - Intake & Source */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                Patient Intake & Source
              </h2>

              {/* Patient Demographics */}
              <PatientDemographics
                age={patientData.age}
                sex={patientData.sex}
                onUpdate={(data) =>
                  setPatientData((prev) => ({ ...prev, ...data }))
                }
              />

              {/* Reported Symptoms */}
              <ReportedSymptoms
                symptoms={patientData.symptoms}
                onUpdate={(symptoms) =>
                  setPatientData((prev) => ({ ...prev, symptoms }))
                }
              />

              {/* Allergies */}
              <Allergies
                allergies={patientData.allergies}
                onUpdate={(allergies) =>
                  setPatientData((prev) => ({ ...prev, allergies }))
                }
              />

              {/* Current Medications */}
              <CurrentMedications
                medications={patientData.medications}
                onUpdate={(medications) =>
                  setPatientData((prev) => ({ ...prev, medications }))
                }
              />

              {/* File Dropzone */}
              <FileDropzone
                onFileSelect={() => {}}
                onExtract={handleExtract}
                isProcessing={isProcessing}
              />
            </div>

            {/* RIGHT COLUMN - Structured Findings */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-300 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                Structured Findings & Verification
              </h2>

              {/* Lab Results Table */}
              <LabResultsTable
                items={labItems}
                onUpdate={handleLabUpdate}
                sourceFilename={sourceFilename}
              />

              {/* Correlation Callout */}
              {correlations.length > 0 && (
                <CorrelationCallout correlations={correlations} />
              )}

              {/* Clinical Summary */}
              <ClinicalSummary summary={summary} sourceFilename={sourceFilename} />
            </div>
          </div>
        </main>
    </div>
  );
}
