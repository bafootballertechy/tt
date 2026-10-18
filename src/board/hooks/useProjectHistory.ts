import { useState, useEffect } from 'react';
import { produce } from 'immer';
import { z } from 'zod';
import { Project } from '../types';
import { INITIAL_PROJECT } from '../constants';
import { db } from '../db';

const projectSchema = z.object({
  teams: z.object({
    HOME: z.any(),
    AWAY: z.any(),
    NEUTRAL: z.any()
  }),
  slides: z.array(z.any()).min(1),
  currentSlideId: z.string()
}).passthrough();

export const useProjectHistory = (
  isPlaying: boolean, 
  isRecording: boolean,
  projectId?: string,
  initialProjectData?: Project,
  onSave?: (updatedProject: Project) => void
) => {
  const [historyState, setHistoryState] = useState(() => ({ 
    list: [initialProjectData || INITIAL_PROJECT], 
    index: 0 
  }));
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const targetId = projectId || 'current_project';
  const history = historyState.list;
  const historyIndex = historyState.index;
  const baseProject = history[historyIndex];

  // Load from DB on mount or projectId change
  useEffect(() => {
    let isCancelled = false;
    const loadProject = async () => {
      try {
        const saved = await db.projects.get(targetId);
        if (isCancelled) return;
        if (saved && saved.data) {
          const result = projectSchema.safeParse(saved.data);
          if (result.success) {
            setHistoryState({ list: [result.data as unknown as Project], index: 0 });
          } else {
            console.warn("Invalid project data found, falling back to initial", result.error);
            setHistoryState({ list: [initialProjectData || INITIAL_PROJECT], index: 0 });
          }
        } else if (initialProjectData) {
          setHistoryState({ list: [initialProjectData], index: 0 });
          // Save it to db so it exists
          await db.projects.put({ id: targetId, data: initialProjectData });
        }
      } catch (err) {
        console.error("Failed to load project from IndexedDB:", err);
      } finally {
        if (!isCancelled) {
          setIsDbLoaded(true);
        }
      }
    };
    loadProject();
    return () => {
      isCancelled = true;
    };
  }, [targetId]);

  // Save to DB on change with debounce
  useEffect(() => {
    if (!isDbLoaded) return;
    const currentProject = history[historyIndex];
    if (!currentProject) return;
    
    // Do not save temporary visual states during playback or export
    if (isPlaying || isRecording) return;

    const timer = setTimeout(() => {
      db.projects.put({ id: targetId, data: currentProject }).then(() => {
        setSaveError(null);
        if (onSave) {
          onSave(currentProject);
        }
      }).catch(err => {
        console.error("Failed to save project to IndexedDB:", err);
        setSaveError("⚠️ Local save failed. Your browser storage may be full. Please export your project to avoid losing changes.");
      });
    }, 800);

    return () => clearTimeout(timer);
  }, [history, historyIndex, isDbLoaded, isPlaying, isRecording, targetId]);

  const handleUndo = () => {
    setHistoryState(prev => ({ ...prev, index: prev.index > 0 ? prev.index - 1 : prev.index }));
  };

  const handleRedo = () => {
    setHistoryState(prev => ({ ...prev, index: prev.index < prev.list.length - 1 ? prev.index + 1 : prev.index }));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history.length]);

  const updateProject = (fn: (p: Project) => void, replaceHistory = false) => {
    setHistoryState(prev => {
      const currentProject = prev.list[prev.index];
      const next = produce(currentProject, draft => { 
        fn(draft); 
        // Ensure sequential naming for all slides
        draft.slides.forEach((slide, idx) => {
          slide.name = `Slide ${idx + 1}`;
        });
      });
      
      if (replaceHistory) {
        const newHistory = [...prev.list];
        newHistory[prev.index] = next;
        return { list: newHistory, index: prev.index };
      } else {
        const newHistory = prev.list.slice(0, prev.index + 1);
        newHistory.push(next);
        return { list: newHistory, index: newHistory.length - 1 };
      }
    });
  };

  return {
    historyState,
    setHistoryState,
    baseProject,
    isDbLoaded,
    saveError,
    handleUndo,
    handleRedo,
    updateProject
  };
};
