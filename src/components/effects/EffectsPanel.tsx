import React, { useState } from 'react';
import { useStore, DEFAULT_EFFECTS } from '../../store/useStore';
import { ClipEffect, TransitionType, TextStyle } from '../../types';
import { Sliders, Zap, RotateCcw, X, Volume2, VolumeX, AlignLeft, AlignCenter, AlignRight, Bold, Italic } from 'lucide-react';
import { clsx } from 'clsx';

const PRESETS: Record<string, Partial<ClipEffect>> = {
  none:       { ...DEFAULT_EFFECTS, preset: 'none' },
  grayscale:  { saturation: 0, preset: 'grayscale' },
  sepia:      { saturation: 30, brightness: 110, contrast: 90, hue: 20, preset: 'sepia' },
  invert:     { preset: 'invert' },
  vivid:      { saturation: 160, contrast: 115, brightness: 105, preset: 'vivid' },
  cinematic:  { contrast: 120, saturation: 80, brightness: 95, preset: 'cinematic' },
  warm:       { hue: 15, saturation: 120, brightness: 105, preset: 'warm' },
  cool:       { hue: -20, saturation: 90, brightness: 100, preset: 'cool' },
};

const TRANSITIONS: { type: TransitionType; label: string }[] = [
  { type: 'none', label: 'None' },
  { type: 'fade', label: 'Fade' },
  { type: 'dissolve', label: 'Dissolve' },
  { type: 'wipeleft', label: 'Wipe Left' },
  { type: 'wiperight', label: 'Wipe Right' },
  { type: 'wiperightdown', label: 'Wipe Down' },
  { type: 'slideleft', label: 'Slide Left' },
  { type: 'slideright', label: 'Slide Right' },
  { type: 'zoom', label: 'Zoom' },
];

export const EffectsPanel: React.FC = () => {
  const {
    selectedClipId,
    tracks,
    updateClipEffects,
    updateClipTransition,
    updateClipAudio,
    updateClipText,
    isEffectsPanelOpen,
    toggleEffectsPanel
  } = useStore();

  const [activeTab, setActiveTab] = useState<'style' | 'transition' | 'audio' | 'text'>('style');

  const selectedTrack = tracks.find(t => t.clips.some(c => c.id === selectedClipId));
  const selectedClip = selectedTrack?.clips.find(c => c.id === selectedClipId);

  if (!isEffectsPanelOpen) return null;

  if (!selectedClipId || !selectedClip) {
    return (
      <div className="w-[280px] bg-surface border-l border-white/5 flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="p-5 border-b border-white/5 flex justify-between items-center">
          <h2 className="font-bold tracking-tight text-sm uppercase text-gray-400">Properties</h2>
          <button onClick={toggleEffectsPanel} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-20">
          <Sliders size={48} className="mb-4" />
          <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Select a clip to<br/>edit properties</p>
        </div>
      </div>
    );
  }

  const isTextClip = selectedTrack?.type === 'text';

  return (
    <div className="w-[280px] bg-surface border-l border-white/5 flex flex-col h-full animate-in slide-in-from-right duration-300 shadow-2xl">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <h2 className="font-bold tracking-tight text-sm uppercase text-gray-400">Properties</h2>
        <button onClick={toggleEffectsPanel} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex border-b border-white/5 bg-black/20">
        {isTextClip ? (
            <button className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 border-primary text-primary">Text</button>
        ) : (
            <>
                <TabButton active={activeTab === 'style'} label="Style" onClick={() => setActiveTab('style')} />
                <TabButton active={activeTab === 'transition'} label="Transition" onClick={() => setActiveTab('transition')} />
                <TabButton active={activeTab === 'audio'} label="Audio" onClick={() => setActiveTab('audio')} />
            </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isTextClip ? (
            <TextTab clip={selectedClip} onUpdate={(u) => updateClipText(selectedClipId, u)} />
        ) : (
            <>
                {activeTab === 'style' && <StyleTab clip={selectedClip} onUpdate={(u) => updateClipEffects(selectedClipId, u)} onReset={() => updateClipEffects(selectedClipId, DEFAULT_EFFECTS)} />}
                {activeTab === 'transition' && <TransitionTab clip={selectedClip} onUpdate={(u) => updateClipTransition(selectedClipId, u)} />}
                {activeTab === 'audio' && <AudioTab clip={selectedClip} onUpdate={(u) => updateClipAudio(selectedClipId, u)} />}
            </>
        )}
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
    <button
      onClick={onClick}
      className={clsx(
        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
        active ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-300"
      )}
    >
      {label}
    </button>
);

const StyleTab: React.FC<{ clip: any; onUpdate: (u: any) => void; onReset: () => void }> = ({ clip, onUpdate, onReset }) => (
    <div className="p-5 space-y-6">
        <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 block">Presets</label>
            <div className="grid grid-cols-2 gap-2">
            {Object.keys(PRESETS).map((name) => (
                <button
                key={name}
                onClick={() => onUpdate({ ...DEFAULT_EFFECTS, ...PRESETS[name] })}
                className={clsx(
                    "py-2 px-3 rounded-lg text-[10px] font-bold capitalize transition-all border",
                    clip.effects.preset === name
                    ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10"
                    : "bg-white/5 border-transparent hover:bg-white/10 text-gray-400"
                )}
                >
                {name}
                </button>
            ))}
            </div>
        </div>
        <div className="h-px bg-white/5" />
        <div className="space-y-4">
            <Slider label="Brightness" value={clip.effects.brightness} min={0} max={200} onChange={(v) => onUpdate({ brightness: v, preset: 'none' })} />
            <Slider label="Contrast" value={clip.effects.contrast} min={0} max={200} onChange={(v) => onUpdate({ contrast: v, preset: 'none' })} />
            <Slider label="Saturation" value={clip.effects.saturation} min={0} max={200} onChange={(v) => onUpdate({ saturation: v, preset: 'none' })} />
            <Slider label="Hue" value={clip.effects.hue} min={-180} max={180} onChange={(v) => onUpdate({ hue: v, preset: 'none' })} />
            <Slider label="Blur" value={clip.effects.blur} min={0} max={20} step={0.5} onChange={(v) => onUpdate({ blur: v, preset: 'none' })} />
            <Slider label="Opacity" value={clip.effects.opacity} min={0} max={100} onChange={(v) => onUpdate({ opacity: v, preset: 'none' })} />
        </div>
        <button onClick={onReset} className="w-full py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center space-x-2">
            <RotateCcw size={14} />
            <span>Reset Effects</span>
        </button>
    </div>
);

const TransitionTab: React.FC<{ clip: any; onUpdate: (u: any) => void }> = ({ clip, onUpdate }) => (
    <div className="p-5 space-y-6">
        <div>
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 block">In Transition</label>
            <div className="grid grid-cols-2 gap-2">
            {TRANSITIONS.map((t) => (
                <button
                key={t.type}
                onClick={() => onUpdate({ ...clip.transitionIn, type: t.type })}
                className={clsx(
                    "py-3 px-3 rounded-xl text-[10px] font-bold transition-all border flex flex-col items-center justify-center space-y-2",
                    clip.transitionIn.type === t.type
                    ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10"
                    : "bg-white/5 border-transparent hover:bg-white/10 text-gray-400"
                )}
                >
                <Zap size={16} className={clip.transitionIn.type === t.type ? "text-primary" : "text-gray-600"} />
                <span>{t.label}</span>
                </button>
            ))}
            </div>
        </div>
        {clip.transitionIn.type !== 'none' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <Slider label="Duration (s)" value={clip.transitionIn.duration} min={0.1} max={2.0} step={0.1} onChange={(v) => onUpdate({ ...clip.transitionIn, duration: v })} />
            </div>
        )}
    </div>
);

const AudioTab: React.FC<{ clip: any; onUpdate: (u: any) => void }> = ({ clip, onUpdate }) => (
    <div className="p-5 space-y-6">
        <div className="flex flex-col items-center justify-center p-6 bg-black/20 rounded-2xl border border-white/5">
            <svg width="100%" height="40" viewBox="0 0 200 40" className="text-primary overflow-visible">
                <path
                    d={`M 0 40 L ${clip.fadeInDuration * 20} 0 L ${200 - clip.fadeOutDuration * 20} 0 L 200 40`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                />
            </svg>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-600 mt-4">Envelope</span>
        </div>
        <div className="space-y-4">
            <div className="flex items-center space-x-3">
                {clip.volume === 0 ? <VolumeX size={14} className="text-red-500" /> : <Volume2 size={14} className="text-primary" />}
                <div className="flex-1">
                    <Slider label="Volume" value={clip.volume} min={0} max={200} onChange={(v) => onUpdate({ volume: v })} />
                </div>
            </div>
            <Slider label="Fade In (s)" value={clip.fadeInDuration} min={0} max={3.0} step={0.1} onChange={(v) => onUpdate({ fadeInDuration: v })} />
            <Slider label="Fade Out (s)" value={clip.fadeOutDuration} min={0} max={3.0} step={0.1} onChange={(v) => onUpdate({ fadeOutDuration: v })} />
        </div>
    </div>
);

const TextTab: React.FC<{ clip: any; onUpdate: (u: Partial<TextStyle>) => void }> = ({ clip, onUpdate }) => (
    <div className="p-5 space-y-6">
        <div className="space-y-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Content</label>
            <textarea
                value={clip.textStyle.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                className="w-full h-24 bg-black/20 border border-white/10 rounded-xl p-3 text-xs focus:ring-1 ring-primary outline-none custom-scrollbar"
            />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Font</label>
                <select
                    value={clip.textStyle.fontFamily}
                    onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs"
                >
                    <option value="sans">Sans</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Mono</option>
                    <option value="display">Display</option>
                </select>
            </div>
            <Slider label="Size" value={clip.textStyle.fontSize} min={12} max={120} onChange={(v) => onUpdate({ fontSize: v })} />
        </div>
        <div className="flex items-center space-x-4">
            <div className="flex-1 space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Color</label>
                <input type="color" value={clip.textStyle.color} onChange={(e) => onUpdate({ color: e.target.value })} className="w-full h-8 bg-transparent rounded cursor-pointer" />
            </div>
            <div className="flex-1 space-y-2">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">BG</label>
                <div className="flex items-center space-x-2">
                    <input type="color" value={clip.textStyle.backgroundColor === 'transparent' ? '#000000' : clip.textStyle.backgroundColor} onChange={(e) => onUpdate({ backgroundColor: e.target.value })} disabled={clip.textStyle.backgroundColor === 'transparent'} className="w-full h-8 bg-transparent rounded cursor-pointer disabled:opacity-30" />
                    <button onClick={() => onUpdate({ backgroundColor: clip.textStyle.backgroundColor === 'transparent' ? '#000000' : 'transparent' })} className={clsx("p-2 rounded border", clip.textStyle.backgroundColor === 'transparent' ? "border-primary text-primary" : "border-white/10 text-gray-500")}>X</button>
                </div>
            </div>
        </div>
        <div className="flex border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => onUpdate({ bold: !clip.textStyle.bold })} className={clsx("flex-1 py-2 flex justify-center", clip.textStyle.bold ? "bg-primary/20 text-primary" : "text-gray-500")}><Bold size={16} /></button>
            <button onClick={() => onUpdate({ italic: !clip.textStyle.italic })} className={clsx("flex-1 py-2 flex justify-center border-l border-white/10", clip.textStyle.italic ? "bg-primary/20 text-primary" : "text-gray-500")}><Italic size={16} /></button>
        </div>
        <div className="flex border border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => onUpdate({ alignment: 'left' })} className={clsx("flex-1 py-2 flex justify-center", clip.textStyle.alignment === 'left' ? "bg-primary/20 text-primary" : "text-gray-500")}><AlignLeft size={16} /></button>
            <button onClick={() => onUpdate({ alignment: 'center' })} className={clsx("flex-1 py-2 flex justify-center border-l border-white/10", clip.textStyle.alignment === 'center' ? "bg-primary/20 text-primary" : "text-gray-500")}><AlignCenter size={16} /></button>
            <button onClick={() => onUpdate({ alignment: 'right' })} className={clsx("flex-1 py-2 flex justify-center border-l border-white/10", clip.textStyle.alignment === 'right' ? "bg-primary/20 text-primary" : "text-gray-500")}><AlignRight size={16} /></button>
        </div>
        <div className="space-y-4">
            <Slider label="Pos X (%)" value={clip.textStyle.positionX} min={0} max={100} onChange={(v) => onUpdate({ positionX: v })} />
            <Slider label="Pos Y (%)" value={clip.textStyle.positionY} min={0} max={100} onChange={(v) => onUpdate({ positionY: v })} />
        </div>
        <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block">Animation</label>
            <select value={clip.textStyle.animationIn} onChange={(e) => onUpdate({ animationIn: e.target.value as any })} className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs">
                <option value="none">None</option>
                <option value="fadein">Fade In</option>
                <option value="slideup">Slide Up</option>
                <option value="slidedown">Slide Down</option>
            </select>
            {clip.textStyle.animationIn !== 'none' && <Slider label="Duration (s)" value={clip.textStyle.animationDuration} min={0.1} max={2.0} step={0.1} onChange={(v) => onUpdate({ animationDuration: v })} />}
        </div>
    </div>
);

const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }> = ({ label, value, min, max, step = 1, onChange }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded leading-none">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-blue-400 transition-all"
    />
  </div>
);
