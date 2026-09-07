/**
 * File Dropzone Component
 *
 * Supports drag-and-drop and click-to-upload for clinical documents.
 * Accepts .pdf, .txt, and .csv files.
 */

import { useState, useCallback } from 'react';
import { Upload, File, X, Loader2 } from 'lucide-react';

interface FileDropzoneProps {
  onFileSelect: (file: File) => void;
  onExtract: (file: File) => Promise<void>;
  isProcessing?: boolean;
  acceptedTypes?: string[];
  maxSizeMB?: number;
}

const DEFAULT_ACCEPTED = ['.pdf', '.txt', '.csv'];
const DEFAULT_MAX_SIZE = 10; // MB

export default function FileDropzone({
  onFileSelect,
  onExtract,
  isProcessing = false,
  acceptedTypes = DEFAULT_ACCEPTED,
  maxSizeMB = DEFAULT_MAX_SIZE,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!acceptedTypes.includes(ext)) {
      return `Invalid file type. Accepted: ${acceptedTypes.join(', ')}`;
    }

    // Check size
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum size: ${maxSizeMB}MB`;
    }

    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        return;
      }

      setSelectedFile(file);
      onFileSelect(file);
    },
    [onFileSelect, acceptedTypes, maxSizeMB]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setError(null);
  }, []);

  const handleExtract = async () => {
    if (!selectedFile) return;
    try {
      await onExtract(selectedFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-gray-400" />
          <h3 className="font-medium text-gray-900">Source Document</h3>
        </div>
        <span className="text-xs text-gray-400">
          Accepted: {acceptedTypes.join(', ')}
        </span>
      </div>

      <div className="p-4">
        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
            ${selectedFile ? 'border-green-400 bg-green-50' : ''}
          `}
        >
          <input
            type="file"
            onChange={handleInputChange}
            accept={acceptedTypes.join(',')}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <File className="w-8 h-8 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {!isProcessing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear();
                  }}
                  className="ml-4 text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          ) : (
            <div>
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                Drag and drop your document here
              </p>
              <p className="text-sm text-gray-400 mt-1">
                or click to browse
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
            <X className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Process Button */}
        <div className="mt-4">
          <button
            onClick={handleExtract}
            disabled={!selectedFile || isProcessing}
            className={`
              w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors
              ${
                selectedFile && !isProcessing
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Process Document
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            Extracts lab values and generates summary
          </p>
        </div>
      </div>
    </div>
  );
}
