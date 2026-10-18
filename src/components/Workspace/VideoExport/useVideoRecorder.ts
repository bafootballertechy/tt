import { useState, useRef, useEffect, useCallback } from 'react';
import type {
  ExportJobPayload,
  ExportOptions,
  ExportProgressPayload,
  ExportCompletePayload,
  SystemCapabilities
} from './exportTypes';
import { ExportController } from './exportController';
import { getExportCapabilities } from './exportCapabilities';

export interface UseVideoRecorderReturn {
  startExport: (job: ExportJobPayload) => Promise<void>;
  cancelExport: () => Promise<void>;
  isExporting: boolean;
  progress: ExportProgressPayload | null;
  error: string | null;
  capabilities: SystemCapabilities;
  completedResult: ExportCompletePayload | null;
  downloadUrl: string | null;
  resetState: () => void;
}

export function useVideoRecorder(): UseVideoRecorderReturn {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgressPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<ExportCompletePayload | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const controllerRef = useRef<ExportController | null>(null);
  const capabilities = useRef<SystemCapabilities>(getExportCapabilities()).current;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.dispose();
      }
    };
  }, []);

  const resetState = useCallback(() => {
    setIsExporting(false);
    setProgress(null);
    setError(null);
    setCompletedResult(null);
    if (controllerRef.current) {
      controllerRef.current.cleanupUrl();
    }
    setDownloadUrl(null);
  }, []);

  const cancelExport = useCallback(async () => {
    if (controllerRef.current) {
      await controllerRef.current.cancelExport();
    }
    setIsExporting(false);
    setProgress(prev => (prev ? { ...prev, status: 'Export cancelled' } : null));
  }, []);

  const startExport = useCallback(async (job: ExportJobPayload) => {
    resetState();
    setIsExporting(true);
    setError(null);

    if (!controllerRef.current) {
      controllerRef.current = new ExportController();
    }

    try {
      await controllerRef.current.startExport(job, {
        onProgress: prog => {
          setProgress(prog);
        },
        onComplete: (result, url) => {
          setCompletedResult(result);
          setDownloadUrl(url);
          setIsExporting(false);
          setProgress(prev =>
            prev
              ? {
                  ...prev,
                  percent: 100,
                  status: 'Export completed successfully!',
                  stage: 'done'
                }
              : null
          );
        },
        onError: err => {
          setError(err.message || 'Export failed.');
          setIsExporting(false);
        },
        onCancel: () => {
          setIsExporting(false);
          setProgress(prev =>
            prev ? { ...prev, status: 'Export cancelled.' } : null
          );
        }
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to start export.');
      setIsExporting(false);
    }
  }, [resetState]);

  return {
    startExport,
    cancelExport,
    isExporting,
    progress,
    error,
    capabilities,
    completedResult,
    downloadUrl,
    resetState
  };
}
