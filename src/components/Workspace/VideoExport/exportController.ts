import type {
  ExportJobPayload,
  ExportWorkerRequest,
  ExportWorkerResponse,
  ExportProgressPayload,
  ExportCompletePayload
} from './exportTypes';
import { getExportCapabilities } from './exportCapabilities';
import { runMainThreadMediabunnyExport } from './exportFallback';

export interface ExportControllerCallbacks {
  onProgress?: (progress: ExportProgressPayload) => void;
  onComplete?: (result: ExportCompletePayload, downloadUrl: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
}

export class ExportController {
  private worker: Worker | null = null;
  private isRunning: boolean = false;
  private isCancelled: boolean = false;
  private activeDownloadUrl: string | null = null;

  public get running(): boolean {
    return this.isRunning;
  }

  public async startExport(
    job: ExportJobPayload,
    callbacks: ExportControllerCallbacks
  ): Promise<void> {
    if (this.isRunning) {
      throw new Error('An export is already running.');
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.cleanupUrl();

    const capabilities = getExportCapabilities();

    // 1. Primary path: Dedicated Web Worker with WebCodecs & Mediabunny
    if (capabilities.canExportWithWorker) {
      try {
        await this.runWorkerExport(job, callbacks);
        return;
      } catch (err: any) {
        if (this.isCancelled) return;
        console.warn('Worker export failed, attempting main-thread fallback:', err);
      }
    }

    // 2. Secondary path: Main-thread Mediabunny export
    if (capabilities.supportsWebCodecs && capabilities.supportsOffscreenCanvas) {
      try {
        const result = await runMainThreadMediabunnyExport({
          job,
          onProgress: progress => callbacks.onProgress?.(progress),
          shouldAbort: () => this.isCancelled
        });

        if (this.isCancelled) {
          callbacks.onCancel?.();
          return;
        }

        const blob = new Blob([result.data], { type: result.mimeType });
        this.activeDownloadUrl = URL.createObjectURL(blob);
        this.triggerFileDownload(this.activeDownloadUrl, result.fileName);
        callbacks.onComplete?.(result, this.activeDownloadUrl);
        return;
      } catch (err: any) {
        if (this.isCancelled) return;
        callbacks.onError?.(err instanceof Error ? err : new Error(String(err)));
        return;
      } finally {
        this.isRunning = false;
      }
    }

    // 3. If neither is supported, throw so caller can invoke legacy MediaRecorder
    this.isRunning = false;
    throw new Error('WebCodecs is not supported in this browser. Please use the real-time recording fallback.');
  }

  private runWorkerExport(
    job: ExportJobPayload,
    callbacks: ExportControllerCallbacks
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(new URL('./export.worker.ts', import.meta.url), {
          type: 'module'
        });

        this.worker.onmessage = (e: MessageEvent<ExportWorkerResponse>) => {
          const res = e.data;

          switch (res.type) {
            case 'progress': {
              callbacks.onProgress?.(res.payload);
              break;
            }

            case 'complete': {
              this.isRunning = false;
              const blob = new Blob([res.payload.data], { type: res.payload.mimeType });
              this.activeDownloadUrl = URL.createObjectURL(blob);
              this.triggerFileDownload(this.activeDownloadUrl, res.payload.fileName);
              callbacks.onComplete?.(res.payload, this.activeDownloadUrl);
              this.cleanupWorker();
              resolve();
              break;
            }

            case 'error': {
              this.isRunning = false;
              this.cleanupWorker();
              const error = new Error(res.payload.message);
              callbacks.onError?.(error);
              reject(error);
              break;
            }

            case 'cancelled': {
              this.isRunning = false;
              this.cleanupWorker();
              callbacks.onCancel?.();
              resolve();
              break;
            }
          }
        };

        this.worker.onerror = (err: ErrorEvent) => {
          this.isRunning = false;
          this.cleanupWorker();
          const error = new Error(err.message || 'Worker thread execution error.');
          callbacks.onError?.(error);
          reject(error);
        };

        const req: ExportWorkerRequest = {
          type: 'start',
          payload: job
        };

        this.worker.postMessage(req);
      } catch (err) {
        this.cleanupWorker();
        this.isRunning = false;
        reject(err);
      }
    });
  }

  public async cancelExport(): Promise<void> {
    if (!this.isRunning) return;
    this.isCancelled = true;

    if (this.worker) {
      try {
        const cancelReq: ExportWorkerRequest = { type: 'cancel' };
        this.worker.postMessage(cancelReq);
      } catch {
        // ignore
      }

      // Hard terminate after 1 second if graceful cancellation hasn't completed
      setTimeout(() => {
        if (this.worker) {
          this.cleanupWorker();
          this.isRunning = false;
        }
      }, 1000);
    } else {
      this.isRunning = false;
    }
  }

  private triggerFileDownload(url: string, fileName: string): void {
    if (typeof document === 'undefined') return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private cleanupWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public cleanupUrl(): void {
    if (this.activeDownloadUrl) {
      URL.revokeObjectURL(this.activeDownloadUrl);
      this.activeDownloadUrl = null;
    }
  }

  public dispose(): void {
    this.cancelExport();
    this.cleanupWorker();
    this.cleanupUrl();
  }
}
