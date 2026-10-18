import { useState, useRef, useEffect, useCallback } from 'react';
import { Project, PitchTemplate, CoinSettings } from '../types';
import { INITIAL_PROJECT, PITCH_WIDTH, PITCH_HEIGHT } from '../constants';
import { drawBoardToCanvas, drawStaticBackgroundToCanvas } from '../canvasRenderer';
import { compileAnimation } from '../utils';

export const useExportAndPlayback = (
  project: Project,
  coinSettings: CoinSettings,
  backgroundImage: string | null,
  pitchTemplate: PitchTemplate,
  history: Project[],
  historyIndex: number
) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSlideId, setPlaybackSlideId] = useState<string | null>(null);
  const playTimeoutRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportQuality, setExportQuality] = useState<number>(1.5);
  const [exportFps, setExportFps] = useState<number>(30);
  const [exportFormat, setExportFormat] = useState<'auto' | 'mp4' | 'webm'>('mp4');

  useEffect(() => {
    if (!isPlaying && !isRecording) {
      setPlaybackSlideId(null);
    }
  }, [isPlaying, isRecording]);

  const startRecording = async () => {
    try {
      const width = project.pitchWidth || PITCH_WIDTH;
      const height = project.pitchHeight || PITCH_HEIGHT;
      const scale = exportQuality;
      const exportWidth = Math.round((width * scale) / 2) * 2;
      const exportHeight = Math.round((height * scale) / 2) * 2;

      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      canvas.style.position = 'fixed';
      canvas.style.bottom = '0';
      canvas.style.right = '0';
      canvas.style.width = '1px';
      canvas.style.height = '1px';
      canvas.style.opacity = '0.01';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        document.body.removeChild(canvas);
        return;
      }

      let bgImg: HTMLImageElement | null = null;
      if (backgroundImage) {
        bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = backgroundImage;
        await new Promise((resolve) => {
          bgImg!.onload = resolve;
          bgImg!.onerror = resolve; 
        });
      }

      if (typeof VideoEncoder === 'undefined') {
        alert("VideoEncoder not supported in this browser. Exporting may fail or be choppy. Use Chrome/Edge for best results.");
      }

      const runExport = async (forceWebm: boolean, forceMp4: boolean) => {
        const fps = exportFps;
        let codec = 'avc1.42E02A'; 
        let isMp4 = forceMp4 || !forceWebm;
        
        let support = await VideoEncoder.isConfigSupported({
          codec, width: exportWidth, height: exportHeight, bitrate: 5_000_000, framerate: fps
        });
        
        if (forceWebm || (!forceMp4 && !support.supported)) {
          isMp4 = false;
          codec = 'vp09.00.10.08';
          support = await VideoEncoder.isConfigSupported({
            codec, width: exportWidth, height: exportHeight, bitrate: 5_000_000, framerate: fps
          });
          if (!support.supported) codec = 'vp8';
        }

        let muxer: any;
        if (isMp4) {
          const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
          muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: { codec: 'avc', width: exportWidth, height: exportHeight },
            fastStart: 'in-memory',
            firstTimestampBehavior: 'offset'
          });
        } else {
          const { Muxer, ArrayBufferTarget } = await import('webm-muxer');
          muxer = new Muxer({
            target: new ArrayBufferTarget(),
            video: { codec: codec.startsWith('vp09') ? 'V_VP9' : 'V_VP8', width: exportWidth, height: exportHeight, frameRate: fps },
            firstTimestampBehavior: 'offset'
          });
        }

        const videoEncoder = new VideoEncoder({
          output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
          error: (e) => console.error('VideoEncoder error:', e)
        });

        videoEncoder.configure({
          codec, width: exportWidth, height: exportHeight, bitrate: 5_000_000, framerate: fps, latencyMode: 'realtime', avc: isMp4 ? { format: 'avc' } : undefined
        });

        setIsRecording(true);
        isRecordingRef.current = true;
        setExportProgress(0);
        
        // Cache the static stadium background once
        const staticCanvas = document.createElement('canvas');
        staticCanvas.width = exportWidth;
        staticCanvas.height = exportHeight;
        const staticCtx = staticCanvas.getContext('2d');
        if (staticCtx) {
           drawStaticBackgroundToCanvas(staticCtx, project, bgImg, pitchTemplate, exportWidth, exportHeight, scale);
        }

        const timeline: { slideIdx: number; startTime: number; transitionEnd: number; endTime: number; slideId: string }[] = [];
        let currentTimeMs = 0;
        
        for (let i = 0; i < project.slides.length; i++) {
          const slide = project.slides[i];
          const slideDurationMs = (slide.duration || 5) * 1000;
          const compiled = compileAnimation(slide);
          let currentSpeedMs = compiled.durationMs;
          const transitionDuration = currentSpeedMs; 
          
          timeline.push({
            slideIdx: i, slideId: slide.id, startTime: currentTimeMs, transitionEnd: currentTimeMs + transitionDuration, endTime: currentTimeMs + transitionDuration + slideDurationMs
          });
          currentTimeMs += transitionDuration + slideDurationMs;
        }
        
        const totalDurationMs = currentTimeMs;
        const frameDuration = 1000 / fps;
        const totalFrames = Math.ceil(totalDurationMs / frameDuration);

        for (let i = 0; i <= totalFrames; i++) {
          if (!isRecordingRef.current) break; 

          if (i % 5 === 0 || i === totalFrames) {
            setExportProgress(Math.min(100, (i / totalFrames) * 100));
          }

          const elapsedMs = i * frameDuration;
          const currentTimelineIdx = timeline.findIndex(t => elapsedMs >= t.startTime && elapsedMs <= t.endTime);
          
          if (currentTimelineIdx !== -1) {
            const tState = timeline[currentTimelineIdx];
            const currentSlide = project.slides[tState.slideIdx];
            const previousSlide = tState.slideIdx > 0 ? project.slides[tState.slideIdx - 1] : null;

            if (i % 15 === 0) setPlaybackSlideId(currentSlide.id);

            let progress = 1;
            if (elapsedMs < tState.transitionEnd && tState.transitionEnd > tState.startTime) {
              progress = (elapsedMs - tState.startTime) / (tState.transitionEnd - tState.startTime);
              progress = Math.max(0, Math.min(1, progress));
            }
            
            const slideCoinSettings = currentSlide.coinSettings || coinSettings;
            
            ctx.clearRect(0, 0, exportWidth, exportHeight);
            
            try {
              drawBoardToCanvas(ctx, project, currentSlide, previousSlide, progress, slideCoinSettings, bgImg, pitchTemplate, exportWidth, exportHeight, scale, null, null, false, [], null, null, staticCanvas);
            } catch (err) {
              console.error("drawBoardToCanvas error in export:", err);
            }

            const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
            videoEncoder.encode(frame, { keyFrame: i % fps === 0 });
            frame.close();

            if (videoEncoder.encodeQueueSize > 30) {
              await new Promise(resolve => setTimeout(resolve, 30));
            } else if (i % 5 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        }

        if (isRecordingRef.current) {
          await videoEncoder.flush();
          videoEncoder.close();
          muxer.finalize();
          
          const { buffer } = muxer.target;
          const blob = new Blob([buffer], { type: isMp4 ? 'video/mp4' : 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safeName = (project.name || 'tactico-export').replace(/[^a-z0-9]/gi, '_').toLowerCase();
          a.download = isMp4 ? `${safeName}.mp4` : `${safeName}.webm`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
          videoEncoder.close();
        }
      };

      try {
        await runExport(exportFormat === 'webm', exportFormat === 'mp4');
      } catch (err) {
         if (exportFormat === 'auto') {
             try {
               await runExport(true, false);
             } catch (fallbackErr) {
               throw fallbackErr;
             }
         } else {
             alert(`Export failed for format ${exportFormat}. Error: ${err}`);
             throw err;
         }
      } finally {
        setIsRecording(false);
        isRecordingRef.current = false;
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    } catch (err) {
      alert("Failed to start recording.");
      setIsRecording(false);
      isRecordingRef.current = false;
      document.querySelectorAll('canvas').forEach(c => {
        if (c.style.pointerEvents === 'none') c.remove();
      });
    }
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
  };

  const handleExportImage = async () => {
    try {
      const width = project.pitchWidth || PITCH_WIDTH;
      const height = project.pitchHeight || PITCH_HEIGHT;
      const scale = 2;
      const exportWidth = Math.round((width * scale) / 2) * 2;
      const exportHeight = Math.round((height * scale) / 2) * 2;

      const canvas = document.createElement('canvas');
      canvas.width = exportWidth;
      canvas.height = exportHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let bgImg: HTMLImageElement | null = null;
      if (backgroundImage) {
        bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = backgroundImage;
        await new Promise((resolve) => {
          bgImg!.onload = resolve;
          bgImg!.onerror = resolve; 
        });
      }

      ctx.clearRect(0, 0, exportWidth, exportHeight);

      const currentSlide = project.slides.find(s => s.id === (playbackSlideId || project.currentSlideId));
      if (!currentSlide) return;

      drawBoardToCanvas(ctx, project, currentSlide, currentSlide, 1, coinSettings, bgImg, pitchTemplate, exportWidth, exportHeight, scale);

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      const safeName = (project.name || 'tactico-slide').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${safeName}-${currentSlide.id || 'export'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(`Image export failed. Error: ${err}`);
    }
  };

  const playNextSlide = useCallback(() => {
      if (!isPlaying) return;
      setPlaybackSlideId(prevId => {
          const currentProject = history[historyIndex];
          const activeId = prevId || currentProject.currentSlideId;
          const slideIdx = currentProject.slides.findIndex(s => s.id === activeId);
          if (slideIdx === -1) return prevId;
          let nextSlideIdx = slideIdx + 1;
          if (nextSlideIdx >= currentProject.slides.length) {
              setIsPlaying(false);
              return prevId;
          }
          return currentProject.slides[nextSlideIdx].id;
      });
  }, [isPlaying, history, historyIndex]);

  useEffect(() => {
    if (isPlaying) {
      const activeId = playbackSlideId || project.currentSlideId;
      const currentSlide = project.slides.find(s => s.id === activeId);
      let speedMs = (currentSlide?.transitionSpeed || 1) * 1000;
      const slideDurationMs = (currentSlide?.duration || 5) * 1000;
      
      if (currentSlide) {
          const compiled = compileAnimation(currentSlide);
          speedMs = compiled.durationMs;
      }
      
      const isFirstSlide = project.slides.length > 0 && project.slides[0].id === activeId;
      const delayMs = speedMs + slideDurationMs;
      
      playTimeoutRef.current = window.setTimeout(() => {
          playNextSlide();
      }, delayMs);
    }

    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, [isPlaying, playbackSlideId, project.currentSlideId, playNextSlide, project.slides]);

  return {
    isPlaying,
    setIsPlaying,
    playbackSlideId,
    setPlaybackSlideId,
    isRecording,
    exportProgress,
    exportQuality,
    setExportQuality,
    exportFps,
    setExportFps,
    exportFormat,
    setExportFormat,
    startRecording,
    stopRecording,
    handleExportImage
  };
};
