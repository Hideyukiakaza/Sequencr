import React, { useRef, useEffect, useState } from 'react';
import { useStore, DEFAULT_EFFECTS } from '../../store/useStore';
import type { Clip, Asset } from '../../types';
import { clsx } from 'clsx';
import { Sparkles, Type } from 'lucide-react';

interface ClipItemProps {
  clip: Clip;
}

const waveformCache = new Map<string, string>();

export const ClipItem: React.FC<ClipItemProps> = ({ clip }) => {
  const { zoom, assets, setSelectedClipId, selectedClipId, updateClip } = useStore();
  const asset = assets.find(a => a.id === clip.assetId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const isSelected = selectedClipId === clip.id;
  const isText = !!clip.textStyle;

  const hasEffects = JSON.stringify(clip.effects) !== JSON.stringify(DEFAULT_EFFECTS);

  // Intersection Observer for lazy waveform
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, { threshold: 0.1 });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isVisible && asset && canvasRef.current && !isText) {
        if (waveformCache.has(asset.id)) {
            const img = new Image();
            img.src = waveformCache.get(asset.id)!;
            img.onload = () => {
                const ctx = canvasRef.current!.getContext('2d')!;
                ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                ctx.drawImage(img, 0, 0);
            };
        } else {
            drawWaveform(asset, canvasRef.current);
        }
    }
  }, [isVisible, asset, isText]);

  const drawWaveform = async (asset: Asset, canvas: HTMLCanvasElement) => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await asset.file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const data = audioBuffer.getChannelData(0);
        const width = canvas.width;
        const height = canvas.height;
        const step = Math.floor(data.length / width);
        const ctx = canvas.getContext('2d')!;

        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();

        for (let i = 0; i < width; i++) {
          const slice = data.slice(i * step, (i + 1) * step);
          let max = 0;
          for (let j = 0; j < slice.length; j++) {
              const abs = Math.abs(slice[j]);
              if (abs > max) max = abs;
          }
          const y = (1 - max) * height / 2;
          i === 0 ? ctx.moveTo(i, y) : ctx.lineTo(i, y);
        }
        ctx.stroke();

        waveformCache.set(asset.id, canvas.toDataURL());
        audioCtx.close();
    } catch (e) {
        console.error('Waveform generation failed', e);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);

    const startX = e.clientX;
    const initialStartTime = clip.startTime;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaTime = deltaX / zoom;
      const newStartTime = Math.max(0, initialStartTime + deltaTime);
      updateClip(clip.id, { startTime: newStartTime });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  if (!asset && !isText) return null;

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      className={clsx(
        "absolute top-1 bottom-1 rounded-sm border cursor-move transition-colors overflow-hidden select-none",
        isSelected ? "border-primary bg-primary/30 z-20" :
        isText ? "border-purple-500/50 bg-purple-600/30 hover:bg-purple-600/40 z-10" :
        "border-gray-600 bg-gray-700 hover:bg-gray-600 z-10",
      )}
      style={{
        left: clip.startTime * zoom,
        width: clip.duration * zoom,
      }}
    >
      {/* Waveform Canvas */}
      {!isText && (
        <canvas
          ref={canvasRef}
          width={Math.max(100, clip.duration * zoom)}
          height={60}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      )}

      <div className="px-2 py-1 flex flex-col justify-center h-full pointer-events-none relative z-10 bg-black/20 backdrop-blur-[2px]">
        <div className="flex items-center space-x-1">
          {isText ? <Type size={10} className="text-purple-300" /> : null}
          <span className="text-[10px] truncate font-medium">
            {isText ? clip.textStyle?.content : asset?.name}
          </span>
          {hasEffects && !isText && <Sparkles size={10} className="text-primary animate-pulse" />}
        </div>
        <span className="text-[8px] text-white/50">{clip.duration.toFixed(1)}s</span>
      </div>

      {/* Resizers */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/30 cursor-ew-resize z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const initialStartTime = clip.startTime;
          const initialDuration = clip.duration;
          const initialOffset = clip.offset;

          const handleMove = (me: PointerEvent) => {
            const deltaX = me.clientX - startX;
            const deltaTime = deltaX / zoom;
            const newStartTime = Math.max(0, initialStartTime + deltaTime);
            const actualDelta = newStartTime - initialStartTime;

            const newOffset = Math.max(0, initialOffset + actualDelta);
            const offsetDelta = newOffset - initialOffset;
            const newDuration = Math.max(0.1, initialDuration - offsetDelta);

            updateClip(clip.id, {
              startTime: initialStartTime + offsetDelta,
              duration: newDuration,
              offset: newOffset
            });
          };

          const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
          };

          window.addEventListener('pointermove', handleMove);
          window.addEventListener('pointerup', handleUp);
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/30 cursor-ew-resize z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const initialDuration = clip.duration;

          const handleMove = (me: PointerEvent) => {
            const deltaX = me.clientX - startX;
            const deltaTime = deltaX / zoom;
            const maxDuration = isText ? 60 : (asset!.duration - clip.offset);
            const newDuration = Math.max(0.1, Math.min(maxDuration, initialDuration + deltaTime));
            updateClip(clip.id, { duration: newDuration });
          };

          const handleUp = () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
          };

          window.addEventListener('pointermove', handleMove);
          window.addEventListener('pointerup', handleUp);
        }}
      />
    </div>
  );
};
