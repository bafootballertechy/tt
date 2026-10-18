import type { Project } from '../../types';

/**
 * Format bytes into human-readable size (e.g., 24.5 MB, 1.2 GB)
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Clean and normalize a video filename or project title for comparison
 */
export function normalizeVideoName(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    // Remove video file extensions
    .replace(/\.(mp4|mov|mkv|webm|avi|m4v|wmv|flv|ts|mts|m2ts)$/i, '')
    // Replace punctuation, separators, and underscores with single space
    .replace(/[._\-[\]()+–—/\\|:]+/g, ' ')
    // Remove common broadcast/tagging noise words
    .replace(/\b(full|game|match|playmate|footage|clip|video|hd|1080p|720p|4k|raw)\b/gi, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a string into words
 */
function tokenize(str: string): Set<string> {
  const normalized = normalizeVideoName(str);
  if (!normalized) return new Set();
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  return new Set(words);
}

/**
 * Calculate similarity score between two strings (0.0 to 1.0)
 */
export function calculateMatchScore(filename: string, expectedFileName?: string, projectName?: string): number {
  const normFile = normalizeVideoName(filename);
  if (!normFile) return 0;

  let bestScore = 0;

  // 1. Compare with expectedFileName if provided
  if (expectedFileName) {
    const normExpected = normalizeVideoName(expectedFileName);
    if (normExpected === normFile) {
      return 1.0; // Perfect match
    }
    if (normExpected && (normFile.includes(normExpected) || normExpected.includes(normFile))) {
      bestScore = Math.max(bestScore, 0.9);
    }

    // Jaccard similarity of tokens
    const tokensFile = tokenize(normFile);
    const tokensExpected = tokenize(normExpected);
    if (tokensFile.size > 0 && tokensExpected.size > 0) {
      let intersection = 0;
      tokensFile.forEach(t => {
        if (tokensExpected.has(t)) intersection++;
      });
      const union = new Set([...tokensFile, ...tokensExpected]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      bestScore = Math.max(bestScore, jaccard * 0.88);
    }
  }

  // 2. Compare with projectName if provided
  if (projectName) {
    const normProject = normalizeVideoName(projectName);
    if (normProject === normFile) {
      bestScore = Math.max(bestScore, 0.95);
    }
    if (normProject && (normFile.includes(normProject) || normProject.includes(normFile))) {
      bestScore = Math.max(bestScore, 0.85);
    }

    // Jaccard similarity of tokens with project name
    const tokensFile = tokenize(normFile);
    const tokensProject = tokenize(normProject);
    if (tokensFile.size > 0 && tokensProject.size > 0) {
      let intersection = 0;
      tokensFile.forEach(t => {
        if (tokensProject.has(t)) intersection++;
      });
      const union = new Set([...tokensFile, ...tokensProject]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      bestScore = Math.max(bestScore, jaccard * 0.85);
    }
  }

  return Math.min(1.0, Math.round(bestScore * 100) / 100);
}

/**
 * Smart automatic matcher: assigns staged files to projects based on best similarity scores.
 * Uses greedy best-first assignment without duplicate assignments.
 */
export function autoMatchVideosToProjects(
  projects: Project[],
  files: File[],
  existingBlobs?: Map<string, string>
): { assignments: Record<string, File>; scores: Record<string, number> } {
  const assignments: Record<string, File> = {};
  const scores: Record<string, number> = {};

  if (!projects.length || !files.length) {
    return { assignments, scores };
  }

  // Filter projects that don't already have a working blob, or include all
  const targetProjects = projects;
  const availableFiles = [...files];

  // Calculate matrix of scores: [projectIndex, fileIndex, score]
  interface Candidate {
    projectId: string;
    file: File;
    score: number;
  }

  const candidates: Candidate[] = [];

  targetProjects.forEach(proj => {
    availableFiles.forEach(file => {
      const score = calculateMatchScore(file.name, proj.fileName, proj.name);
      if (score >= 0.2) {
        candidates.push({
          projectId: proj.id,
          file,
          score
        });
      }
    });
  });

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  const assignedProjects = new Set<string>();
  const assignedFileNames = new Set<string>();

  for (const cand of candidates) {
    if (!assignedProjects.has(cand.projectId) && !assignedFileNames.has(cand.file.name)) {
      assignments[cand.projectId] = cand.file;
      scores[cand.projectId] = cand.score;
      assignedProjects.add(cand.projectId);
      assignedFileNames.add(cand.file.name);
    }
  }

  return { assignments, scores };
}
