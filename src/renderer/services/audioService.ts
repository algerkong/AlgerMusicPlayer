import { Howl } from 'howler';

import type { SongResult } from '@/type/music';

class AudioService {
  private currentSound: Howl | null = null;

  private currentTrack: SongResult | null = null;

  constructor() {
    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }
  }

  private initMediaSession() {
    navigator.mediaSession.setActionHandler('play', () => {
      this.currentSound?.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.currentSound?.pause();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.stop();
    });

    navigator.mediaSession.setActionHandler('seekto', (event) => {
      if (event.seekTime && this.currentSound) {
        this.currentSound.seek(event.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (event) => {
      if (this.currentSound) {
        const currentTime = this.currentSound.seek() as number;
        this.currentSound.seek(currentTime - (event.seekOffset || 10));
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (event) => {
      if (this.currentSound) {
        const currentTime = this.currentSound.seek() as number;
        this.currentSound.seek(currentTime + (event.seekOffset || 10));
      }
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      // 这里需要通过回调通知外部
      this.emit('previoustrack');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      // 这里需要通过回调通知外部
      this.emit('nexttrack');
    });
  }

  private updateMediaSessionMetadata(track: SongResult) {
    if (!('mediaSession' in navigator)) return;

    const artists = track.ar ? track.ar.map((a) => a.name) : track.song.artists?.map((a) => a.name);
    const album = track.al ? track.al.name : track.song.album.name;
    const artwork = ['96', '128', '192', '256', '384', '512'].map((size) => ({
      src: `${track.picUrl}?param=${size}y${size}`,
      type: 'image/jpg',
      sizes: `${size}x${size}`
    }));
    const metadata = {
      title: track.name || '',
      artist: artists ? artists.join(',') : '',
      album: album || '',
      artwork
    };

    navigator.mediaSession.metadata = new window.MediaMetadata(metadata);
  }

  private updateMediaSessionState(isPlaying: boolean) {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    this.updateMediaSessionPositionState();
  }

  private updateMediaSessionPositionState() {
    if (!this.currentSound || !('mediaSession' in navigator)) return;

    if ('setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: this.currentSound.duration(),
        playbackRate: 1.0,
        position: this.currentSound.seek() as number
      });
    }
  }

  // 事件处理相关
  private callbacks: { [key: string]: Function[] } = {};

  private emit(event: string, ...args: any[]) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => callback(...args));
    }
  }

  on(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  off(event: string, callback: Function) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      this.callbacks[event] = eventCallbacks.filter((cb) => cb !== callback);
    }
  }

  // 播放控制相关
  play(url?: string, track?: SongResult): Promise<Howl> {
    if (this.currentSound && !url && !track) {
      this.currentSound.play();
      return Promise.resolve(this.currentSound as Howl);
    }
    return new Promise((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 3;

      const tryPlay = () => {
        if (this.currentSound) {
          this.currentSound.unload();
        }
        this.currentSound = null;
        this.currentTrack = track as SongResult;

        this.currentSound = new Howl({
          src: [url as string],
          html5: true,
          autoplay: true,
          volume: localStorage.getItem('volume')
            ? parseFloat(localStorage.getItem('volume') as string)
            : 1,
          onloaderror: () => {
            console.error('Audio load error');
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
              setTimeout(tryPlay, 1000 * retryCount);
            } else {
              reject(new Error('音频加载失败，请尝试切换其他歌曲'));
            }
          },
          onplayerror: () => {
            console.error('Audio play error');
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
              setTimeout(tryPlay, 1000 * retryCount);
            } else {
              reject(new Error('音频播放失败，请尝试切换其他歌曲'));
            }
          }
        });

        // 更新媒体会话元数据
        this.updateMediaSessionMetadata(track as SongResult);

        // 设置音频事件监听
        this.currentSound.on('play', () => {
          this.updateMediaSessionState(true);
          this.emit('play');
        });

        this.currentSound.on('pause', () => {
          this.updateMediaSessionState(false);
          this.emit('pause');
        });

        this.currentSound.on('end', () => {
          this.emit('end');
        });

        this.currentSound.on('seek', () => {
          this.updateMediaSessionPositionState();
          this.emit('seek');
        });

        this.currentSound.on('load', () => {
          this.updateMediaSessionPositionState();
          this.emit('load');
          resolve(this.currentSound as Howl);
        });
      };

      tryPlay();
    });
  }

  getCurrentSound() {
    return this.currentSound;
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  stop() {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.unload();
      this.currentSound = null;
    }
    this.currentTrack = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  setVolume(volume: number) {
    if (this.currentSound) {
      this.currentSound.volume(volume);
      localStorage.setItem('volume', volume.toString());
    }
  }

  seek(time: number) {
    if (this.currentSound) {
      this.currentSound.seek(time);
      this.updateMediaSessionPositionState();
    }
  }

  pause() {
    if (this.currentSound) {
      this.currentSound.pause();
    }
  }
  

  clearAllListeners() {
    this.callbacks = {};
  }
}

export const audioService = new AudioService();
