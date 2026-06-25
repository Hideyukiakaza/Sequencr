import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

    for (const asset of assets) {
      await ffmpeg.writeFile(asset.id, await fetchFile(asset.file));
    }
    onProgress(0.15);

    const videoTracks = tracks.filter(t => t.type === 'video');
    const allVideoClips = videoTracks.flatMap(t => t.clips);
    if (allVideoClips.length === 0) throw new Error('No video clips to export');

    const audioOnlyTracks = tracks.filter(t => t.type === 'audio');
    const allAudioClips = audioOnlyTracks.flatMap(t => t.clips);

    const totalDuration = Math.max(
      ...allVideoClips.map(c => c.startTime + c.duration),
      ...allAudioClips.map(c => c.startTime + c.duration),
      0.1
    );

    const inputArgs: string[] = [];
    let filterComplex = '';

    // 0. Create base global black canvas
    inputArgs.push('-f', 'lavfi', '-i', `color=c=black:s=1920x1080:d=${totalDuration.toFixed(3)}`);
    const baseInputIdx = 0;
    filterComplex += `[${baseInputIdx}:v]split=1[v_base];`;
    let vFinalLabel = 'v_base';

    let currentInputIdx = 1;

    // 1. Build video track streams
    videoTracks.forEach((track: any, trackIdx: number) => {
      const trackClips = [...track.clips].sort((a, b) => a.startTime - b.startTime);
      if (trackClips.length === 0) return;

      const trackCanvasIdx = currentInputIdx++;
      inputArgs.push('-f', 'lavfi', '-i', `color=c=black@0:s=1920x1080:d=${totalDuration.toFixed(3)}`);
      let trackVLabel = `${trackCanvasIdx}:v`;

      trackClips.forEach((clip: any, clipIdx: number) => {
        const inputIdx = currentInputIdx++;
        inputArgs.push('-ss', clip.offset.toFixed(3), '-t', clip.duration.toFixed(3), '-i', clip.assetId);

        const b = (clip.effects.brightness - 100) / 100;
        const c = clip.effects.contrast / 100;
        const s = clip.effects.saturation / 100;

        let vf = `eq=brightness=${b}:contrast=${c}:saturation=${s}`;
        if (clip.effects.hue !== 0) vf += `,hue=h=${clip.effects.hue}`;
        if (clip.effects.blur > 0) vf += `,boxblur=${clip.effects.blur}`;
        if (clip.effects.preset === 'invert') vf += `,negate`;
        if (clip.effects.preset === 'grayscale') vf += `,hue=s=0`;
        // Corrected sepia matrix to 12 parameters (RGB)
        if (clip.effects.preset === 'sepia') vf += `,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0`;

        if (clip.effects.opacity < 100) {
            vf += `,format=rgba,colorchannelmixer=aa=${(clip.effects.opacity / 100).toFixed(3)}`;
        }

        if (clip.transitionIn.type === 'fade' || clip.transitionIn.type === 'dissolve') {
            vf += `,fade=t=in:st=0:d=${clip.transitionIn.duration}`;
        }

        const clipVLabel = `v_t${trackIdx}_c${clipIdx}`;
        filterComplex += `[${inputIdx}:v]${vf},setpts=PTS-STARTPTS+${clip.startTime}/TB[${clipVLabel}];`;

        const nextTrackVLabel = `v_t${trackIdx}_lay${clipIdx}`;
        filterComplex += `[${trackVLabel}][${clipVLabel}]overlay=format=auto[${nextTrackVLabel}];`;
        trackVLabel = nextTrackVLabel;
      });

      const nextFinalLabel = `v_final_${trackIdx}`;
      filterComplex += `[${vFinalLabel}][${trackVLabel}]overlay=format=auto[${nextFinalLabel}];`;
      vFinalLabel = nextFinalLabel;
    });

    // 2. Audio Mixing
    const audioInputs: string[] = [];
    let audioScanIdx = 1;
    videoTracks.forEach((track: any) => {
        audioScanIdx++; // skip trackCanvas
        track.clips.forEach((clip: any) => {
            const asset = assets.find(a => a.id === clip.assetId);
            const label = `va_${audioScanIdx}`;
            if (asset?.hasAudio !== false) {
                filterComplex += `[${audioScanIdx}:a]atrim=0:${clip.duration.toFixed(3)},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${label}];`;
            } else {
                filterComplex += `anullsrc=r=44100:cl=stereo,atrim=duration=${clip.duration.toFixed(3)},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${label}];`;
            }
            audioInputs.push(`[${label}]`);
            audioScanIdx++;
        });
    });

    audioOnlyTracks.forEach((track: any) => {
        track.clips.forEach((clip: any) => {
            const inputIdx = audioScanIdx++;
            inputArgs.push('-ss', clip.offset.toFixed(3), '-t', clip.duration.toFixed(3), '-i', clip.assetId);
            const label = `aa_${inputIdx}`;
            filterComplex += `[${inputIdx}:a]atrim=0:${clip.duration.toFixed(3)},adelay=${(clip.startTime * 1000).toFixed(0)}|${(clip.startTime * 1000).toFixed(0)}[${label}];`;
            audioInputs.push(`[${label}]`);
        });
    });

    if (audioInputs.length > 0) {
      filterComplex += `${audioInputs.join('')}amix=inputs=${audioInputs.length}:normalize=0[outa]`;
    } else {
      inputArgs.push('-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo:d=${totalDuration.toFixed(3)}`);
      const silentIdx = audioScanIdx;
      filterComplex += `[${silentIdx}:a]asetpts=PTS-STARTPTS[outa]`;
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
}

export const videoService = new VideoService();
