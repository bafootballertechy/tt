import type { ExportClipItem, ExportOptions } from '../exportTypes';
import type { OpenedMediaInput } from './mediabunnyAdapter';
import type { InputVideoTrack } from 'mediabunny';

export interface FastPathFeasibility {
  canUseFastPath: boolean;
  reason?: string;
}

export interface FastPathCheckOptions {
  clip: ExportClipItem;
  media: OpenedMediaInput;
  options: ExportOptions;
  allClips?: ExportClipItem[];
  isKeyframeAligned?: boolean;
}

/**
 * Verifies if the inPoint aligns with an authentic IDR/keyframe in the bitstream.
 */
export async function verifyKeyframeAlignment(
  videoTrack: InputVideoTrack | null | undefined,
  inPoint: number
): Promise<boolean> {
  if (inPoint <= 0.05) return true;
  if (!videoTrack) return false;
  try {
    const keyPacket = await videoTrack.getKeyPacket(inPoint, { verifyKeyPackets: true });
    if (!keyPacket) return false;
    return Math.abs(keyPacket.timestamp - inPoint) <= 0.05;
  } catch {
    return false;
  }
}

/**
 * Checks if a clip satisfies all strict criteria for fast stream-copy remuxing without transcoding.
 * Strictly verifies IDR/keyframe alignment, absence of overlays/freeze-frames, and single-source compatibility.
 */
export function checkFastPathFeasibility(
  clipOrOptions: ExportClipItem | FastPathCheckOptions,
  maybeMedia?: OpenedMediaInput,
  maybeOptions?: ExportOptions
): FastPathFeasibility {
  let clip: ExportClipItem;
  let media: OpenedMediaInput;
  let options: ExportOptions;
  let allClips: ExportClipItem[] | undefined;
  let isKeyframeAligned: boolean | undefined;

  if ('clip' in clipOrOptions && 'media' in clipOrOptions) {
    clip = clipOrOptions.clip;
    media = clipOrOptions.media;
    options = clipOrOptions.options;
    allClips = clipOrOptions.allClips;
    isKeyframeAligned = clipOrOptions.isKeyframeAligned;
  } else {
    clip = clipOrOptions as ExportClipItem;
    media = maybeMedia!;
    options = maybeOptions!;
  }

  // If user explicitly selected a transcode mode or resolution preset different from source
  if (options.mode === 'quality') {
    return { canUseFastPath: false, reason: 'High quality transcode mode requested' };
  }

  if (options.resolution !== 'original') {
    return { canUseFastPath: false, reason: 'Custom resolution scaling requires re-encoding' };
  }

  // 1. Shapes check: Must have NO telestrations
  if (clip.shapes && clip.shapes.length > 0) {
    return { canUseFastPath: false, reason: 'Clip contains active telestration shapes' };
  }

  // 2. Freeze frames check: Must have NO freeze frames
  if (clip.freezeFrames && clip.freezeFrames.length > 0) {
    return { canUseFastPath: false, reason: 'Clip contains active freeze frames' };
  }

  // 3. Multi-clip playlist safety: Disable packet passthrough across multiple clips to avoid timescale/parameter mismatch
  if (allClips && allClips.length > 1) {
    return { canUseFastPath: false, reason: 'Multi-clip playlists require rendered normalization to prevent timescale/GOP drift' };
  }

  // 4. Codec check: source must be compatible with MP4 container (AVC / H.264 or HEVC / H.265)
  const codec = media.codec?.toLowerCase() || '';
  if (!codec.includes('avc') && !codec.includes('h264') && !codec.includes('mp4v')) {
    return { canUseFastPath: false, reason: `Source codec (${codec}) is not directly copyable into MP4` };
  }

  // 5. Strict Keyframe Alignment Check:
  // Cutting on a non-IDR frame corrupts the leading GOP, causing black frames, gray smudge, or decode crash.
  // Unless inPoint is at stream origin (<= 0.05s) or verified keyframe aligned, force rendered path.
  const isAtStreamOrigin = clip.inPoint <= 0.05;
  if (!isAtStreamOrigin && isKeyframeAligned !== true) {
    return {
      canUseFastPath: false,
      reason: `Non-origin cut (inPoint: ${clip.inPoint.toFixed(2)}s) requires GOP re-encoding to guarantee clean frame boundary without decoding artifacts`
    };
  }

  return { canUseFastPath: true };
}
