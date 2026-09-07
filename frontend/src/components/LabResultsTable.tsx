/**
 * Lab Results Table Component
 *
 * Displays extracted lab values with status badges and inline editing.
 * Supports human-in-the-loop verification workflow.
 */

import { useState } from 'react';
import { Pencil, Check, X, Beaker } from 'lucide-react';

export type LabStatus = 'LOW' | 'NORMAL' | 'HIGH' | 'UNSPECIFIED';

/**
 * Parses a reference range string and calculates status based on value
 * Supports formats like: "12.0 - 15.5 g/dL", "4.5 - 11.0 x10^3/uL", "< 3.0 mg/L", "> 100 mg/dL"
 */
export function calculateStatus(value: string, referenceRange: string): LabStatus {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'UNSPECIFIED';

  // Handle "< X" format (e.g., "< 3.0 mg/L" means HIGH if above X)
  const lessThanMatch = referenceRange.match(/^<\s*([\d.]+)/);
  if (lessThanMatch) {
    const max = parseFloat(lessThanMatch[1]);
    if (numValue > max) return 'HIGH';
    return 'NORMAL';
  }

  // Handle "> X" format (e.g., "> 100 mg/dL" means LOW if below X)
  const greaterThanMatch = referenceRange.match(/^>\s*([\d.]+)/);
  if (greaterThanMatch) {
    const min = parseFloat(greaterThanMatch[1]);
    if (numValue < min) return 'LOW';
    return 'NORMAL';
  }

  // Handle "X - Y" format (e.g., "12.0 - 15.5 g/dL")
  const rangeMatch = referenceRange.match(/^([\d.]+)\s*-\s*([\d.]+)/);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    if (numValue < min) return 'LOW';
    if (numValue > max) return 'HIGH';
    return 'NORMAL';
  }

  return 'UNSPECIFIED';
}

export interface LabItem {
  test_name: string;
  value: string;
  unit: string;
  reference_range_source: string;
  status: LabStatus;
  source_snippet: string;
  provenance?: 'patient_reported' | 'ai_extracted';
  source_file?: string;
  verified?: boolean;
  verified_by?: 'user';
}

interface LabResultsTableProps {
  items: LabItem[];
  onUpdate?: (index: number, updated: LabItem) => void;
  sourceFilename?: string;
}

function StatusBadge({ status }: { status: LabStatus }) {
  const styles: Record<LabStatus, { bg: string; text: string; dot: string }> = {
    LOW: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
    NORMAL: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
    HIGH: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
    UNSPECIFIED: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  };

  const style = styles[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text} print:inline-block`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

function ProvenanceTag({ item }: { item: LabItem }) {
  if (item.verified && item.verified_by === 'user') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 print:inline-block">
        <Check className="w-3 h-3" />
        Verified by User
      </span>
    );
  }

  if (item.provenance === 'patient_reported') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded print:inline-block">
        Patient Reported
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded print:inline-block">
      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
      AI Extracted
      {item.source_file && (
        <span className="text-purple-500 ml-1 print:inline-block">• {item.source_file}</span>
      )}
    </span>
  );
}

interface EditableRowProps {
  item: LabItem;
  index: number;
  onSave: (index: number, updated: LabItem) => void;
  onCancel: () => void;
}

function EditableRow({ item, index, onSave, onCancel }: EditableRowProps) {
  const [editValue, setEditValue] = useState(item.value);
  const [editRange, setEditRange] = useState(item.reference_range_source);

  // Calculate status dynamically based on edited value and range
  const calculatedStatus = calculateStatus(editValue, editRange);

  const handleSave = () => {
    const newStatus = calculateStatus(editValue, editRange);
    const updated: LabItem = {
      ...item,
      value: editValue,
      reference_range_source: editRange,
      status: newStatus,
      verified: true,
      verified_by: 'user',
      provenance: 'patient_reported',
    };
    onSave(index, updated);
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 bg-amber-50/30">
      <td className="min-w-[160px] px-4 py-3 font-medium text-gray-900 print:table-cell">{item.test_name}</td>
      <td className="min-w-[100px] px-4 py-3 print:table-cell">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-24 px-2 py-1 text-sm border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
          autoFocus
        />
      </td>
      <td className="min-w-[80px] px-4 py-3 text-sm text-gray-500 print:table-cell">{item.unit}</td>
      <td className="min-w-[160px] px-4 py-3 print:table-cell">
        <input
          type="text"
          value={editRange}
          onChange={(e) => setEditRange(e.target.value)}
          className="w-36 px-2 py-1 text-sm border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono"
          placeholder="e.g., 70-100"
        />
      </td>
      <td className="min-w-[100px] px-4 py-3 print:table-cell">
        <StatusBadge status={calculatedStatus} />
      </td>
      <td className="min-w-[140px] px-4 py-3 print:table-cell">
        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded border border-amber-200 print:inline-block">
          <Pencil className="w-3 h-3" />
          Editing...
        </span>
      </td>
      <td className="min-w-[80px] px-4 py-3 print:table-cell">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onCancel}
            className="p-1 text-red-500 hover:bg-red-50 rounded"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function LabResultsTable({
  items,
  onUpdate,
  sourceFilename,
}: LabResultsTableProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [localItems, setLocalItems] = useState<LabItem[]>(items);

  // Sync with props
  if (JSON.stringify(items) !== JSON.stringify(localItems) && editingIndex === null) {
    setLocalItems(items);
  }

  const handleSave = (index: number, updated: LabItem) => {
    setLocalItems((prev) => prev.map((item, i) => (i === index ? updated : item)));
    onUpdate?.(index, updated);
    setEditingIndex(null);
  };

  const handleCancel = () => {
    setEditingIndex(null);
  };

  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
  };

  if (localItems.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Beaker className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-900">Lab Results</h3>
        </div>
        <div className="p-8 text-center">
          <Beaker className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No lab results yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Upload a document or load a demo scenario to see results
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Beaker className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-900">Lab Results</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {localItems.length} items
          </span>
        </div>
        {sourceFilename && (
          <span className="text-xs text-gray-500">
            Source: {sourceFilename}
          </span>
        )}
      </div>

      <div className="overflow-x-auto print-table-container print:hidden">
        <table className="w-full min-w-[900px] print-table">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="min-w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Test Name
              </th>
              <th className="min-w-[100px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Value
              </th>
              <th className="min-w-[80px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Unit
              </th>
              <th className="min-w-[160px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Reference Range
              </th>
              <th className="min-w-[100px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Status
              </th>
              <th className="min-w-[140px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Provenance
              </th>
              <th className="min-w-[80px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider print:table-cell">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {localItems.map((item, index) =>
              editingIndex === index ? (
                <EditableRow
                  key={`edit-${index}`}
                  item={item}
                  index={index}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              ) : (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="min-w-[160px] px-4 py-3 font-medium text-gray-900 whitespace-nowrap print:table-cell">
                    {item.test_name}
                  </td>
                  <td className="min-w-[100px] px-4 py-3 font-mono text-sm font-medium text-gray-900 print:table-cell">
                    {item.value}
                  </td>
                  <td className="min-w-[80px] px-4 py-3 text-sm text-gray-500 print:table-cell">{item.unit}</td>
                  <td className="min-w-[160px] px-4 py-3 font-mono text-sm text-gray-600 print:table-cell">
                    {item.reference_range_source || (
                      <span className="text-gray-400 italic print:inline-block">No reference</span>
                    )}
                  </td>
                  <td className="min-w-[100px] px-4 py-3 print:table-cell">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="min-w-[140px] px-4 py-3 print:table-cell">
                    <ProvenanceTag item={item} />
                  </td>
                  <td className="min-w-[80px] px-4 py-3 print:table-cell">
                    <button
                      onClick={() => handleStartEdit(index)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                      title="Edit value"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Print-only view: clean, standard table layout for @media print */}
      <div className="hidden print:block mt-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b-2 border-slate-400">
              <th className="py-1 px-2 font-semibold">Test Name</th>
              <th className="py-1 px-2 font-semibold">Value / Unit</th>
              <th className="py-1 px-2 font-semibold">Reference Range</th>
              <th className="py-1 px-2 font-semibold">Status</th>
              <th className="py-1 px-2 font-semibold">Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {localItems.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1.5 px-2 font-medium text-slate-900">{item.test_name}</td>
                <td className="py-1.5 px-2 text-slate-800">{item.value} {item.unit}</td>
                <td className="py-1.5 px-2 text-slate-600">{item.reference_range_source || "No reference provided"}</td>
                <td className="py-1.5 px-2 font-semibold">
                  <span className={
                    item.status === 'HIGH' ? 'text-red-600 font-bold' :
                    item.status === 'LOW' ? 'text-amber-600 font-bold' :
                    item.status === 'NORMAL' ? 'text-emerald-600 font-bold' : 'text-slate-500'
                  }>
                    {item.status}
                  </span>
                </td>
                <td className="py-1.5 px-2 text-slate-500 text-[10px]">
                  {item.verified && item.verified_by === 'user' ? "Verified by User" : "AI Extracted"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export { StatusBadge, ProvenanceTag };
