import { useState, useEffect, RefObject } from 'react';
import { PITCH_WIDTH, PITCH_HEIGHT } from '../constants';

export const useBoardResize = (
  canvasContainerRef: RefObject<HTMLDivElement>,
  projectWidth: number | undefined,
  projectHeight: number | undefined,
  pitchView: string | undefined,
  isFullscreen: boolean
) => {
  const [boardScale, setBoardScale] = useState(1);

  useEffect(() => {
    let lastWidth = 0;
    let lastHeight = 0;

    const updateScale = () => {
      if (!canvasContainerRef.current) return;
      const { width, height } = canvasContainerRef.current.getBoundingClientRect();
      
      const isInputFocused = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
      if (isInputFocused && lastHeight > 0 && height < lastHeight && width === lastWidth) {
          return;
      }
      
      lastWidth = width;
      lastHeight = height;

      const padding = isFullscreen ? 32 : 64; 
      const currentPitchWidth = projectWidth || PITCH_WIDTH;
      const currentPitchHeight = projectHeight || PITCH_HEIGHT;
      const scaleX = (width - padding) / currentPitchWidth;
      const scaleY = (height - padding) / currentPitchHeight;
      setBoardScale(Math.min(scaleX, scaleY, isFullscreen ? 5 : 1.5));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (canvasContainerRef.current) {
      observer.observe(canvasContainerRef.current);
    }
    return () => observer.disconnect();
  }, [projectWidth, projectHeight, pitchView, isFullscreen, canvasContainerRef]);

  return boardScale;
};
