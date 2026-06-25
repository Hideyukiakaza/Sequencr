import React, { useCallback } from 'react';
import { useStore } from '../../store/useStore';
import type { Asset } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { Upload, FileVideo, FileAudio } from 'lucide-react';

export const AssetLibrary: React.FC = () => {
  const { assets, addAsset } = useStore();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const type = file.type.startsWith('video') ? 'video' : 'audio';
      const url = URL.createObjectURL(file);

      let duration = 0;
      let hasAudio = true;

      if (type === 'video') {
        const video = document.createElement('video');
        video.src = url;
        video.muted = true;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            duration = video.duration;

            // Heuristic to detect audio
            const v = video as any;
            const maybeHasAudio = v.mozHasAudio !== undefined
              ? v.mozHasAudio
              : (v.webkitAudioDecodedByteCount !== undefined
                  ? v.webkitAudioDecodedByteCount > 0
                  : true);

            // Some browsers support video.audioTracks
            if (v.audioTracks && v.audioTracks.length === 0) {
              hasAudio = false;
            } else {
              hasAudio = maybeHasAudio;
            }

            resolve(null);
          };
          video.onerror = () => resolve(null);
        });
      } else {
        const audio = new Audio(url);
        await new Promise((resolve) => {
          audio.onloadedmetadata = () => {
            duration = audio.duration;
            hasAudio = true;
            resolve(null);
          };
          audio.onerror = () => resolve(null);
        });
      }

      const asset: Asset = {
        id: uuidv4(),
        name: file.name,
        type: type as 'video' | 'audio',
        url,
        duration,
        hasAudio,
        file,
      };
      addAsset(asset);
    }
  }, [addAsset]);

  const onDragStart = (e: React.DragEvent, assetId: string) => {
    e.dataTransfer.setData('assetId', assetId);
  };

  return (
    <div className="w-64 bg-surface border-r border-white/5 flex flex-col h-full shadow-xl">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <h2 className="font-bold tracking-tight text-sm uppercase text-gray-400">Assets</h2>
        <label className="cursor-pointer p-1.5 hover:bg-white/5 rounded-lg text-primary transition-all active:scale-90">
          <Upload size={18} />
          <input
            type="file"
            className="hidden"
            accept="video/*,audio/*"
            multiple
            onChange={handleFileUpload}
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {assets.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-30">
            <div className="w-12 h-12 border-2 border-dashed border-white rounded-xl flex items-center justify-center">
              <Upload size={20} />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">No assets yet<br/>Import some files!</p>
          </div>
        )}
        {assets.map((asset: Asset) => (
          <div
            key={asset.id}
            draggable
            onDragStart={(e) => onDragStart(e, asset.id)}
            className="p-3 bg-surface-light/50 border border-white/5 rounded-xl cursor-grab active:cursor-grabbing hover:ring-2 ring-primary/50 transition-all flex items-center space-x-3 group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/0 group-hover:to-primary/5 transition-all" />
            <div className="p-2 bg-background rounded-lg shadow-inner relative z-10">
              {asset.type === 'video' ? (
                <FileVideo size={20} className="text-blue-400" />
              ) : (
                <FileAudio size={20} className="text-green-400" />
              )}
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-[11px] font-bold truncate text-gray-200">{asset.name}</p>
              <div className="flex items-center space-x-2 mt-0.5">
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                  {asset.duration.toFixed(1)}s
                </p>
                <div className="w-1 h-1 rounded-full bg-gray-700" />
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-tighter">
                  {asset.type === 'video' ? 'Video' : 'Audio'}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
