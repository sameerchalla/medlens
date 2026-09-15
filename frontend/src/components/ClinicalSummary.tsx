/**
 * Clinical Summary Components
 *
 * AI-generated patient-friendly summary without diagnostic or treatment advice.
 * Includes correlation callouts for potential clinical observations.
 */

import { FileText, MessageSquare, Lightbulb, AlertCircle } from 'lucide-react';

interface ClinicalSummaryProps {
  summary: string;
  sourceFilename?: string;
}

export function ClinicalSummary({ summary, sourceFilename }: ClinicalSummaryProps) {
  if (!summary) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-visible break-inside-avoid print:overflow-visible">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400 dark:text-slate-300" />
          <h3 className="font-medium text-gray-900 dark:text-slate-100">AI Clinical Summary</h3>
        </div>
        <div className="p-8 text-center">
          <FileText className="w-12 h-12 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-300">No summary available</p>
          <p className="text-sm text-gray-400 dark:text-slate-300 mt-1">
            Process a document to generate an AI summary
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-visible break-inside-avoid print:overflow-visible">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400 dark:text-slate-300" />
          <h3 className="font-medium text-gray-900 dark:text-slate-100">AI Clinical Summary</h3>
        </div>
        {sourceFilename && (
          <span className="text-xs text-gray-500 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
            Generated from: {sourceFilename}
          </span>
        )}
      </div>
      <div className="p-4">
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed dark:text-slate-100 print:text-slate-900">
          {summary}
        </pre>
      </div>
      {/* Disclaimer Footer */}
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-100 dark:border-amber-900/50">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> This summary is for informational purposes only.
          Always consult qualified healthcare professionals for medical decisions.
        </p>
      </div>
    </div>
  );
}

interface CorrelationCalloutProps {
  correlations: Correlation[];
}

export interface Correlation {
  id: string;
  symptom: string;
  labFinding: string;
  observation: string;
  severity: 'info' | 'attention' | 'important';
}

function CorrelationCard({ correlation }: { correlation: Correlation }) {
  const styles = {
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border-blue-200 dark:border-blue-800/60',
      text: 'text-blue-900 dark:text-blue-200',
      icon: 'text-blue-900 dark:text-blue-200',
      iconBg: 'bg-blue-100 dark:bg-blue-950/60',
    },
    attention: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800/60',
      text: 'text-amber-900 dark:text-amber-200',
      icon: 'text-amber-900 dark:text-amber-200',
      iconBg: 'bg-amber-100 dark:bg-amber-950/60',
    },
    important: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800/60',
      text: 'text-red-900 dark:text-red-200',
      icon: 'text-red-900 dark:text-red-200',
      iconBg: 'bg-red-100 dark:bg-red-950/60',
    },
  };

  const style = styles[correlation.severity];

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-4 correlation-card`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.iconBg} ${style.icon}`}>
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-medium ${style.text} print:text-slate-900`}>{correlation.symptom}</span>
            <span className="text-gray-400 dark:text-slate-300">→</span>
            <span className={`font-medium ${style.text} print:text-slate-900`}>{correlation.labFinding}</span>
          </div>
          <p className={`text-sm ${style.text} print:text-slate-900`}>{correlation.observation}</p>
        </div>
      </div>
    </div>
  );
}

export function CorrelationCallout({ correlations }: CorrelationCalloutProps) {
  if (correlations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-gray-400 dark:text-slate-300" />
        <h3 className="font-medium text-gray-900 dark:text-slate-100">Potential Correlations</h3>
        <span className="text-xs text-gray-400 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
          {correlations.length}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {correlations.map((correlation) => (
          <CorrelationCard key={correlation.id} correlation={correlation} />
        ))}
      </div>
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <AlertCircle className="w-4 h-4 text-slate-400 dark:text-slate-300 flex-shrink-0 mt-0.5" />
          <p>
            These are observational correlations for discussion with a clinician.
            They do not constitute a diagnosis or treatment recommendation.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Detects potential correlations between symptoms and lab findings
 */
export function detectCorrelations(
  symptoms: string | undefined,
  labItems: Array<{ test_name: string; status: string; value: string; unit?: string }>
): Correlation[] {
  const correlations: Correlation[] = [];

  if (!symptoms) return correlations;

  const symptomsLower = symptoms.toLowerCase();
  const labMap = new Map(
    labItems.map((l) => [l.test_name.toLowerCase(), l])
  );

  // Fatigue + Low Hemoglobin
  if (
    symptomsLower.includes('fatigue') ||
    symptomsLower.includes('tired') ||
    symptomsLower.includes('low energy')
  ) {
    const hemoglobin = labMap.get('hemoglobin');
    if (hemoglobin?.status === 'LOW') {
      correlations.push({
        id: 'fatigue-anemia',
        symptom: 'Reported fatigue / low energy',
        labFinding: `Low Hemoglobin (${hemoglobin.value} ${hemoglobin.unit || ''})`.trim(),
        observation:
          'Reported fatigue coincides with a laboratory result below reference range. Observational correlation for clinical review.',
        severity: 'attention',
      });
    }
  }

  // Thirst + High Glucose
  if (
    symptomsLower.includes('thirst') ||
    symptomsLower.includes('polydipsia')
  ) {
    const glucose = labMap.get('fasting plasma glucose') ||
                    labMap.get('glucose');
    if (glucose?.status === 'HIGH') {
      correlations.push({
        id: 'thirst-glucose',
        symptom: 'Reported increased thirst',
        labFinding: `Elevated Glucose (${glucose.value} ${glucose.unit || ''})`.trim(),
        observation:
          'Reported increased thirst coincides with blood glucose above source reference range. Observational correlation for clinical review.',
        severity: 'attention',
      });
    }

    const hba1c = labMap.get('hemoglobin a1c') || labMap.get('hba1c');
    if (hba1c?.status === 'HIGH') {
      correlations.push({
        id: 'thirst-hba1c',
        symptom: 'Reported increased thirst',
        labFinding: `Elevated HbA1c (${hba1c.value} ${hba1c.unit || ''})`.trim(),
        observation:
          'Reported thirst coincides with elevated HbA1c in source report. Observational correlation for clinical review.',
        severity: 'attention',
      });
    }
  }

  // Frequent urination + High Glucose
  if (
    symptomsLower.includes('urination') ||
    symptomsLower.includes('urinary') ||
    symptomsLower.includes('polyuria') ||
    symptomsLower.includes('nighttime urination')
  ) {
    const glucose = labMap.get('fasting plasma glucose') ||
                    labMap.get('glucose');
    if (glucose?.status === 'HIGH') {
      correlations.push({
        id: 'polyuria-glucose',
        symptom: 'Reported frequent urination',
        labFinding: `Elevated Glucose (${glucose.value} ${glucose.unit || ''})`.trim(),
        observation:
          'Reported urinary frequency coincides with elevated glucose in source report. Observational correlation for clinical review.',
        severity: 'attention',
      });
    }
  }

  // Shortness of breath + Low Hemoglobin
  if (
    symptomsLower.includes('shortness of breath') ||
    symptomsLower.includes('dyspnea') ||
    symptomsLower.includes('breath')
  ) {
    const hemoglobin = labMap.get('hemoglobin');
    if (hemoglobin?.status === 'LOW') {
      correlations.push({
        id: 'sob-anemia',
        symptom: 'Reported shortness of breath',
        labFinding: `Low Hemoglobin (${hemoglobin.value} ${hemoglobin.unit || ''})`.trim(),
        observation:
          'Reported shortness of breath coincides with hemoglobin below source reference range. Observational correlation for clinical review.',
        severity: 'attention',
      });
    }
  }

  // Elevated WBC + Inflammation indicators
  const wbc = labMap.get('white blood cell count') || labMap.get('wbc') || labMap.get('total leukocyte count');
  const crp = labMap.get('c-reactive protein') || labMap.get('crp') || labMap.get('c-reactive protein (crp)');

  if (wbc?.status === 'HIGH' && crp?.status === 'HIGH') {
    correlations.push({
      id: 'inflammation',
      symptom: 'Concurrent lab findings',
      labFinding: `High WBC + High CRP`,
      observation:
        'Both leukocyte count and CRP exceed source document reference ranges. Observational correlation for clinical review.',
      severity: 'important',
    });
  }

  return correlations;
}
