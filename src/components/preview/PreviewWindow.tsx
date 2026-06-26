import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { ClipEffect, Clip } from '../../types';
import { clsx } from 'clsx';

const buildCSSFilter = (effects: ClipEffect): string => {
  const parts: string[] = [];
  if (effects.preset === 'invert') parts.push('invert(1)');
  if (effects.preset === 'grayscale') parts.push('grayscale(1)');
  if (effects.preset === 'sepia') parts.push('sepia(1)');
  parts.push(`brightness(${effects.brightness}%)`);
  parts.push(`contrast(${effects.contrast}%)`);
  parts.push(`saturate(${effects.saturation}%)`);
  parts.push(`hue-rotate(${effects.hue}deg)`);
  if (effects.blur > 0) parts.push(`blur(${effects.blur}px)`);
  if (effects.opacity < 100) parts.push(`opacity(${effects.opacity}%)`);
  return parts.join(' ');
};

export const PreviewWindow: React.FC = () => {
  const { currentTime, setCurrentTime, duration, tracks, assets } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number | null>(null);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const initialTime = currentTime;

      const animate = (time: number) => {
        const delta = (time - startTime) / 1000;
        const newTime = initialTime + delta;

        if (newTime >= duration) {
          setCurrentTime(duration);
          setIsPlaying(false);
          return;
        }

        setCurrentTime(newTime);
        requestRef.current = requestAnimationFrame(animate);
      };

      requestRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isPlaying, duration]);

  // Find top-most active video clip
  const videoTracks = tracks.filter(t => t.type === 'video');
  let activeVideoClip = null;
  for (let i = videoTracks.length - 1; i >= 0; i--) {
    const clip = videoTracks[i].clips.find(c =>
      currentTime >= c.startTime && currentTime <= c.startTime + c.duration
    );
    if (clip) {
      activeVideoClip = clip;
      break;
    }
  }

  const activeAsset = activeVideoClip ? assets.find(a => a.id === activeVideoClip.assetId) : null;

  useEffect(() => {
    if (videoRef.current && activeVideoClip && activeAsset) {
      const clipLocalTime = currentTime - activeVideoClip.startTime + activeVideoClip.offset;
      if (isPlaying) {
        if (Math.abs(videoRef.current.currentTime - clipLocalTime) > 0.05) {
            videoRef.current.currentTime = clipLocalTime;
        }
      }
    }
  }, [currentTime, activeVideoClip, activeAsset, isPlaying]);

  // Debounced seek for scrubbing
  useEffect(() => {
    if (isPlaying || !videoRef.current || !activeVideoClip || !activeAsset) return;
    const clipLocalTime = currentTime - activeVideoClip.startTime + activeVideoClip.offset;
    const timeout = setTimeout(() => {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - clipLocalTime) > 0.05) {
        videoRef.current.currentTime = clipLocalTime;
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [currentTime, activeVideoClip, activeAsset, isPlaying]);

  // Text overlays
  const activeTextClips = tracks
    .filter(t => t.type === 'text')
    .flatMap(t => t.clips)
    .filter(c => currentTime >= c.startTime && currentTime < c.startTime + c.duration);

  // Transition preview
  const transitionProgress = activeVideoClip && activeVideoClip.transitionIn.type !== 'none'
    ? Math.min(1, (currentTime - activeVideoClip.startTime) / activeVideoClip.transitionIn.duration)
    : 1;

  return (
    <div className="flex-1 bg-black/40 flex flex-col items-center justify-center relative group overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center p-12">
        <div className="relative aspect-video w-full max-w-4xl bg-black shadow-2xl rounded-lg overflow-hidden flex items-center justify-center">
          {activeAsset ? (
            <video
              ref={videoRef}
              src={activeAsset.url}
              className="w-full h-full object-contain transition-opacity duration-100"
              muted={isMuted}
              style={{
                filter: activeVideoClip ? buildCSSFilter(activeVideoClip.effects) : 'none',
                opacity: transitionProgress
              }}
            />
          ) : (
            <div className="flex flex-col items-center space-y-4 opacity-20">
              <div className="w-24 h-24 border-4 border-dashed border-white rounded-2xl flex items-center justify-center">
                <Play size={48} className="ml-2" />
              </div>
              <p className="text-sm font-bold tracking-widest uppercase">Canvas Empty</p>
            </div>
          )}

          {/* Text Overlays */}
          {activeTextClips.map((clip) => (
            <TextOverlay key={clip.id} clip={clip} />
          ))}
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-8 bg-surface/90 backdrop-blur-xl px-8 py-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-all duration-300 border border-white/10 shadow-2xl translate-y-2 group-hover:translate-y-0">
        <button className="text-gray-400 hover:text-white transition-colors" onClick={() => setCurrentTime(Math.max(0, currentTime - 5))}>
          <SkipBack size={22} fill="currentColor" />
        </button>

        <button
          className="w-12 h-12 flex items-center justify-center bg-primary rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/30"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>

        <button className="text-gray-400 hover:text-white transition-colors" onClick={() => setCurrentTime(Math.min(duration, currentTime + 5))}>
          <SkipForward size={22} fill="currentColor" />
        </button>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <button className="text-gray-400 hover:text-white transition-colors" onClick={() => setIsMuted(!isMuted)}>
          {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
      </div>
    </div>
  );
};

const TextOverlay: React.FC<{ clip: Clip }> = ({ clip }) => {
    const style = clip.textStyle!;
    const fonts: any = { sans: 'sans-serif', serif: 'serif', mono: 'monospace', display: 'Impact' };

    return (
        <div
            className={clsx(
                "absolute pointer-events-none whitespace-pre-wrap flex flex-col",
                style.animationIn === 'fadein' && "animate-in fade-in duration-500",
                style.animationIn === 'slideup' && "animate-in slide-in-from-bottom duration-500",
                style.animationIn === 'slidedown' && "animate-in slide-in-from-top duration-500"
            )}
            style={{
                left: `${style.positionX}%`,
                top: `${style.positionY}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: fonts[style.fontFamily],
                fontSize: `${style.fontSize}px`,
                color: style.color,
                backgroundColor: style.backgroundColor,
                fontWeight: style.bold ? 'bold' : 'normal',
                fontStyle: style.italic ? 'italic' : 'normal',
                textAlign: style.alignment as any,
                padding: '0.2em 0.5em',
                borderRadius: '4px'
            }}
        >
            {style.content}
        </div>
    );
};
