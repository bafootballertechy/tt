import { BlobSource, Input, BufferTarget, Output, Mp4OutputFormat, Conversion } from 'mediabunny';

let offscreenCanvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let recordedChunks: Uint8Array[] = [];
let frameCount = 0;
let workerMediaRecorder: any = null;

/**
 * Resolves optimal MediaRecorder mimeType.
 * Explicitly requests 'video/mp4' as the primary mimeType, and includes
 * fallback checks for 'video/webm;codecs=vp9' and 'video/webm;codecs=vp8'
 * if MP4 is not supported by the browser, ensuring consistent cross-platform compatibility.
 */
export function resolveOptimalMimeType(customCheckFn?: (mime: string) => boolean): {
  mimeType: string;
  isDirectMp4: boolean;
} {
  const checkSupport = (type: string): boolean => {
    if (customCheckFn) return customCheckFn(type);
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
      return MediaRecorder.isTypeSupported(type);
    }
    return false;
  };

  // 1. Explicitly request 'video/mp4' (with H.264/AVC codecs)
  const mp4Candidates = [
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4; codecs=avc1.424028',
    'video/mp4; codecs=avc1',
    'video/mp4; codecs=h264',
    'video/mp4'
  ];

  for (const candidate of mp4Candidates) {
    try {
      if (checkSupport(candidate)) {
        return { mimeType: candidate, isDirectMp4: true };
      }
    } catch {
      // Continue check
    }
  }

  // 2. Fallback check: use 'video/webm;codecs=vp9' or 'video/webm;codecs=vp8'
  const webmFallbackCandidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ];

  for (const candidate of webmFallbackCandidates) {
    try {
      if (checkSupport(candidate)) {
        return { mimeType: candidate, isDirectMp4: false };
      }
    } catch {
      // Continue check
    }
  }

  // Default fallback
  return { mimeType: 'video/webm', isDirectMp4: false };
}

self.onmessage = async (e: MessageEvent) => {
  const { type, ...data } = e.data;

  switch (type) {
    case 'INIT_CANVAS': {
      offscreenCanvas = data.canvas;
      if (offscreenCanvas) {
        offscreenCanvas.width = data.width;
        offscreenCanvas.height = data.height;
        ctx = offscreenCanvas.getContext('2d', { alpha: false });
      }
      frameCount = 0;
      recordedChunks = [];
      self.postMessage({ type: 'INITIALIZED' });
      break;
    }

    case 'INIT_MEDIA_RECORDER': {
      // Initialize MediaRecorder inside the WebWorker with explicit 'video/mp4'
      // and fallback check to 'video/webm;codecs=vp9' or 'video/webm;codecs=vp8'
      const { stream, bitrate, supportedMimeType } = data;
      const resolved = resolveOptimalMimeType(supportedMimeType ? () => true : undefined);
      const chosenMime = supportedMimeType || resolved.mimeType;

      if (typeof MediaRecorder !== 'undefined' && stream) {
        try {
          const options: any = {
            mimeType: chosenMime,
            videoBitsPerSecond: bitrate || 14000000
          };
          workerMediaRecorder = new MediaRecorder(stream, options);
          workerMediaRecorder.ondataavailable = async (event: any) => {
            if (event.data && event.data.size > 0) {
              const arrayBuf = await event.data.arrayBuffer();
              recordedChunks.push(new Uint8Array(arrayBuf));
            }
          };
          workerMediaRecorder.start(1000);
          self.postMessage({
            type: 'RECORDER_INITIALIZED',
            mimeType: chosenMime,
            isDirectMp4: resolved.isDirectMp4
          });
        } catch (err: any) {
          self.postMessage({
            type: 'RECORDER_INIT_FAILED',
            error: err.message,
            fallbackConfig: resolved
          });
        }
      } else {
        self.postMessage({
          type: 'RECORDER_CONFIG_RESOLVED',
          config: resolved
        });
      }
      break;
    }

    case 'STOP_MEDIA_RECORDER': {
      if (workerMediaRecorder && workerMediaRecorder.state === 'recording') {
        workerMediaRecorder.stop();
        workerMediaRecorder = null;
      }
      break;
    }

    case 'RENDER_FRAME': {
      const { videoBitmap, overlayBitmap, layout, width, height } = data;
      if (ctx && offscreenCanvas) {
        if (width && height && (offscreenCanvas.width !== width || offscreenCanvas.height !== height)) {
          offscreenCanvas.width = width;
          offscreenCanvas.height = height;
        }

        // 1. Draw video background frame in worker thread
        if (videoBitmap) {
          ctx.drawImage(videoBitmap, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
          videoBitmap.close();
        }

        // 2. Draw overlay telestrations on top in worker thread
        if (overlayBitmap) {
          if (layout && layout.w > 0 && layout.h > 0) {
            ctx.drawImage(
              overlayBitmap,
              layout.x, layout.y, layout.w, layout.h,
              0, 0, offscreenCanvas.width, offscreenCanvas.height
            );
          } else {
            ctx.drawImage(overlayBitmap, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
          }
          overlayBitmap.close();
        }

        frameCount++;
      } else {
        // Close bitmaps if context not ready to prevent memory leak
        if (videoBitmap) videoBitmap.close();
        if (overlayBitmap) overlayBitmap.close();
      }
      self.postMessage({ type: 'FRAME_RENDERED', frameCount });
      break;
    }

    case 'PUSH_CHUNK': {
      if (data.chunk) {
        recordedChunks.push(new Uint8Array(data.chunk));
      }
      break;
    }

    case 'FINISH_RECORDING': {
      const { format, isDirectMp4, filename } = data;
      try {
        const fullBlob = new Blob(recordedChunks, { type: format });
        recordedChunks = [];

        if (isDirectMp4) {
          self.postMessage({
            type: 'RECORDING_COMPLETE',
            blob: fullBlob,
            filename
          });
        } else {
          // Offload MP4 transcoding and container multiplexing to this worker
          self.postMessage({ type: 'CONVERSION_PROGRESS', percent: 5 });

          const source = new BlobSource(fullBlob);
          const input = new Input({ source, formats: [] as any });
          const target = new BufferTarget();
          const output = new Output({
            target,
            format: new Mp4OutputFormat()
          });

          const conversion = await Conversion.init({
            input,
            output,
            video: {
              codec: 'avc'
            }
          });

          conversion.onProgress = (ratio: number) => {
            const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
            self.postMessage({ type: 'CONVERSION_PROGRESS', percent: pct });
          };

          await conversion.execute();

          const buffer = target.buffer;
          if (!buffer || buffer.byteLength === 0) {
            throw new Error("Converted MP4 buffer is empty in worker");
          }

          const mp4Blob = new Blob([buffer], { type: 'video/mp4' });
          self.postMessage({
            type: 'RECORDING_COMPLETE',
            blob: mp4Blob,
            filename
          });
        }
      } catch (err: any) {
        console.error("Worker conversion error, falling back to direct blob:", err);
        const fallbackBlob = new Blob(recordedChunks, { type: format || 'video/mp4' });
        self.postMessage({
          type: 'RECORDING_COMPLETE',
          blob: fallbackBlob,
          filename
        });
      }
      break;
    }

    case 'CLEANUP': {
      if (workerMediaRecorder && workerMediaRecorder.state === 'recording') {
        try { workerMediaRecorder.stop(); } catch {}
        workerMediaRecorder = null;
      }
      recordedChunks = [];
      frameCount = 0;
      break;
    }
  }
};
