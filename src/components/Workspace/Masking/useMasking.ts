import { useState, useRef, useCallback, useEffect } from 'react';
import { MaskSettings, MaskLayerCache } from '../../../types';
import {
  DEFAULT_MASK_SETTINGS,
  INITIAL_MASK_CACHE,
  computeMaskingBitmaps,
  sampleKeyColorFromVideo,
  isMaskSynchronized,
  getMaskTelestrationAlpha,
} from './maskingUtils';

export interface UseMaskingProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  currentTime: number;
  initialSettings?: Partial<MaskSettings>;
}

export function useMasking({
  videoRef,
  isPlaying,
  currentTime,
  initialSettings,
}: UseMaskingProps) {
  const [maskSettings, setMaskSettings] = useState<MaskSettings>({
    ...DEFAULT_MASK_SETTINGS,
    ...initialSettings,
  });

  const [maskCache, setMaskCache] = useState<MaskLayerCache>(INITIAL_MASK_CACHE);
  const [isProcessingMask, setIsProcessingMask] = useState(false);
  const [isPickingColor, setIsPickingColor] = useState(false);

  const offscreenCanvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(null);
  const isComputingRef = useRef(false);
  const lastProcessedRef = useRef<{
    timestamp: number;
    enabled: boolean;
    keyColor?: string;
    keyColors?: string[];
    sensitivity?: number;
    smoothness?: number;
  }>({
    timestamp: -999,
    enabled: false,
  });

  const clearMaskCache = useCallback(() => {
    lastProcessedRef.current = { timestamp: -999, enabled: false };
    setMaskCache(INITIAL_MASK_CACHE);
    setIsProcessingMask(false);
  }, []);

  const computeMaskingLayers = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !maskSettings.enabled || isPlaying || video.seeking) return;
    if (isComputingRef.current) return;

    try {
      isComputingRef.current = true;
      setIsProcessingMask(true);

      const targetTime = video.currentTime;
      const result = await computeMaskingBitmaps(video, maskSettings, offscreenCanvasRef);

      if (result && !isPlaying) {
        lastProcessedRef.current = {
          timestamp: targetTime,
          enabled: maskSettings.enabled,
          keyColor: maskSettings.keyColor,
          keyColors: maskSettings.keyColors ? [...maskSettings.keyColors] : undefined,
          sensitivity: maskSettings.sensitivity,
          smoothness: maskSettings.smoothness,
        };
        setMaskCache(result);
      }
    } catch (error) {
      console.error('Masking error:', error);
    } finally {
      isComputingRef.current = false;
      setIsProcessingMask(false);
    }
  }, [maskSettings, isPlaying, videoRef]);

  // Handle mask invalidation and recomputation on playback / settings / time change
  useEffect(() => {
    if (isPlaying) {
      lastProcessedRef.current = { timestamp: -999, enabled: maskSettings.enabled };
      clearMaskCache();
      return;
    }

    if (!maskSettings.enabled) {
      lastProcessedRef.current = { timestamp: -999, enabled: false };
      clearMaskCache();
      return;
    }

    // Check if current frame has already been processed with identical settings
    const currentVideoTime = videoRef.current ? videoRef.current.currentTime : currentTime;
    const sameTime = Math.abs(lastProcessedRef.current.timestamp - currentVideoTime) < 0.05;
    const prevColors = lastProcessedRef.current.keyColors || [];
    const curColors = maskSettings.keyColors || (maskSettings.keyColor ? [maskSettings.keyColor] : []);
    const sameColors =
      prevColors.length === curColors.length &&
      prevColors.every((val, idx) => val === curColors[idx]);

    const sameSettings =
      lastProcessedRef.current.enabled === maskSettings.enabled &&
      lastProcessedRef.current.keyColor === maskSettings.keyColor &&
      sameColors &&
      lastProcessedRef.current.sensitivity === maskSettings.sensitivity &&
      lastProcessedRef.current.smoothness === maskSettings.smoothness;

    if (sameTime && sameSettings && maskCache.foreground) {
      return; // Already up to date! Do NOT re-trigger processing or reset fade-in.
    }

    const timeout = setTimeout(() => {
      computeMaskingLayers();
    }, 50);

    return () => clearTimeout(timeout);
  }, [
    isPlaying,
    maskSettings.enabled,
    maskSettings.sensitivity,
    maskSettings.keyColor,
    maskSettings.keyColors,
    maskSettings.smoothness,
    currentTime,
    computeMaskingLayers,
    clearMaskCache,
    videoRef,
    // Note: maskCache is intentionally omitted to prevent infinite re-render loops
  ]);

  const pickColorAtPoint = useCallback(
    (point: { x: number; y: number }): string | null => {
      const video = videoRef.current;
      if (!video) return null;
      const sampledHex = sampleKeyColorFromVideo(video, point);
      if (sampledHex) {
        setMaskSettings((prev) => {
          const existing = prev.keyColors && prev.keyColors.length > 0 ? prev.keyColors : [prev.keyColor || '#4b8b3b'];
          // Set primary color and ensure it's in the list
          const updated = [sampledHex, ...existing.filter((c) => c !== sampledHex)].slice(0, 5);
          return { ...prev, keyColor: sampledHex, keyColors: updated };
        });
      }
      setIsPickingColor(false);
      return sampledHex;
    },
    [videoRef]
  );

  const addColorAtPoint = useCallback(
    (point: { x: number; y: number }): string | null => {
      const video = videoRef.current;
      if (!video) return null;
      const sampledHex = sampleKeyColorFromVideo(video, point);
      if (sampledHex) {
        setMaskSettings((prev) => {
          const currentList = prev.keyColors && prev.keyColors.length > 0 ? prev.keyColors : [prev.keyColor || '#4b8b3b'];
          if (currentList.includes(sampledHex)) return prev;
          // Keep up to 6 distinct pitch samples (e.g., sun, shadow, half-shadow)
          const updated = [...currentList, sampledHex].slice(-6);
          return {
            ...prev,
            keyColors: updated,
            keyColor: prev.keyColor || sampledHex,
          };
        });
      }
      return sampledHex;
    },
    [videoRef]
  );

  const removeColor = useCallback((colorToRemove: string) => {
    setMaskSettings((prev) => {
      const currentList = prev.keyColors && prev.keyColors.length > 0 ? prev.keyColors : [prev.keyColor || '#4b8b3b'];
      const filtered = currentList.filter((c) => c.toLowerCase() !== colorToRemove.toLowerCase());
      const nextList = filtered.length > 0 ? filtered : ['#4b8b3b'];
      return {
        ...prev,
        keyColors: nextList,
        keyColor: nextList[0],
      };
    });
  }, []);

  const checkIsMaskSynced = useCallback(
    (time?: number) => {
      const targetTime = time !== undefined ? time : videoRef.current?.currentTime ?? 0;
      return isMaskSynchronized(maskCache.timestamp, targetTime);
    },
    [maskCache.timestamp, videoRef]
  );

  const getTelestrationAlpha = useCallback(
    (currentVideoTime: number) => {
      return getMaskTelestrationAlpha(isPlaying, maskSettings, maskCache, currentVideoTime);
    },
    [isPlaying, maskSettings, maskCache]
  );

  return {
    maskSettings,
    setMaskSettings,
    maskCache,
    setMaskCache,
    isProcessingMask,
    setIsProcessingMask,
    isPickingColor,
    setIsPickingColor,
    computeMaskingLayers,
    clearMaskCache,
    pickColorAtPoint,
    addColorAtPoint,
    removeColor,
    isMaskSynced: checkIsMaskSynced,
    getTelestrationAlpha,
  };
}
