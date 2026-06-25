import { useState, useCallback } from 'react';
import { AssetLibrary } from './components/assets/AssetLibrary';
import { PreviewWindow } from './components/preview/PreviewWindow';
import { Timeline } from './components/timeline/Timeline';
import { EffectsPanel } from './components/effects/EffectsPanel';
import { useStore } from './store/useStore';
import { videoService } from './services/videoService';
import { Loader2, Download, ShieldCheck, Settings2 } from 'lucide-react';
import { clsx } from 'clsx';

function App() {
  const { tracks, assets, isEffectsPanelOpen, toggleEffectsPanel } = useStore();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = useCallback(async () => {
    const allClips = tracks.flatMap(t => t.clips);
    if (allClips.length === 0) {
      alert('Add some clips to the timeline first!');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    try {
      const blob = await videoService.exportVideo(tracks, assets, (p) => setExportProgress(p * 100));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sequencr-${Date.now()}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  }, [tracks, assets]);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden text-white font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-surface z-50 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-primary/20 transform rotate-3">S</div>
          <div>
            <h1 className="font-black tracking-tighter text-xl leading-none">SEQUENCR</h1>
            <div className="flex items-center space-x-1 mt-0.5">
              <ShieldCheck size={10} className="text-green-500" />
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Privacy First</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleEffectsPanel}
            className={clsx(
              "p-2 rounded-xl border transition-all",
              isEffectsPanelOpen ? "bg-primary/10 border-primary text-primary" : "bg-transparent border-white/10 text-gray-500 hover:text-gray-300"
            )}
          >
            <Settings2 size={20} />
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="group px-5 py-2 rounded-xl bg-primary hover:bg-blue-600 disabled:bg-gray-800 disabled:text-gray-500 text-sm font-bold transition-all flex items-center space-x-2 shadow-lg shadow-primary/10 active:scale-95"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>{exportProgress > 0 ? `Rendering ${exportProgress.toFixed(0)}%` : 'Preparing...'}</span>
              </>
            ) : (
              <>
                <Download size={18} className="group-hover:translate-y-0.5 transition-transform" />
                <span>Export MP4</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <AssetLibrary />
        <div className="flex-1 flex flex-col min-w-0">
          <PreviewWindow />
          <div className="h-[45%] flex border-t border-white/5 shadow-2xl">
            <Timeline />
          </div>
        </div>
        <EffectsPanel />
      </main>

      {/* Status Bar */}
      <footer className="h-6 bg-surface border-t border-white/5 flex items-center px-4 justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wider">
        <div className="flex items-center space-x-4">
          <span>{assets.length} Assets Imported</span>
          <span>{tracks.reduce((acc, t) => acc + t.clips.length, 0)} Clips on Timeline</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span>Local Engine Ready</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
