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
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
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
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden">
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
        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed dark:text-slate-100">
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
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      iconBg: 'bg-blue-100',
    },
    attention: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-500',
      iconBg: 'bg-amber-100',
    },
    important: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      iconBg: 'bg-red-100',
    },
  };

  const style = styles[correlation.severity];

  return (
    <div className={`${style.bg} border ${style.border} dark:border-slate-700 rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${style.iconBg} ${style.icon}`}>
          <Lightbulb className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-slate-100">{correlation.symptom}</span>
            <span className="text-gray-400 dark:text-slate-300">→</span>
            <span className="font-medium text-gray-900 dark:text-slate-100">{correlation.labFinding}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-slate-300">{correlation.observation}</p>
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
  labItems: Array<{ test_name: string; status: string; value: string }>
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
        symptom: 'Fatigue symptoms',
        labFinding: `Low Hemoglobin (${hemoglobin.value})`,
        observation:
          'Low hemoglobin may contribute to fatigue. Consider evaluating for anemia.',
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
        symptom: 'Increased thirst',
        labFinding: `Elevated Glucose (${glucose.value})`,
        observation:
          'Elevated fasting glucose may be consistent with reported thirst. Consider diabetes evaluation.',
        severity: 'attention',
      });
    }

    const hba1c = labMap.get('hemoglobin a1c') || labMap.get('hba1c');
    if (hba1c?.status === 'HIGH') {
      correlations.push({
        id: 'thirst-hba1c',
        symptom: 'Increased thirst',
        labFinding: `Elevated HbA1c (${hba1c.value})`,
        observation:
          'Elevated HbA1c suggests average blood sugar over past 3 months.',
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
        symptom: 'Frequent urination',
        labFinding: `Elevated Glucose (${glucose.value})`,
        observation:
          'Elevated glucose can cause increased urination. May indicate need for glycemic control.',
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
        symptom: 'Shortness of breath',
        labFinding: `Low Hemoglobin (${hemoglobin.value})`,
        observation:
          'Low hemoglobin (anemia) can cause shortness of breath. Evaluate for underlying cause.',
        severity: 'attention',
      });
    }
  }

  // Elevated WBC + Inflammation indicators
  const wbc = labMap.get('white blood cell count') || labMap.get('wbc');
  const crp = labMap.get('c-reactive protein') || labMap.get('crp');

  if (wbc?.status === 'HIGH' && crp?.status === 'HIGH') {
    correlations.push({
      id: 'inflammation',
      symptom: 'Signs of inflammation',
      labFinding: `High WBC + High CRP`,
      observation:
        'Both elevated white blood cells and CRP suggest active inflammation. Clinical correlation recommended.',
      severity: 'important',
    });
  }

  return correlations;
}
