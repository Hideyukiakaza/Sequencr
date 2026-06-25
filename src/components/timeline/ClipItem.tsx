import React from 'react';
import { useStore, DEFAULT_EFFECTS } from '../../store/useStore';
import type { Clip } from '../../types';
import { clsx } from 'clsx';
import { Sparkles } from 'lucide-react';

interface ClipItemProps {
  clip: Clip;
}

export const ClipItem: React.FC<ClipItemProps> = ({ clip }) => {
  const { zoom, assets, setSelectedClipId, selectedClipId, updateClip } = useStore();
  const asset = assets.find(a => a.id === clip.assetId);

  const isSelected = selectedClipId === clip.id;

  const hasEffects = JSON.stringify(clip.effects) !== JSON.stringify(DEFAULT_EFFECTS);

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

  if (!asset) return null;

  return (
    <div
      onPointerDown={handlePointerDown}
      className={clsx(
        "absolute top-1 bottom-1 rounded-sm border cursor-move transition-colors overflow-hidden select-none",
        isSelected ? "border-primary bg-primary/30 z-20" : "border-gray-600 bg-gray-700 hover:bg-gray-600 z-10",
        asset.type === 'video' ? "ring-blue-500/10" : "ring-green-500/10"
      )}
      style={{
        left: clip.startTime * zoom,
        width: clip.duration * zoom,
      }}
    >
      <div className="px-2 py-1 flex flex-col justify-center h-full pointer-events-none">
        <div className="flex items-center space-x-1">
          <span className="text-[10px] truncate font-medium">{asset.name}</span>
          {hasEffects && <Sparkles size={10} className="text-primary animate-pulse" />}
        </div>
        <span className="text-[8px] text-white/50">{clip.duration.toFixed(1)}s</span>
      </div>

      {/* Resizers */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 hover:bg-white/30 cursor-ew-resize"
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
        className="absolute right-0 top-0 bottom-0 w-2 hover:bg-white/30 cursor-ew-resize"
        onPointerDown={(e) => {
          e.stopPropagation();
          const startX = e.clientX;
          const initialDuration = clip.duration;

          const handleMove = (me: PointerEvent) => {
            const deltaX = me.clientX - startX;
            const deltaTime = deltaX / zoom;
            const maxDuration = asset.duration - clip.offset;
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
