import './workerPolyfill';
import type { ExportWorkerRequest, ExportWorkerResponse } from './exportTypes';
import { runExportJob } from './media/encodePipeline';

let isCancelled = false;

self.onmessage = async (e: MessageEvent<ExportWorkerRequest>) => {
  const message = e.data;

  if (message.type === 'cancel') {
    isCancelled = true;
    self.postMessage({ type: 'cancelled' } satisfies ExportWorkerResponse);
    return;
  }

  if (message.type === 'start') {
    isCancelled = false;
    const { payload } = message;

    try {
      const result = await runExportJob({
        clips: payload.clips,
        options: payload.options,
        shouldAbort: () => isCancelled,
        onProgress: progress => {
          self.postMessage({
            type: 'progress',
            payload: progress
          } satisfies ExportWorkerResponse);
        }
      });

      if (isCancelled) {
        self.postMessage({ type: 'cancelled' } satisfies ExportWorkerResponse);
        return;
      }

      const safeTitle = payload.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'tacstem-export';
      const fileName = payload.options.customFileName || `${safeTitle}-${Date.now()}.mp4`;

      (self.postMessage as any)(
        {
          type: 'complete',
          payload: {
            mimeType: 'video/mp4',
            fileName,
            data: result.data,
            durationSeconds: result.durationSeconds,
            fileSizeBytes: result.fileSizeBytes,
            audioPreserved: result.audioPreserved,
            usedFastPath: result.usedFastPath,
            fastPathPercentage: result.fastPathPercentage,
            metrics: result.metrics
          }
        } satisfies ExportWorkerResponse,
        [result.data] // Transfer ArrayBuffer ownership with zero memory copy!
      );
    } catch (err: any) {
      if (isCancelled) {
        self.postMessage({ type: 'cancelled' } satisfies ExportWorkerResponse);
      } else {
        self.postMessage({
          type: 'error',
          payload: {
            message: err?.message || 'Video export encountered an error.',
            stack: err?.stack,
            recoverable: false
          }
        } satisfies ExportWorkerResponse);
      }
    }
  }
};
