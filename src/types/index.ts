export interface ClipEffect {
  brightness: number;   // 0–200, default 100
  contrast: number;     // 0–200, default 100
  saturation: number;   // 0–200, default 100
  hue: number;          // -180 to 180, default 0
  blur: number;         // 0–20px, default 0
  opacity: number;      // 0–100, default 100
  preset: 'none' | 'grayscale' | 'sepia' | 'invert' | 'vivid' | 'cinematic' | 'warm' | 'cool';
}

export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipeleft' | 'wiperight' | 'slideleft' | 'slideright';

export interface ClipTransition {
  type: TransitionType;
  duration: number; // seconds, default 0.5
}

export type TrackType = 'video' | 'audio';

export interface Asset {
  id: string;
  name: string;
  type: 'video' | 'audio';
  url: string;
  duration: number;
  hasAudio: boolean;
  file: File;
}

export interface Clip {
  id: string;
  assetId: string;
  trackId: string;
  startTime: number; // Start time on the timeline (seconds)
  duration: number; // Duration of the clip (seconds)
  offset: number; // Offset within the original asset (seconds)
  effects: ClipEffect;
  transitionIn: ClipTransition;
}

export interface Track {
  id: string;
  type: TrackType;
  clips: Clip[];
}

export interface TimelineState {
  tracks: Track[];
  currentTime: number;
  duration: number;
  zoom: number;
  selectedClipId: string | null;
}
