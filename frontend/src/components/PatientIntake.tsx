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
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-purple-50 text-purple-700 border-purple-200';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <h3 className="font-medium text-gray-900">{title}</h3>
        </div>
        <span className={`text-xs px-2 py-1 rounded border ${badgeClass}`}>
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
    <div className="flex items-start gap-3 py-1">
      <span className="text-sm text-gray-500 min-w-[100px] pt-1">{label}:</span>
      <div className="flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            <button
              onClick={handleSave}
              className="text-xs text-primary-600 hover:text-primary-700"
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">
              {value || <span className="text-gray-400 italic">Not provided</span>}
            </span>
            {editable && (
              <button
                onClick={() => setEditing(true)}
                className="text-gray-400 hover:text-gray-600"
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
