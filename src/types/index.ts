export interface ClipEffect {
  brightness: number;   // 0–200, default 100
  contrast: number;     // 0–200, default 100
  saturation: number;   // 0–200, default 100
  hue: number;          // -180 to 180, default 0
  blur: number;         // 0–20px, default 0
  opacity: number;      // 0–100, default 100
  preset: 'none' | 'grayscale' | 'sepia' | 'invert' | 'vivid' | 'cinematic' | 'warm' | 'cool';
}

export type TransitionType =
  | 'none'
  | 'fade'
  | 'dissolve'
  | 'wipeleft'
  | 'wiperight'
  | 'wiperightdown'
  | 'slideleft'
  | 'slideright'
  | 'zoom';

export interface ClipTransition {
  type: TransitionType;
  duration: number; // seconds, default 0.5
}

export interface TextStyle {
  content: string;
  fontFamily: string;   // 'sans' | 'serif' | 'mono' | 'display'
  fontSize: number;     // 12–120, default 48
  color: string;        // hex, default '#ffffff'
  backgroundColor: string; // hex or 'transparent', default 'transparent'
  bold: boolean;
  italic: boolean;
  alignment: 'left' | 'center' | 'right';
  positionX: number;    // 0–100 (percent of canvas width), default 50
  positionY: number;    // 0–100 (percent of canvas height), default 80
  animationIn: 'none' | 'fadein' | 'slideup' | 'slidedown';
  animationDuration: number; // seconds, default 0.5
}

export type TrackType = 'video' | 'audio' | 'text';

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
  volume: number;        // 0–200, default 100
  fadeInDuration: number;   // seconds, default 0
  fadeOutDuration: number;  // seconds, default 0
  textStyle?: TextStyle;
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
