import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { ClipItem } from './ClipItem';
import { Scissors, Trash2, Plus, Minus, Type } from 'lucide-react';

export const Timeline: React.FC = () => {
  const {
    tracks,
    currentTime,
    setCurrentTime,
    zoom,
    setZoom,
    duration,
    addClip,
    selectedClipId,
    removeClip,
    splitClip
  } = useStore();

  const timelineRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
        if (timelineRef.current) setContainerWidth(timelineRef.current.clientWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === 's') {
        if (selectedClipId) splitClip(selectedClipId, currentTime);
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) removeClip(selectedClipId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, currentTime, splitClip, removeClip]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    if (x > 96) {
      const time = (x - 96) / zoom;
      setCurrentTime(Math.max(0, Math.min(time, duration)));
    }
  };

  const onDrop = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('assetId');
    if (!assetId || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft - 96;
    const startTime = Math.max(0, x / zoom);
    addClip(trackId, assetId as any, startTime);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
      setScrollLeft(e.currentTarget.scrollLeft);
  };

  return (
    <div className="flex-1 flex flex-col bg-background border-t border-gray-800 overflow-hidden no-select">
      <div className="h-10 border-b border-gray-800 flex items-center justify-between px-4 bg-surface">
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-400 font-mono w-20">
            {new Date(currentTime * 1000).toISOString().substr(11, 8)}
          </span>
          <div className="h-4 w-px bg-gray-700" />
          <button onClick={() => selectedClipId && splitClip(selectedClipId, currentTime)} disabled={!selectedClipId} className="p-1.5 hover:bg-surface-light rounded disabled:opacity-30 text-gray-300 transition-colors" title="Split (S)"><Scissors size={16} /></button>
          <button onClick={() => selectedClipId && removeClip(selectedClipId)} disabled={!selectedClipId} className="p-1.5 hover:bg-red-900/30 hover:text-red-400 rounded disabled:opacity-30 text-gray-300 transition-colors" title="Delete (Del)"><Trash2 size={16} /></button>
          <div className="h-4 w-px bg-gray-700" />
          <button onClick={() => {
              const textTrack = tracks.find(t => t.type === 'text');
              if (textTrack) addClip(textTrack.id, 'text', currentTime);
          }} className="p-1.5 hover:bg-purple-900/30 text-purple-400 rounded transition-colors" title="Add Text"><Type size={16} /></button>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => setZoom(Math.max(1, zoom - 2))} className="p-1 hover:bg-surface-light rounded transition-colors"><Minus size={16} /></button>
          <span className="text-[10px] text-gray-500 w-8 text-center">{zoom}x</span>
          <button onClick={() => setZoom(Math.min(100, zoom + 2))} className="p-1 hover:bg-surface-light rounded transition-colors"><Plus size={16} /></button>
        </div>
      </div>

      <div ref={timelineRef} className="flex-1 overflow-auto relative custom-scrollbar" onClick={handleTimelineClick} onScroll={handleScroll}>
        <div className="absolute top-0 bottom-0 w-px bg-red-500 z-50 pointer-events-none" style={{ left: 96 + currentTime * zoom }}>
          <div className="absolute -top-1 -left-1.5 w-3 h-3 bg-red-500 rounded-full shadow-sm" />
        </div>
        <div className="h-8 border-b border-gray-800 relative bg-surface-light" style={{ width: 96 + duration * zoom }}>
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-surface border-r border-gray-800 z-20" />
          <div className="ml-24 relative h-full">
            {Array.from({ length: Math.ceil(duration) }).map((_, i) => (
                (i * zoom >= scrollLeft - 100 && i * zoom <= scrollLeft + containerWidth + 100) &&
                <div key={i} className="absolute top-0 border-l border-gray-700 h-full flex flex-col justify-end pb-1 pl-1" style={{ left: i * zoom }}>
                    {i % 5 === 0 && <span className="text-[10px] text-gray-500">{i}s</span>}
                </div>
            ))}
          </div>
        </div>
        <div className="min-w-full" style={{ width: 96 + duration * zoom }}>
          {tracks.map((track) => (
            <div key={track.id} className={`h-16 border-b border-gray-800 relative group transition-colors ${track.type === 'video' ? 'bg-black/10' : track.type === 'text' ? 'bg-purple-900/5' : 'bg-black/20'}`} onDragOver={onDragOver} onDrop={(e) => onDrop(e, track.id)}>
              <div className="absolute left-0 top-0 bottom-0 w-24 bg-surface border-r border-gray-800 z-10 flex flex-col justify-center px-3">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">{track.type}</span>
              </div>
              <div className="ml-24 h-full relative">
                {track.clips.map((clip) => {
                    const isVisible = (clip.startTime * zoom <= scrollLeft + containerWidth + 200) && ((clip.startTime + clip.duration) * zoom >= scrollLeft - 200);
                    return isVisible ? <ClipItem key={clip.id} clip={clip} /> : null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
