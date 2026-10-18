import type { Shape, FreezeFrame, MaskSettings } from '../../../types';

export type ExportResolutionPreset = 'original' | '1080p' | '720p';
export type ExportModePreset = 'auto' | 'fastest' | 'quality';

export interface ExportClipItem {
  instanceId: string;
  name: string;
  sourceFile: Blob | File;
  inPoint: number;
  outPoint: number;
  duration: number;
  shapes: Shape[];
  freezeFrames: FreezeFrame[];
  sourceWidth?: number;
  sourceHeight?: number;
  maskSettings?: MaskSettings;
}

export type FreezeFrameAudioPolicy = 'mute' | 'continuous';

export interface ExportOptions {
  resolution: ExportResolutionPreset;
  mode: ExportModePreset;
  withFreezeFrames: boolean;
  preserveAudio: boolean;
  freezeFrameAudioPolicy?: FreezeFrameAudioPolicy; // 'mute' (default) shifts subsequent audio; 'continuous' leaves commentary running
  maskSettings?: MaskSettings;
  customFileName?: string;
  targetFps?: number;
  videoBitrate?: number; // bps
}

export interface ExportJobPayload {
  jobId: string;
  title: string;
  clips: ExportClipItem[];
  options: ExportOptions;
}

export interface ExportPerformanceMetrics {
  totalMs: number;
  readMs: number;
  demuxMs: number;
  decodeMs: number;
  renderMs: number;
  chromaKeyMs: number;
  freezeFrameMs: number;
  videoEncodeMs: number;
  audioMs: number;
  muxMs: number;
  finalizeMs: number;
  outputTransferMs: number;
  sourceDurationSeconds: number;
  outputDurationSeconds: number;
  decodedFrames: number;
  encodedFrames: number;
  actualExportFps: number;
  fastPathPercentage?: number;
  bottleneck?: string;
}

export type ExportSegmentType = 'clean' | 'modified' | 'freeze';

export interface ExportSegment {
  type: ExportSegmentType;
  clipIndex: number;
  sourceStart: number;
  sourceEnd: number;
  outputStart: number;
  outputEnd: number;
  duration: number;
  reason?: 'telestration' | 'animation' | 'chroma-key' | 'freeze';
  freezeFrameId?: string;
  activeFreezeFrame?: FreezeFrame;
  shapes: Shape[];
  isKeyframeAligned?: boolean;
  canUseFastPath?: boolean;
}

export interface ExportProgressPayload {
  percent: number; // 0..100
  currentClipIndex: number;
  totalClips: number;
  currentClipName?: string;
  fps: number;
  processedSeconds: number;
  totalDurationSeconds: number;
  estimatedRemainingSeconds?: number;
  status: string;
  stage: 'analyzing' | 'decoding' | 'compositing' | 'encoding' | 'remuxing' | 'finalizing' | 'done';
  usedFastPath?: boolean;
  fastPathPercentage?: number;
  audioIncluded?: boolean;
  metrics?: Partial<ExportPerformanceMetrics>;
}

export interface ExportCompletePayload {
  mimeType: string;
  fileName: string;
  data: ArrayBuffer;
  durationSeconds: number;
  fileSizeBytes: number;
  audioPreserved: boolean;
  usedFastPath: boolean;
  fastPathPercentage?: number;
  metrics?: ExportPerformanceMetrics;
}

export interface ExportErrorPayload {
  message: string;
  stack?: string;
  recoverable?: boolean;
}

export type ExportWorkerRequest =
  | {
      type: 'start';
      payload: ExportJobPayload;
    }
  | {
      type: 'cancel';
    };

export type ExportWorkerResponse =
  | {
      type: 'progress';
      payload: ExportProgressPayload;
    }
  | {
      type: 'complete';
      payload: ExportCompletePayload;
    }
  | {
      type: 'error';
      payload: ExportErrorPayload;
    }
  | {
      type: 'cancelled';
    };

export interface SystemCapabilities {
  supportsWebCodecs: boolean;
  supportsOffscreenCanvas: boolean;
  supportsWorkers: boolean;
  isChromium: boolean;
  canExportWithWorker: boolean;
  browserName: string;
  videoCodecSupported?: boolean;
  audioCodecSupported?: boolean;
  fileSystemStreamingAvailable?: boolean;
  fallbackReason?: string;
}

export interface GranularCapabilities extends SystemCapabilities {
  videoCodecSupported: boolean;
  audioCodecSupported: boolean;
  fileSystemStreamingAvailable: boolean;
  fallbackReason?: string;
}

export interface TimelineSegment {
  type: 'video' | 'freeze';
  clipIndex: number;
  sourceStart: number;
  sourceEnd: number;
  outputStart: number;
  outputEnd: number;
  duration: number;
  freezeFrameId?: string;
  activeFreezeFrame?: FreezeFrame;
}

export interface CanonicalTimeline {
  segments: TimelineSegment[];
  exportSegments: ExportSegment[];
  totalDuration: number;
  mapSourceTimeToOutput: (clipIndex: number, sourceTime: number) => number;
  mapOutputTimeToSource: (outputTime: number) => {
    clipIndex: number;
    sourceTime: number;
    isFreeze: boolean;
    freezeFrame?: FreezeFrame;
    freezeElapsed: number;
  };
  getClipOutputBounds: (clipIndex: number) => { outputStart: number; outputEnd: number };
}
