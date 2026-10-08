import { AlertTriangle } from 'lucide-react';

export default function MedicalDisclaimer() {
  return (
    <div className="disclaimer-banner flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold">Medical Disclaimer</p>
        <p>
          MedLens is for <strong>informational purposes only</strong>. Always consult qualified
          healthcare professionals for medical decisions. Do not make clinical decisions based
          solely on this tool.
        </p>
      </div>
    </div>
  );
}
