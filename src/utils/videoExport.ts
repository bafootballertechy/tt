import { BlobSource, Input, BufferTarget, Output, Mp4OutputFormat, Conversion } from 'mediabunny';

export interface ExportQualityConfig {
  label: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

export const EXPORT_PRESETS: Record<string, ExportQualityConfig> = {
  '1080p60': {
    label: '1080p • 60 FPS (Ultra Smooth 60fps)',
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: 12000000 // 12 Mbps: optimal sweet spot avoiding encoder buffer lockups
  },
  '1080p30': {
    label: '1080p • 30 FPS (Rock Solid & Stable)',
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 8000000 // 8 Mbps
  },
  '720p60': {
    label: '720p • 60 FPS (Rapid & Smooth)',
    width: 1280,
    height: 720,
    fps: 60,
    bitrate: 6000000 // 6 Mbps
  },
  '720p30': {
    label: '720p • 30 FPS (Maximum Compatibility & Speed)',
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 4000000 // 4 Mbps
  }
};

/**
 * Check if the browser's WebCodecs API is available for client-side AVC transcoding
 */
export function isWebCodecsAvailable(): boolean {
  return typeof window !== 'undefined' && typeof (window as any).VideoEncoder !== 'undefined';
}

/**
 * Determine best supported mime type for MediaRecorder.
 * Detects if the browser supports recording directly to MP4 (Chrome, Safari, Edge).
 * If not (Firefox, older Chromium), falls back to WebM.
 */
export function getSupportedRecorderMimeType(): { mimeType: string; isDirectMp4: boolean; extension: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: '', isDirectMp4: false, extension: 'mp4' };
  }

  // Modern browsers (Chrome 121+, Safari 14.1+, Edge) support native MP4 MediaRecorder!
  const mp4Types = [
    'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
    'video/mp4; codecs=avc1.424028',
    'video/mp4; codecs=avc1',
    'video/mp4; codecs=h264',
    'video/mp4'
  ];

  for (const type of mp4Types) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type, isDirectMp4: true, extension: 'mp4' };
      }
    } catch {
      // Continue checking next
    }
  }

  // WebM fallback with high compatibility
  const webmTypes = [
    'video/webm; codecs=vp9',
    'video/webm; codecs=vp8',
    'video/webm',
    ''
  ];

  for (const type of webmTypes) {
    try {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type, isDirectMp4: false, extension: 'webm' };
      }
    } catch {
      // Continue checking next
    }
  }

  return { mimeType: '', isDirectMp4: false, extension: 'mp4' };
}

/**
 * Calculate even dimensions (H.264/AVC encoders strictly require even width and height)
 * clamped to maximum target bounds while preserving source aspect ratio.
 */
export function calculateExportDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maxTargetWidth: number = 1920,
  maxTargetHeight: number = 1080
): { width: number; height: number } {
  const srcW = sourceWidth || 1920;
  const srcH = sourceHeight || 1080;
  const aspect = srcW / srcH;

  let outW = srcW;
  let outH = srcH;

  if (outW > maxTargetWidth || outH > maxTargetHeight) {
    if (aspect >= maxTargetWidth / maxTargetHeight) {
      outW = maxTargetWidth;
      outH = Math.round(maxTargetWidth / aspect);
    } else {
      outH = maxTargetHeight;
      outW = Math.round(maxTargetHeight * aspect);
    }
  }

  // Force even numbers for encoder compatibility
  outW = outW - (outW % 2);
  outH = outH - (outH % 2);

  return { width: Math.max(320, outW), height: Math.max(240, outH) };
}

/**
 * Converts a WebM recording blob into an MP4 file with strict timeout & stall prevention.
 * If WebCodecs transcoding hangs or fails, gracefully falls back to the original WebM file
 * so export NEVER gets stuck or lost.
 */
export async function convertWebmToMp4(
  webmBlob: Blob,
  onProgress?: (progressPercent: number) => void
): Promise<{ blob: Blob; isMp4: boolean; filenameExt: string }> {
  // If WebCodecs is not present, don't attempt mediabunny transcoding which would fail
  if (!isWebCodecsAvailable()) {
    console.info("WebCodecs not supported in this browser, skipping transcode and preserving native WebM.");
    return { blob: webmBlob, isMp4: false, filenameExt: 'webm' };
  }

  try {
    const source = new BlobSource(webmBlob);
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

    let lastProgressTime = Date.now();

    if (onProgress) {
      conversion.onProgress = (ratio: number) => {
        lastProgressTime = Date.now();
        const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
        onProgress(pct);
      };
    }

    // Guard with a watchdog timeout: if no progress or execution hangs for 15 seconds, reject to fallback
    const executePromise = conversion.execute();
    const timeoutPromise = new Promise<never>((_, reject) => {
      const interval = setInterval(() => {
        if (Date.now() - lastProgressTime > 15000) {
          clearInterval(interval);
          reject(new Error("Transcoding stalled for 15 seconds"));
        }
      }, 1000);
      executePromise.finally(() => clearInterval(interval));
    });

    await Promise.race([executePromise, timeoutPromise]);

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0) {
      throw new Error("Converted MP4 buffer is empty");
    }

    return {
      blob: new Blob([buffer], { type: 'video/mp4' }),
      isMp4: true,
      filenameExt: 'mp4'
    };
  } catch (error) {
    console.warn("Conversion from WebM to MP4 via mediabunny failed or timed out. Falling back to native WebM file:", error);
    // Provide universal WebM file with zero data loss
    return {
      blob: webmBlob,
      isMp4: false,
      filenameExt: 'webm'
    };
  }
}

/**
 * Triggers a browser file download of a Blob with a specific filename.
 */
export function downloadExportedBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
