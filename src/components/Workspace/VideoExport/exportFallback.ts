import type { ExportJobPayload, ExportProgressPayload, ExportCompletePayload } from './exportTypes';
import { runExportJob } from './media/encodePipeline';

export interface FallbackExportOptions {
  job: ExportJobPayload;
  onProgress: (progress: ExportProgressPayload) => void;
  shouldAbort: () => boolean;
}

/**
 * Runs export directly on the main thread (used when Web Workers are unavailable or restricted).
 */
export async function runMainThreadMediabunnyExport(
  options: FallbackExportOptions
): Promise<ExportCompletePayload> {
  const { job, onProgress, shouldAbort } = options;

  const result = await runExportJob({
    clips: job.clips,
    options: job.options,
    onProgress,
    shouldAbort
  });

  const safeTitle = job.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'tacstem-export';
  const fileName = job.options.customFileName || `${safeTitle}-${Date.now()}.mp4`;

  return {
    mimeType: 'video/mp4',
    fileName,
    data: result.data,
    durationSeconds: result.durationSeconds,
    fileSizeBytes: result.fileSizeBytes,
    audioPreserved: result.audioPreserved,
    usedFastPath: result.usedFastPath,
    fastPathPercentage: result.fastPathPercentage,
    metrics: result.metrics
  };
}
