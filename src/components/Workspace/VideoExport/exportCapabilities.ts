import type { SystemCapabilities, GranularCapabilities } from './exportTypes';

export function getExportCapabilities(): SystemCapabilities {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (typeof window !== 'undefined' ? (window as any) : {});
  const supportsWebCodecs =
    typeof g.VideoEncoder !== 'undefined' &&
    typeof g.VideoDecoder !== 'undefined';

  const supportsOffscreenCanvas =
    typeof g.OffscreenCanvas !== 'undefined';

  const supportsWorkers =
    typeof g.Worker !== 'undefined';

  let isChromium = false;
  let browserName = 'Unknown Browser';

  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (/Chrome|Chromium|Edg/i.test(ua) && !/OPR|Opera/i.test(ua)) {
      isChromium = true;
      browserName = /Edg/i.test(ua) ? 'Microsoft Edge' : 'Google Chrome';
    } else if (/Safari/i.test(ua) && !/Chrome|Chromium/i.test(ua)) {
      browserName = 'Apple Safari';
    } else if (/Firefox/i.test(ua)) {
      browserName = 'Mozilla Firefox';
    }
  }

  const canExportWithWorker = supportsWebCodecs && supportsOffscreenCanvas && supportsWorkers;

  return {
    supportsWebCodecs,
    supportsOffscreenCanvas,
    supportsWorkers,
    isChromium,
    canExportWithWorker,
    browserName
  };
}

export async function probeExportCapabilities(params?: {
  width?: number;
  height?: number;
  fps?: number;
  bitrate?: number;
}): Promise<GranularCapabilities> {
  const base = getExportCapabilities();
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (typeof window !== 'undefined' ? (window as any) : {});

  let videoCodecSupported = false;
  let audioCodecSupported = false;
  const fileSystemStreamingAvailable = typeof window !== 'undefined' && typeof (window as any).showSaveFilePicker === 'function';
  let fallbackReason: string | undefined;

  if (!base.supportsWebCodecs) {
    fallbackReason = 'Browser does not support WebCodecs (VideoEncoder/VideoDecoder).';
  } else if (!base.supportsOffscreenCanvas) {
    fallbackReason = 'Browser does not support OffscreenCanvas rendering.';
  } else {
    // Probe VideoEncoder configuration
    try {
      if (typeof g.VideoEncoder !== 'undefined' && typeof g.VideoEncoder.isConfigSupported === 'function') {
        const videoRes = await g.VideoEncoder.isConfigSupported({
          codec: 'avc1.4d002a', // H.264 Main Profile Level 4.2
          width: params?.width || 1920,
          height: params?.height || 1080,
          bitrate: params?.bitrate || 14_000_000,
          framerate: params?.fps || 30
        });
        videoCodecSupported = Boolean(videoRes?.supported);
        if (!videoCodecSupported) {
          // Try baseline profile fallback
          const baselineRes = await g.VideoEncoder.isConfigSupported({
            codec: 'avc1.42001f', // H.264 Baseline Profile Level 3.1
            width: params?.width || 1920,
            height: params?.height || 1080,
            bitrate: params?.bitrate || 14_000_000,
            framerate: params?.fps || 30
          });
          videoCodecSupported = Boolean(baselineRes?.supported);
        }
      }
    } catch (err: any) {
      console.warn('VideoEncoder config probe failed:', err);
      videoCodecSupported = false;
    }

    // Probe AudioEncoder configuration
    try {
      if (typeof g.AudioEncoder !== 'undefined' && typeof g.AudioEncoder.isConfigSupported === 'function') {
        const audioRes = await g.AudioEncoder.isConfigSupported({
          codec: 'mp4a.40.2', // AAC-LC
          sampleRate: 48000,
          numberOfChannels: 2,
          bitrate: 192000
        });
        audioCodecSupported = Boolean(audioRes?.supported);
      }
    } catch (err: any) {
      console.warn('AudioEncoder config probe failed:', err);
      audioCodecSupported = false;
    }

    if (!videoCodecSupported) {
      fallbackReason = 'H.264 video hardware/software encoder is not supported for this resolution.';
    }
  }

  return {
    ...base,
    videoCodecSupported,
    audioCodecSupported,
    fileSystemStreamingAvailable,
    fallbackReason
  };
}
