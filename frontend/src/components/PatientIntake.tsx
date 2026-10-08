/**
 * Patient Intake Card Components
 *
 * Displays patient demographics, symptoms, allergies, and medications
 * with provenance badges indicating the source of information.
 */

import { User, Stethoscope, AlertTriangle, Pill, Pencil } from 'lucide-react';
import { useState } from 'react';

interface IntakeCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  source: 'patient_reported' | 'ai_extracted';
  sourceFile?: string;
}

function IntakeCard({ title, icon, children, source, sourceFile }: IntakeCardProps) {
  const isPatientReported = source === 'patient_reported';
  const badgeClass = isPatientReported
    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-800'
    : 'bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-800';

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden intake-card">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 dark:text-slate-300">{icon}</span>
          <h3 className="font-medium text-gray-900 dark:text-slate-100">{title}</h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${badgeClass} intake-badge`}>
          {isPatientReported ? 'Patient Provided' : `AI Extracted • ${sourceFile || ''}`}
        </span>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

interface IntakeFieldProps {
  label: string;
  value: string | number | undefined;
  editable?: boolean;
  onEdit?: (value: string) => void;
}

function IntakeField({ label, value, editable, onEdit }: IntakeFieldProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || ''));

  const handleSave = () => {
    onEdit?.(editValue);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(String(value || ''));
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-sm text-gray-500 dark:text-slate-300 w-16 shrink-0 intake-label">{label}:</span>
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full min-w-[60px] max-w-[120px] px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleSave}
              className="px-2 py-1 text-xs font-medium bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 rounded border border-primary-200 dark:border-primary-800 transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-2 py-1 text-xs text-gray-500 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900 dark:text-slate-100 intake-value truncate">
              {value || <span className="text-gray-400 dark:text-slate-300 italic">Not provided</span>}
            </span>
            {editable && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="p-1 text-gray-400 dark:text-slate-300 hover:text-gray-600 dark:hover:text-slate-200 rounded"
                title={`Edit ${label}`}
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface PatientDemographicsProps {
  age?: number;
  sex?: string;
  onUpdate?: (data: { age?: number; sex?: string }) => void;
}

export function PatientDemographics({ age, sex, onUpdate }: PatientDemographicsProps) {
  return (
    <IntakeCard
      title="Patient Demographics"
      icon={<User className="w-4 h-4" />}
      source="patient_reported"
    >
      <div className="grid grid-cols-2 gap-4">
        <IntakeField
          label="Age"
          value={age ? `${age} years` : undefined}
          editable
          onEdit={(v) => onUpdate?.({ age: parseInt(v) || undefined })}
        />
        <IntakeField
          label="Sex"
          value={sex}
          editable
          onEdit={(v) => onUpdate?.({ sex: v })}
        />
      </div>
    </IntakeCard>
  );
}

interface ReportedSymptomsProps {
  symptoms?: string;
  onUpdate?: (symptoms: string) => void;
}

export function ReportedSymptoms({ symptoms, onUpdate }: ReportedSymptomsProps) {
  return (
    <IntakeCard
      title="Reported Symptoms"
      icon={<Stethoscope className="w-4 h-4" />}
      source="patient_reported"
    >
      <IntakeField
        label="Chief Complaint"
        value={symptoms}
        editable
        onEdit={onUpdate}
      />
    </IntakeCard>
  );
}

interface AllergiesProps {
  allergies?: string;
  onUpdate?: (allergies: string) => void;
}

export function Allergies({ allergies, onUpdate }: AllergiesProps) {
  return (
    <IntakeCard
      title="Allergies"
      icon={<AlertTriangle className="w-4 h-4" />}
      source="patient_reported"
    >
      <IntakeField
        label="Known Allergies"
        value={allergies}
        editable
        onEdit={onUpdate}
      />
    </IntakeCard>
  );
}

interface CurrentMedicationsProps {
  medications?: string;
  onUpdate?: (medications: string) => void;
}

export function CurrentMedications({ medications, onUpdate }: CurrentMedicationsProps) {
  return (
    <IntakeCard
      title="Current Medications"
      icon={<Pill className="w-4 h-4" />}
      source="patient_reported"
    >
      <IntakeField
        label="Active Meds"
        value={medications}
        editable
        onEdit={onUpdate}
      />
    </IntakeCard>
  );
}

export { IntakeCard, IntakeField };
