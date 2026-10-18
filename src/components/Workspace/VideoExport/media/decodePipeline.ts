import { CanvasSink, InputVideoTrack, WrappedCanvas } from 'mediabunny';

export interface ClipFrameIteratorOptions {
  videoTrack: InputVideoTrack;
  inPoint: number;
  outPoint: number;
  targetWidth?: number;
  targetHeight?: number;
}

/**
 * Creates a CanvasSink to decode video frames offline for a specific time range.
 */
export function createClipCanvasSink(
  videoTrack: InputVideoTrack,
  targetWidth?: number,
  targetHeight?: number
): CanvasSink {
  const options: {
    poolSize: number;
    width?: number;
    height?: number;
    fit?: 'contain' | 'cover' | 'fill';
  } = {
    poolSize: 3 // Ring buffer of 3 canvases to maintain constant VRAM
  };

  if (typeof targetWidth === 'number' && typeof targetHeight === 'number') {
    options.width = Math.round(targetWidth);
    options.height = Math.round(targetHeight);
    options.fit = 'contain';
  }

  return new CanvasSink(videoTrack, options);
}

/**
 * Retrieves a single snapshot canvas at an exact timestamp (used for freeze frames).
 */
export async function getFreezeFrameSnapshot(
  canvasSink: CanvasSink,
  timestamp: number
): Promise<WrappedCanvas | null> {
  try {
    return await canvasSink.getCanvas(timestamp);
  } catch (err) {
    console.warn(`Failed to capture freeze frame snapshot at ${timestamp}:`, err);
    return null;
  }
}
