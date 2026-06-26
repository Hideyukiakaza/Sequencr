import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { TransitionType } from '../types';

const XFADE_MAP: Record<TransitionType, string> = {
  none: '',
  fade: 'fade',
  dissolve: 'dissolve',
  wipeleft: 'wipeleft',
  wiperight: 'wiperight',
  wiperightdown: 'wipedown',
  slideleft: 'slideleft',
  slideright: 'slideright',
  zoom: 'zoom',
};

class VideoService {
  private ffmpeg: FFmpeg | null = null;
  private isLoading = false;

  async init() {
    if (this.ffmpeg || this.isLoading) return;
    this.isLoading = true;

    try {
      this.ffmpeg = new FFmpeg();
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (error) {
      console.error('Failed to load FFmpeg:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async exportVideo(tracks: any[], assets: any[], onProgress: (p: number) => void) {
    if (!this.ffmpeg) await this.init();
    if (!this.ffmpeg) throw new Error('FFmpeg failed to initialize');

    const ffmpeg = this.ffmpeg;
    onProgress(0.05);

    const usedAssetIds = new Set(tracks.flatMap(t => t.clips.map((c: any) => c.assetId)));
    for (const asset of assets) {
      if (usedAssetIds.has(asset.id)) {
        await ffmpeg.writeFile(asset.id, await fetchFile(asset.file));
      }
    }
    onProgress(0.15);

    const videoTracks = tracks.filter(t => t.type === 'video');
    const audioOnlyTracks = tracks.filter(t => t.type === 'audio');
    const textTracks = tracks.filter(t => t.type === 'text');

    const allClips = tracks.flatMap(t => t.clips);
    const totalDuration = Math.max(...allClips.map(c => c.startTime + c.duration), 0.1);

    const inputArgs: string[] = [];
    let filterComplex = '';

    inputArgs.push('-f', 'lavfi', '-i', `color=c=black:s=1920x1080:d=${totalDuration.toFixed(3)}`);
    filterComplex += `[0:v]split=1[v_base];`;
    let vFinalLabel = 'v_base';

    let inputIdx = 1;
    const audioLabels: string[] = [];

    // 1. Process Video Tracks
    videoTracks.forEach((track: any, trackIdx: number) => {
      const clips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
      if (clips.length === 0) return;

      const hasTransitions = clips.some((c, i) => i > 0 && c.transitionIn.type !== 'none');
      let trackVLabel = '';

      if (hasTransitions && clips.length > 1) {
        clips.forEach((clip, i) => {
          const currentIdx = inputIdx++;
          inputArgs.push('-ss', clip.offset.toFixed(3), '-t', clip.duration.toFixed(3), '-i', clip.assetId);

          const vf = this.buildVideoFilters(clip);
          const clipLabel = `v_t${trackIdx}_c${i}_fx`;
          filterComplex += `[${currentIdx}:v]${vf}[${clipLabel}];`;

          const asset = assets.find(a => a.id === clip.assetId);
          const af = this.buildAudioFilters(clip);
          const aLabel = `a_t${trackIdx}_c${i}`;

          if (asset?.hasAudio !== false) {
              filterComplex += `[${currentIdx}:a]${af},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${aLabel}];`;
          } else {
              filterComplex += `anullsrc=r=44100:cl=stereo,atrim=duration=${clip.duration.toFixed(3)},${af},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${aLabel}];`;
          }
          audioLabels.push(`[${aLabel}]`);
        });

        let currentXLabel = `v_t${trackIdx}_c0_fx`;
        clips.forEach((clip, i) => {
          if (i === 0) return;
          const nextXLabel = `v_t${trackIdx}_x${i-1}`;
          const transition = XFADE_MAP[clip.transitionIn.type as TransitionType] || 'fade';
          const offset = clip.startTime - clip.transitionIn.duration;
          filterComplex += `[${currentXLabel}][v_t${trackIdx}_c${i}_fx]xfade=transition=${transition}:duration=${clip.transitionIn.duration}:offset=${offset.toFixed(3)}[${nextXLabel}];`;
          currentXLabel = nextXLabel;
        });
        trackVLabel = currentXLabel;
      } else {
        const canvasIdx = inputIdx++;
        inputArgs.push('-f', 'lavfi', '-i', `color=c=black@0:s=1920x1080:d=${totalDuration.toFixed(3)}`);
        let currentTrackLabel = `${canvasIdx}:v`;

        clips.forEach((clip, i) => {
          const currentIdx = inputIdx++;
          inputArgs.push('-ss', clip.offset.toFixed(3), '-t', clip.duration.toFixed(3), '-i', clip.assetId);

          const vf = this.buildVideoFilters(clip);
          const clipLabel = `v_t${trackIdx}_c${i}_fx`;
          filterComplex += `[${currentIdx}:v]${vf},setpts=PTS-STARTPTS+${clip.startTime}/TB[${clipLabel}];`;

          const nextLabel = `v_t${trackIdx}_lay${i}`;
          filterComplex += `[${currentTrackLabel}][${clipLabel}]overlay=format=auto[${nextLabel}];`;
          currentTrackLabel = nextLabel;

          const asset = assets.find(a => a.id === clip.assetId);
          const af = this.buildAudioFilters(clip);
          const aLabel = `a_t${trackIdx}_c${i}`;

          if (asset?.hasAudio !== false) {
              filterComplex += `[${currentIdx}:a]${af},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${aLabel}];`;
          } else {
              filterComplex += `anullsrc=r=44100:cl=stereo,atrim=duration=${clip.duration.toFixed(3)},${af},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${aLabel}];`;
          }
          audioLabels.push(`[${aLabel}]`);
        });
        trackVLabel = currentTrackLabel;
      }

      const nextFinal = `v_final_${trackIdx}`;
      filterComplex += `[${vFinalLabel}][${trackVLabel}]overlay=format=auto[${nextFinal}];`;
      vFinalLabel = nextFinal;
    });

    // 2. Process Audio Only Tracks
    audioOnlyTracks.forEach((track: any, trackIdx: number) => {
        track.clips.forEach((clip: any, i: number) => {
            const currentIdx = inputIdx++;
            inputArgs.push('-ss', clip.offset.toFixed(3), '-t', clip.duration.toFixed(3), '-i', clip.assetId);
            const af = this.buildAudioFilters(clip);
            const aLabel = `a_ao${trackIdx}_c${i}`;
            filterComplex += `[${currentIdx}:a]${af},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${aLabel}];`;
            audioLabels.push(`[${aLabel}]`);
        });
    });

    // 3. Process Text Tracks
    textTracks.forEach((track: any) => {
        track.clips.forEach((clip: any) => {
            const style = clip.textStyle;
            const escaped = style.content.replace(/'/g, "'\\\\''");
            const fontMap: any = { sans: 'Arial', serif: 'Times New Roman', mono: 'Courier New', display: 'Impact' };
            const font = fontMap[style.fontFamily] || 'Arial';
            const startTime = clip.startTime;
            const endTime = clip.startTime + clip.duration;

            let alpha = `if(between(t,${startTime},${endTime}),1,0)`;
            if (style.animationIn === 'fadein') {
                alpha = `if(between(t,${startTime},${endTime}),if(lt(t,${startTime+style.animationDuration}),(t-${startTime})/${style.animationDuration},1),0)`;
            }

            const drawText = `drawtext=text='${escaped}':font='${font}':fontcolor=${style.color}:fontsize=${style.fontSize}:x=(w*${style.positionX/100}):y=(h*${style.positionY/100}):alpha='${alpha}'`;
            const nextLabel = `v_text_${inputIdx++}`;
            filterComplex += `[${vFinalLabel}]${drawText}[${nextLabel}];`;
            vFinalLabel = nextLabel;
        });
    });

    // 4. Final Audio Mix
    if (audioLabels.length > 0) {
        filterComplex += `${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0[outa]`;
    } else {
        inputIdx++;
        inputArgs.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo:d=${totalDuration.toFixed(3)}`);
        filterComplex += `[${inputIdx-1}:a]asetpts=PTS-STARTPTS[outa]`;
    }

    const command = [
      ...inputArgs,
      '-filter_complex', filterComplex,
      '-map', `[${vFinalLabel}]`,
      '-map', '[outa]',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-shortest',
      'output.mp4'
    ];

    onProgress(0.3);
    await ffmpeg.exec(command);
    onProgress(0.9);

    const data = await ffmpeg.readFile('output.mp4');
    onProgress(1.0);
    return new Blob([data as any], { type: 'video/mp4' });
  }

  private buildVideoFilters(clip: any) {
    const b = (clip.effects.brightness - 100) / 100;
    const c = clip.effects.contrast / 100;
    const s = clip.effects.saturation / 100;
    let vf = `eq=brightness=${b}:contrast=${c}:saturation=${s}`;
    if (clip.effects.hue !== 0) vf += `,hue=h=${clip.effects.hue}`;
    if (clip.effects.blur > 0) vf += `,boxblur=${clip.effects.blur}`;
    if (clip.effects.preset === 'invert') vf += `,negate`;
    if (clip.effects.preset === 'grayscale') vf += `,hue=s=0`;
    if (clip.effects.preset === 'sepia') vf += `,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0`;
    if (clip.effects.opacity < 100) vf += `,format=rgba,colorchannelmixer=aa=${(clip.effects.opacity / 100).toFixed(3)}`;
    return vf;
  }

  private buildAudioFilters(clip: any) {
    let af = `volume=${clip.volume / 100}`;
    if (clip.fadeInDuration > 0) af += `,afade=t=in:st=0:d=${clip.fadeInDuration}`;
    if (clip.fadeOutDuration > 0) af += `,afade=t=out:st=${clip.duration - clip.fadeOutDuration}:d=${clip.fadeOutDuration}`;
    return af;
  }
}

export const videoService = new VideoService();
