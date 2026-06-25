import React, { useState } from 'react';
import { useStore, DEFAULT_EFFECTS } from '../../store/useStore';
import { ClipEffect, TransitionType } from '../../types';
import { Sliders, Zap, RotateCcw, X, Info } from 'lucide-react';
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
];

export const EffectsPanel: React.FC = () => {
  const {
    selectedClipId,
    tracks,
    updateClipEffects,
    updateClipTransition,
    isEffectsPanelOpen,
    toggleEffectsPanel
  } = useStore();

  const [activeTab, setActiveTab] = useState<'style' | 'transition'>('style');

  const selectedClip = tracks
    .flatMap(t => t.clips)
    .find(c => c.id === selectedClipId);

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
          <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">Select a clip to<br/>edit effects</p>
        </div>
      </div>
    );
  }

  const handleEffectChange = (updates: Partial<ClipEffect>) => {
    updateClipEffects(selectedClipId, updates);
  };

  const handlePresetClick = (presetName: string) => {
    const preset = PRESETS[presetName];
    updateClipEffects(selectedClipId, { ...DEFAULT_EFFECTS, ...preset });
  };

  return (
    <div className="w-[280px] bg-surface border-l border-white/5 flex flex-col h-full animate-in slide-in-from-right duration-300 shadow-2xl">
      <div className="p-5 border-b border-white/5 flex justify-between items-center">
        <h2 className="font-bold tracking-tight text-sm uppercase text-gray-400">Properties</h2>
        <button onClick={toggleEffectsPanel} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex border-b border-white/5 bg-black/20">
        <button
          onClick={() => setActiveTab('style')}
          className={clsx(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'style' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-300"
          )}
        >
          Style
        </button>
        <button
          onClick={() => setActiveTab('transition')}
          className={clsx(
            "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
            activeTab === 'transition' ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-300"
          )}
        >
          Transition
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'style' ? (
          <div className="p-5 space-y-6">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 block">Presets</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => handlePresetClick(name)}
                    className={clsx(
                      "py-2 px-3 rounded-lg text-[10px] font-bold capitalize transition-all border",
                      selectedClip.effects.preset === name
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
              <Slider label="Brightness" value={selectedClip.effects.brightness} min={0} max={200} onChange={(v) => handleEffectChange({ brightness: v, preset: 'none' })} />
              <Slider label="Contrast" value={selectedClip.effects.contrast} min={0} max={200} onChange={(v) => handleEffectChange({ contrast: v, preset: 'none' })} />
              <Slider label="Saturation" value={selectedClip.effects.saturation} min={0} max={200} onChange={(v) => handleEffectChange({ saturation: v, preset: 'none' })} />
              <Slider label="Hue" value={selectedClip.effects.hue} min={-180} max={180} onChange={(v) => handleEffectChange({ hue: v, preset: 'none' })} />
              <Slider label="Blur" value={selectedClip.effects.blur} min={0} max={20} step={0.5} onChange={(v) => handleEffectChange({ blur: v, preset: 'none' })} />
              <Slider label="Opacity" value={selectedClip.effects.opacity} min={0} max={100} onChange={(v) => handleEffectChange({ opacity: v, preset: 'none' })} />
            </div>

            <button
              onClick={() => updateClipEffects(selectedClipId, DEFAULT_EFFECTS)}
              className="w-full py-2.5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center justify-center space-x-2"
            >
              <RotateCcw size={14} />
              <span>Reset Effects</span>
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-6">
            <div>
              <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-3 block">In Transition</label>
              <div className="grid grid-cols-2 gap-2">
                {TRANSITIONS.map((t) => (
                  <button
                    key={t.type}
                    onClick={() => updateClipTransition(selectedClipId, { ...selectedClip.transitionIn, type: t.type })}
                    className={clsx(
                      "py-3 px-3 rounded-xl text-[10px] font-bold transition-all border flex flex-col items-center justify-center space-y-2",
                      selectedClip.transitionIn.type === t.type
                        ? "bg-primary/20 border-primary text-primary shadow-lg shadow-primary/10"
                        : "bg-white/5 border-transparent hover:bg-white/10 text-gray-400"
                    )}
                  >
                    <Zap size={16} className={selectedClip.transitionIn.type === t.type ? "text-primary" : "text-gray-600"} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedClip.transitionIn.type !== 'none' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <Slider
                  label="Duration (s)"
                  value={selectedClip.transitionIn.duration}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  onChange={(v) => updateClipTransition(selectedClipId, { ...selectedClip.transitionIn, duration: v })}
                />
              </div>
            )}

            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl flex items-start space-x-3 opacity-60">
              <Info size={16} className="text-primary mt-0.5 shrink-0" />
              <p className="text-[10px] font-medium leading-relaxed text-gray-400">
                More transitions (Wipes, Slides) coming soon in the next update.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
