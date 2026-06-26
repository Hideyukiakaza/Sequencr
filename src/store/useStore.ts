import { create } from 'zustand';
import type { TimelineState, Track, Clip, Asset, ClipEffect, ClipTransition, TextStyle } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const DEFAULT_EFFECTS: ClipEffect = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  opacity: 100,
  preset: 'none',
};

export const DEFAULT_TRANSITION: ClipTransition = {
  type: 'none',
  duration: 0.5,
};

export const DEFAULT_TEXT_STYLE: TextStyle = {
  content: 'New Text',
  fontFamily: 'sans',
  fontSize: 48,
  color: '#ffffff',
  backgroundColor: 'transparent',
  bold: false,
  italic: false,
  alignment: 'center',
  positionX: 50,
  positionY: 80,
  animationIn: 'none',
  animationDuration: 0.5,
};

interface AppState extends TimelineState {
  assets: Asset[];
  isEffectsPanelOpen: boolean;

  // UI actions
  toggleEffectsPanel: () => void;

  // Asset actions
  addAsset: (asset: Asset) => void;

  // Timeline actions
  addTrack: (type: 'video' | 'audio' | 'text') => void;
  addClip: (trackId: string, assetId: string | 'text', startTime: number) => void;
  updateClip: (clipId: string, updates: Partial<Clip>) => void;
  removeClip: (clipId: string) => void;
  splitClip: (clipId: string, time: number) => void;
  setTracks: (tracks: Track[]) => void;

  // Effects, Transitions, Audio & Text
  updateClipEffects: (clipId: string, effects: Partial<ClipEffect>) => void;
  updateClipTransition: (clipId: string, transition: ClipTransition) => void;
  updateClipAudio: (clipId: string, audio: Partial<Pick<Clip, 'volume' | 'fadeInDuration' | 'fadeOutDuration'>>) => void;
  updateClipText: (clipId: string, style: Partial<TextStyle>) => void;

  // Playback actions
  setCurrentTime: (time: number) => void;
  setZoom: (zoom: number) => void;
  setSelectedClipId: (id: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
  assets: [],
  tracks: [
    { id: 'text-1', type: 'text', clips: [] },
    { id: 'video-1', type: 'video', clips: [] },
    { id: 'video-2', type: 'video', clips: [] },
    { id: 'audio-1', type: 'audio', clips: [] },
    { id: 'audio-2', type: 'audio', clips: [] },
  ],
  currentTime: 0,
  duration: 600,
  zoom: 10,
  selectedClipId: null,
  isEffectsPanelOpen: true,

  toggleEffectsPanel: () => set((state) => ({ isEffectsPanelOpen: !state.isEffectsPanelOpen })),

  addAsset: (asset) => set((state) => ({ assets: [...state.assets, asset] })),

  addTrack: (type) => set((state) => ({
    tracks: [...state.tracks, { id: `${type}-${uuidv4()}`, type, clips: [] }]
  })),

  addClip: (trackId, assetId, startTime) => set((state) => {
    const isText = assetId === 'text';
    const asset = !isText ? state.assets.find(a => a.id === assetId) : null;

    if (!isText && !asset) return state;

    const newClip: Clip = {
      id: uuidv4(),
      assetId: isText ? 'text-asset' : assetId,
      trackId,
      startTime,
      duration: isText ? 5 : asset!.duration,
      offset: 0,
      effects: { ...DEFAULT_EFFECTS },
      transitionIn: { ...DEFAULT_TRANSITION },
      volume: 100,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      textStyle: isText ? { ...DEFAULT_TEXT_STYLE } : undefined,
    };

    return {
      tracks: state.tracks.map(track =>
        track.id === trackId
          ? { ...track, clips: [...track.clips, newClip] }
          : track
      )
    };
  }),

  updateClip: (clipId, updates) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...updates } : clip
      )
    }))
  })),

  removeClip: (clipId) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.filter(clip => clip.id !== clipId)
    })),
    selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId
  })),

  splitClip: (clipId, time) => set((state) => {
    let targetClip: Clip | null = null;
    let targetTrackId = '';

    for (const track of state.tracks) {
      const clip = track.clips.find(c => c.id === clipId);
      if (clip) {
        targetClip = clip;
        targetTrackId = track.id;
        break;
      }
    }

    if (!targetClip || time <= targetClip.startTime || time >= targetClip.startTime + targetClip.duration) {
      return state;
    }

    const splitPointInClip = time - targetClip.startTime;

    const firstHalf: Clip = {
      ...targetClip,
      duration: splitPointInClip,
    };

    const secondHalf: Clip = {
      ...targetClip,
      id: uuidv4(),
      startTime: time,
      duration: targetClip.duration - splitPointInClip,
      offset: targetClip.offset + splitPointInClip,
    };

    return {
      tracks: state.tracks.map(track =>
        track.id === targetTrackId
          ? { ...track, clips: track.clips.flatMap(c => c.id === clipId ? [firstHalf, secondHalf] : [c]) }
          : track
      )
    };
  }),

  updateClipEffects: (clipId, effects) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, effects: { ...clip.effects, ...effects } } : clip
      )
    }))
  })),

  updateClipTransition: (clipId, transition) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, transitionIn: transition } : clip
      )
    }))
  })),

  updateClipAudio: (clipId, audio) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, ...audio } : clip
      )
    }))
  })),

  updateClipText: (clipId, style) => set((state) => ({
    tracks: state.tracks.map(track => ({
      ...track,
      clips: track.clips.map(clip =>
        clip.id === clipId ? { ...clip, textStyle: { ...clip.textStyle!, ...style } } : clip
      )
    }))
  })),

  setTracks: (tracks) => set({ tracks }),

  setCurrentTime: (currentTime) => set({ currentTime }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedClipId: (selectedClipId) => set({ selectedClipId }),
}));
