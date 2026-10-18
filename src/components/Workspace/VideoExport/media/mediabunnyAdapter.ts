import '../workerPolyfill';
import {
  Input,
  BlobSource,
  Output,
  Mp4OutputFormat,
  BufferTarget,
  CanvasSource,
  CanvasSink,
  AudioSampleSink,
  AudioSampleSource,
  InputVideoTrack,
  InputAudioTrack,
  VideoEncodingConfig,
  AudioEncodingConfig,
  Conversion,
  canEncodeVideo,
  ALL_FORMATS
} from 'mediabunny';
import type { ExportClipItem, ExportOptions, ExportResolutionPreset } from '../exportTypes';

export interface OpenedMediaInput {
  input: Input;
  videoTrack: InputVideoTrack | null;
  audioTrack: InputAudioTrack | null;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
}

/**
 * Dynamically resolves an encoder configuration supported by the current browser/GPU.
 * Tests 'prefer-hardware' first and falls back to 'no-preference' / software if hardware acceleration is unavailable.
 */
export async function resolveSupportedVideoEncodingConfig(
  targetWidth: number,
  targetHeight: number,
  fps: number,
  bitrate: number
): Promise<VideoEncodingConfig> {
  const baseConfig: VideoEncodingConfig = {
    codec: 'avc',
    bitrate,
    keyFrameInterval: fps * 2
  };

  // Verify hardware acceleration support before applying it
  try {
    if (typeof canEncodeVideo === 'function') {
      const isHwSupported = await canEncodeVideo('avc', {
        width: targetWidth,
        height: targetHeight,
        bitrate,
        frameRate: fps,
        hardwareAcceleration: 'prefer-hardware'
      });
      if (isHwSupported) {
        return {
          ...baseConfig,
          hardwareAcceleration: 'prefer-hardware'
        };
      }
    }
  } catch {
    // If check fails, do not enforce prefer-hardware
  }

  // Fallback to 'no-preference' (compatible across all devices, virtualized environments, and software decoders)
  return {
    ...baseConfig,
    hardwareAcceleration: 'no-preference'
  };
}

/**
 * Opens a local Blob or File using Mediabunny's chunked BlobSource.
 * Reads metadata without loading the entire video into RAM.
 */
export async function openMediaInput(source: Blob | File): Promise<OpenedMediaInput> {
  const blobSource = new BlobSource(source);
  const input = new Input({
    source: blobSource,
    formats: ALL_FORMATS
  });

  const videoTrack = (await input.getPrimaryVideoTrack()) || null;
  const audioTrack = (await input.getPrimaryAudioTrack()) || null;

  let width = 1920;
  let height = 1080;
  let fps = 30;
  let codec = 'avc';

  if (videoTrack) {
    width = videoTrack.displayWidth || videoTrack.codedWidth || 1920;
    height = videoTrack.displayHeight || videoTrack.codedHeight || 1080;
    codec = videoTrack.codec || 'avc';

    try {
      const metrics = await videoTrack.computeFrameRateMetrics();
      if (metrics && metrics.averageFps && metrics.averageFps > 10 && metrics.averageFps <= 120) {
        fps = Math.round(metrics.averageFps);
      }
    } catch {
      fps = 30;
    }
  }

  let duration = 0;
  try {
    const dur = await input.computeDuration();
    if (dur && isFinite(dur)) duration = dur;
  } catch {
    duration = 0;
  }

  return {
    input,
    videoTrack,
    audioTrack,
    duration,
    width,
    height,
    fps,
    codec
  };
}

/**
 * Calculates target output resolution based on source dimensions and user preset.
 */
export function resolveTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  preset: ExportResolutionPreset
): { width: number; height: number } {
  // Ensure dimensions are even numbers (required by H.264 encoders)
  const makeEven = (n: number) => (n % 2 === 0 ? n : n - 1);

  if (preset === '720p') {
    const targetH = 720;
    const targetW = makeEven(Math.round((sourceWidth / sourceHeight) * targetH));
    return { width: targetW, height: targetH };
  }

  if (preset === '1080p') {
    const targetH = 1080;
    const targetW = makeEven(Math.round((sourceWidth / sourceHeight) * targetH));
    return { width: targetW, height: targetH };
  }

  // 'original' preset
  return {
    width: makeEven(sourceWidth || 1920),
    height: makeEven(sourceHeight || 1080)
  };
}

export interface Mp4ExportPipeline {
  output: Output;
  target: BufferTarget;
  canvasSource: CanvasSource;
  audioSource: AudioSampleSource | null;
  start: () => Promise<void>;
  finalize: () => Promise<ArrayBuffer>;
  cancel: () => Promise<void>;
}

/**
 * Sets up an offline MP4 writer using Mediabunny Output and CanvasSource.
 */
export async function createMp4ExportPipeline(
  canvas: OffscreenCanvas,
  targetWidth: number,
  targetHeight: number,
  fps: number,
  options: ExportOptions,
  includeAudio: boolean
): Promise<Mp4ExportPipeline> {
  const target = new BufferTarget();
  const format = new Mp4OutputFormat();
  const output = new Output({ target, format });

  // Default high-quality AVC (H.264) bitrate
  // 1080p: ~12-16 Mbps, 720p: ~6-8 Mbps, 4K: ~30 Mbps
  let bitrate = options.videoBitrate;
  if (!bitrate) {
    if (targetHeight <= 720) bitrate = 7_000_000;
    else if (targetHeight <= 1080) bitrate = 14_000_000;
    else bitrate = 28_000_000;
  }

  const videoConfig = await resolveSupportedVideoEncodingConfig(
    targetWidth,
    targetHeight,
    fps,
    bitrate
  );

  let canvasSource = new CanvasSource(canvas, videoConfig);
  output.addVideoTrack(canvasSource);

  let audioSource: AudioSampleSource | null = null;
  if (includeAudio) {
    try {
      const audioConfig: AudioEncodingConfig = {
        codec: 'aac',
        sampleRate: 48000,
        numberOfChannels: 2,
        bitrate: 192_000
      };
      audioSource = new AudioSampleSource(audioConfig);
      output.addAudioTrack(audioSource);
    } catch (e) {
      console.warn('Could not initialize audio track in output:', e);
      audioSource = null;
    }
  }

  return {
    output,
    target,
    canvasSource,
    audioSource,
    start: async () => {
      try {
        await output.start();
      } catch (err: any) {
        // If start failed due to hardware acceleration rejection, retry with no-preference software configuration
        if (videoConfig.hardwareAcceleration === 'prefer-hardware') {
          console.warn('Hardware accelerated encoder failed to start, falling back to software:', err);
          try {
            canvasSource.close();
            if (audioSource) audioSource.close();
            await output.cancel();
          } catch {
            // ignore
          }

          // Re-initialize with compatible software settings
          const fallbackConfig: VideoEncodingConfig = {
            codec: 'avc',
            bitrate: Math.min(bitrate, 10_000_000),
            keyFrameInterval: fps * 2,
            hardwareAcceleration: 'no-preference'
          };
          canvasSource = new CanvasSource(canvas, fallbackConfig);
          const fallbackOutput = new Output({ target, format });
          fallbackOutput.addVideoTrack(canvasSource);
          if (includeAudio && audioSource) {
            fallbackOutput.addAudioTrack(audioSource);
          }
          await fallbackOutput.start();
          return;
        }
        throw err;
      }
    },
    finalize: async () => {
      canvasSource.close();
      if (audioSource) audioSource.close();
      await output.finalize();
      return target.buffer;
    },
    cancel: async () => {
      try {
        canvasSource.close();
        if (audioSource) audioSource.close();
        await output.cancel();
      } catch {
        // ignore cancellation errors
      }
    }
  };
}

export interface FastConversionOptions {
  clip: ExportClipItem;
  options: ExportOptions;
  onProgress?: (progress: number, processedSeconds: number) => void;
  shouldAbort?: () => boolean;
}

/**
 * Direct packet stream-copy remuxer using Mediabunny's zero-transcode Conversion pipeline.
 * Runs in ~50-150ms without decoding or re-encoding pixels.
 */
export async function runFastConversionClip(
  opts: FastConversionOptions
): Promise<{
  data: ArrayBuffer;
  durationSeconds: number;
  fileSizeBytes: number;
  audioPreserved: boolean;
} | null> {
  const { clip, options, onProgress, shouldAbort } = opts;
  try {
    const blobSource = new BlobSource(clip.sourceFile);
    const input = new Input({
      source: blobSource,
      formats: ALL_FORMATS
    });

    const target = new BufferTarget();
    const format = new Mp4OutputFormat();
    const output = new Output({ target, format });

    const trimStart = clip.inPoint > 0.05 ? clip.inPoint : undefined;
    const trimEnd = clip.outPoint && isFinite(clip.outPoint) ? clip.outPoint : undefined;

    const conversion = await Conversion.init({
      input,
      output,
      trim:
        trimStart !== undefined || trimEnd !== undefined
          ? {
              start: trimStart,
              end: trimEnd
            }
          : undefined,
      copy: {
        mode: 'forced',
        shiftTolerance: 0.1,
        boundaryPolicy: 'shrink'
      },
      showWarnings: false
    });

    if (!conversion.isValid || conversion.utilizedTracks.length === 0) {
      return null;
    }

    if (onProgress) {
      conversion.onProgress = (prog, procTime) => {
        if (shouldAbort?.()) return;
        onProgress(prog, procTime);
      };
    }

    if (shouldAbort?.()) {
      await conversion.cancel();
      return null;
    }

    await conversion.execute();

    if (shouldAbort?.()) {
      return null;
    }

    const totalDuration = clip.outPoint - clip.inPoint;
    const audioPreserved = conversion.utilizedTracks.some(t => t.type === 'audio');

    return {
      data: target.buffer,
      durationSeconds: totalDuration,
      fileSizeBytes: target.buffer.byteLength,
      audioPreserved
    };
  } catch (err) {
    console.warn('FastConversion encountered error, falling back to rendered path:', err);
    return null;
  }
}
