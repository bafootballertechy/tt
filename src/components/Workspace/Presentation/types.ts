import { Playlist, TagEvent } from '../../../types';

export interface PresentationConfig {
  selectedPlaylistIds: string[];
  orderedPlaylistIds: string[];
  loop: boolean;
  pauseBetweenPlaylists: boolean;
  showDrawings: boolean;
}

export interface PresentationSegment {
  playlistId: string;
  playlistName: string;
  playlistIndex: number;
  totalPlaylists: number;
  clipIndex: number;
  totalClipsInPlaylist: number;
  eventId: string;
  startTime: number;
  endTime: number;
  duration: number;
  tagColor?: string;
  tagName?: string;
  notes?: string;
  projectId?: string;
  projectName?: string;
}
