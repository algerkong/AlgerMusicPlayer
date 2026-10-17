import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { getImgUrl, isElectron } from '@/utils';

class AudioService {
  private audio: HTMLAudioElement;
  private currentTrack: SongResult | null = null;

  private context: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filters: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private bypass = false;

  private playbackRate = 1.0;
  private volume = 1;
  private currentSinkId: string = 'default';
  private _isLoading = false;

  private operationLock = false;
  private operationLockTimer: ReturnType<typeof setTimeout> | null = null;

  // 取消整轮加载（包括重试等待），并结算旧 Promise，防止旧歌曲抢回共享 audio。
  private pendingLoadCleanup: (() => void) | null = null;

  private readonly frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  private defaultEQSettings: { [key: string]: number } = {
    '31': 0,
    '62': 0,
    '125': 0,
    '250': 0,
    '500': 0,
    '1000': 0,
    '2000': 0,
    '4000': 0,
    '8000': 0,
    '16000': 0
  };

  // Event system
  private callbacks: { [key: string]: Function[] } = {};

  constructor() {
    // Create persistent audio element
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';

    // Bind native DOM events
    this.bindAudioEvents();

    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }

    // Restore EQ bypass state
    try {
      this.bypass = JSON.parse(localStorage.getItem('eqBypass') || 'false') === true;
    } catch {
      this.bypass = false;
    }
    const volume = Number(localStorage.getItem('volume') ?? 1);
    this.volume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 1;

    this.forceResetOperationLock();
    window.addEventListener('beforeunload', () => this.forceResetOperationLock());
  }

  // ==================== Native DOM Event Binding ====================

  private bindAudioEvents() {
    this.audio.addEventListener('play', () => {
      if (this.audio.paused || !this.currentTrack) return;
      this.updateMediaSessionState(true);
      this.emit('play');
    });

    this.audio.addEventListener('pause', () => {
      if (!this.audio.paused) return;
      this.updateMediaSessionState(false);
      this.emit('pause');
    });

    this.audio.addEventListener('ended', () => {
      if (!this.audio.ended || !this.currentTrack) return;
      this.updateMediaSessionState(false);
      this.emit('end', this.currentTrack);
    });

    this.audio.addEventListener('seeked', () => {
      this.updateMediaSessionPositionState();
      this.emit('seek');
    });

    this.audio.addEventListener('timeupdate', () => {
      // Consumers can listen to this if needed; mainly for MediaSession sync
    });

    this.audio.addEventListener('waiting', () => {
      this._isLoading = true;
    });

    this.audio.addEventListener('canplay', () => {
      this._isLoading = false;
    });

    this.audio.addEventListener('error', () => {
      const error = this.audio.error;
      console.error('Audio element error:', error?.code, error?.message);
      this.emit('audio_error', { type: 'media_error', error });
      if (!this.pendingLoadCleanup && this.currentTrack) {
        this._isLoading = false;
        this.updateMediaSessionState(false);
        this.emit(
          this.currentTrack.playMusicUrl?.startsWith('local://') ? 'playback_error' : 'url_expired',
          this.currentTrack
        );
      }
    });
  }

  // ==================== MediaSession ====================

  private initMediaSession() {
    navigator.mediaSession.setActionHandler('play', () => {
      this.emit('play_request');
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      this.emit('pause_request');
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      this.emit('stop_request');
    });

    navigator.mediaSession.setActionHandler('seekto', (event) => {
      if (event.seekTime !== undefined) {
        this.seek(event.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (event) => {
      this.seek(this.audio.currentTime - (event.seekOffset || 10));
    });

    navigator.mediaSession.setActionHandler('seekforward', (event) => {
      this.seek(this.audio.currentTime + (event.seekOffset || 10));
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      this.emit('previoustrack');
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      this.emit('nexttrack');
    });
  }

  private updateMediaSessionMetadata(track: SongResult) {
    try {
      if (!('mediaSession' in navigator)) return;

      const artists = track.ar
        ? track.ar.map((a) => a.name)
        : track.song?.artists?.map((a) => a.name);
      const album = track.al ? track.al.name : track.song?.album?.name;
      // 上限提到 1024 提升 SMTC/AMLL 等系统媒体控件的封面清晰度（#595）；
      // 走 getImgUrl 以正确处理 data:/local:// 封面与已带参数的 URL
      const artwork = ['96', '128', '192', '256', '384', '512', '1024'].map((size) => ({
        src: getImgUrl(track.picUrl, `${size}y${size}`),
        type: 'image/jpg',
        sizes: `${size}x${size}`
      }));

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: track.name || '',
        artist: artists ? artists.join(',') : '',
        album: album || '',
        artwork
      });
    } catch (error) {
      console.error('更新媒体会话元数据时出错:', error);
    }
  }

  private updateMediaSessionState(isPlaying: boolean) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    this.updateMediaSessionPositionState();
  }

  private updateMediaSessionPositionState() {
    try {
      if (!('mediaSession' in navigator)) return;
      if (!this.audio.duration || !isFinite(this.audio.duration)) return;

      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.playbackRate,
          position: this.audio.currentTime
        });
      }
    } catch (error) {
      console.error('更新媒体会话位置状态时出错:', error);
    }
  }

  // ==================== Event Emitter ====================

  private emit(event: string, ...args: any[]) {
    const eventCallbacks = this.callbacks[event];
    if (eventCallbacks) {
      eventCallbacks.forEach((callback) => {
        try {
          Promise.resolve(callback(...args)).catch((error) =>
            console.error(`Audio event ${event} failed:`, error)
          );
        } catch (error) {
          console.error(`Audio event ${event} failed:`, error);
        }
      });
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

  clearAllListeners() {
    this.callbacks = {};
  }

  // ==================== EQ ====================

  private setupEQ() {
    if (this.sourceNode) return; // Already initialized

    if (!isElectron) {
      console.log('Web环境中跳过EQ设置，避免CORS问题');
      this.bypass = true;
      return;
    }

    try {
      this.context = new AudioContext();
      this.sourceNode = this.context.createMediaElementSource(this.audio);
      this.gainNode = this.context.createGain();

      // Create 10-band filter chain
      const savedSettings = this.loadEQSettings();
      this.filters = this.frequencies.map((freq) => {
        const filter = this.context!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = savedSettings[freq.toString()] || 0;
        return filter;
      });

      // Wire up the graph
      this.applyBypassState();

      // Apply saved volume
      this.applyVolume(this.volume);

      // Monitor context state
      this.setupContextStateMonitoring();

      // Restore saved audio device
      this.restoreSavedAudioDevice();

      console.log('EQ initialization successful');
    } catch (error) {
      console.error('EQ initialization failed:', error);
      // Fallback: connect audio directly (no EQ)
      this.sourceNode = null;
      this.context = null;
    }
  }

  private applyBypassState() {
    if (!this.sourceNode || !this.gainNode || !this.context) return;

    try {
      // Disconnect all
      try {
        this.sourceNode.disconnect();
      } catch {
        /* already disconnected */
      }
      this.filters.forEach((filter) => {
        try {
          filter.disconnect();
        } catch {
          /* already disconnected */
        }
      });
      try {
        this.gainNode.disconnect();
      } catch {
        /* already disconnected */
      }

      if (this.bypass) {
        // EQ disabled: source -> gain -> destination
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      } else {
        // EQ enabled: source -> filters[0] -> ... -> filters[9] -> gain -> destination
        this.sourceNode.connect(this.filters[0]);
        this.filters.forEach((filter, index) => {
          if (index < this.filters.length - 1) {
            filter.connect(this.filters[index + 1]);
          }
        });
        this.filters[this.filters.length - 1].connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      }
    } catch (error) {
      console.error('Error applying EQ state, attempting fallback:', error);
      try {
        if (this.sourceNode && this.context) {
          this.sourceNode.connect(this.context.destination);
        }
      } catch (fallbackError) {
        console.error('Fallback connection also failed:', fallbackError);
        this.emit('audio_error', { type: 'graph_disconnected', error: fallbackError });
      }
    }
  }

  public isEQEnabled(): boolean {
    return !this.bypass;
  }

  public setEQEnabled(enabled: boolean) {
    this.bypass = !enabled;
    localStorage.setItem('eqBypass', JSON.stringify(this.bypass));

    if (this.sourceNode && this.gainNode && this.context) {
      this.applyBypassState();
    }
  }

  public setEQFrequencyGain(frequency: string, gain: number) {
    const filterIndex = this.frequencies.findIndex((f) => f.toString() === frequency);
    if (filterIndex !== -1 && this.filters[filterIndex]) {
      this.filters[filterIndex].gain.setValueAtTime(gain, this.context?.currentTime || 0);
      this.saveEQSettings(frequency, gain);
    }
  }

  public resetEQ() {
    this.filters.forEach((filter) => {
      filter.gain.setValueAtTime(0, this.context?.currentTime || 0);
    });
    localStorage.removeItem('eqSettings');
  }

  public getAllEQSettings(): { [key: string]: number } {
    return this.loadEQSettings();
  }

  public getCurrentPreset(): string | null {
    return localStorage.getItem('currentPreset');
  }

  public setCurrentPreset(preset: string): void {
    localStorage.setItem('currentPreset', preset);
  }

  private saveEQSettings(frequency: string, gain: number) {
    const settings = this.loadEQSettings();
    settings[frequency] = gain;
    localStorage.setItem('eqSettings', JSON.stringify(settings));
  }

  private loadEQSettings(): { [key: string]: number } {
    try {
      return {
        ...this.defaultEQSettings,
        ...JSON.parse(localStorage.getItem('eqSettings') || '{}')
      };
    } catch {
      return { ...this.defaultEQSettings };
    }
  }

  // ==================== Operation Lock ====================

  private setOperationLock(): boolean {
    if (this.operationLock) {
      return false;
    }
    this.operationLock = true;

    if (this.operationLockTimer) clearTimeout(this.operationLockTimer);
    this.operationLockTimer = setTimeout(() => {
      console.warn('操作锁超时自动释放');
      this.releaseOperationLock();
    }, 5000);

    return true;
  }

  public releaseOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  public forceResetOperationLock(): void {
    this.operationLock = false;
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  // ==================== Playback Control ====================

  public play(
    url: string,
    track: SongResult,
    isPlay: boolean = true,
    seekTime?: number,
    _existingSound?: HTMLAudioElement
  ): Promise<HTMLAudioElement> {
    if (!url || !track) {
      return Promise.reject(new Error('缺少必要参数: url和track'));
    }

    const currentSrc = this.audio.src;
    const isSameUrl =
      currentSrc && currentSrc === url && !this.pendingLoadCleanup && !this.audio.error;

    this.pendingLoadCleanup?.();
    this.forceResetOperationLock();
    this.setOperationLock();

    return new Promise<HTMLAudioElement>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;
      let settled = false;
      let retryTimer: ReturnType<typeof setTimeout> | null = null;
      let loadTimer: ReturnType<typeof setTimeout> | null = null;
      let removeListeners = () => {};

      const cleanup = () => {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        if (loadTimer) {
          clearTimeout(loadTimer);
          loadTimer = null;
        }
        removeListeners();
        if (this.pendingLoadCleanup === cancelLoad) {
          this.pendingLoadCleanup = null;
        }
      };

      const failLoad = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        this._isLoading = false;
        this.releaseOperationLock();
        reject(error);
      };

      const cancelLoad = () => failLoad(new DOMException('Playback cancelled', 'AbortError'));
      this.pendingLoadCleanup = cancelLoad;

      const startAudio = async () => {
        if (settled) return;
        removeListeners();
        try {
          this._isLoading = false;
          this.applyVolume(this.volume);
          this.audio.playbackRate = this.playbackRate;
          if (seekTime !== undefined) {
            this.seek(seekTime);
          }

          if (isPlay && this.context?.state === 'suspended') {
            await this.context.resume();
          }
          if (settled) return;
          if (isPlay) await this.audio.play();
          else this.audio.pause();
          if (settled) return;

          settled = true;
          cleanup();
          this.updateMediaSessionMetadata(track);
          this.updateMediaSessionPositionState();
          this.emit('load');
          this.releaseOperationLock();
          resolve(this.audio);
        } catch (error) {
          if (settled) return;
          this.emit('playerror', { track, error });
          failLoad(error as Error);
        }
      };

      const tryPlay = () => {
        if (settled) return;
        this._isLoading = true;
        this.currentTrack = track;
        this.setupEQ();
        loadTimer = setTimeout(() => failLoad(new Error('Audio loading timed out')), 20000);
        const onError = () => {
          if (settled) return;
          removeListeners();
          if (loadTimer) clearTimeout(loadTimer);
          loadTimer = null;
          this._isLoading = false;
          const error = this.audio.error;
          console.error('Audio load error:', error?.code, error?.message);
          this.emit('loaderror', { track, error });

          // MEDIA_ERR_SRC_NOT_SUPPORTED(4)：源本身无效（URL 已失效/返回了
          // 非音频内容），用同一 URL 重试毫无意义。此处只跳过重试并把失败抛给
          // 调用方，由 playTrack 清解析缓存后重新取 URL；加载期间不发 url_expired，
          // 避免与调用方的失败恢复同时抢占播放。播放中才失效的源由 bindAudioEvents 发事件。
          const isSrcNotSupported = error?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED;

          if (!isSrcNotSupported && retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
            retryTimer = setTimeout(() => {
              retryTimer = null;
              tryPlay();
            }, 1000 * retryCount);
          } else {
            // 初次加载失败交给调用方恢复，避免与切歌失败处理同时抢占播放。
            failLoad(new Error('音频加载失败，请尝试切换其他歌曲'));
          }
        };

        removeListeners = () => {
          this.audio.removeEventListener('canplay', startAudio);
          this.audio.removeEventListener('error', onError);
        };

        if (isSameUrl) {
          void startAudio();
          return;
        }

        this.audio.addEventListener('canplay', startAudio, { once: true });
        this.audio.addEventListener('error', onError, { once: true });

        // Change source and load
        try {
          this.audio.src = url;
          this.audio.load();
        } catch (error) {
          failLoad(error as Error);
        }
      };

      tryPlay();
    });
  }

  public pause() {
    this.pendingLoadCleanup?.();
    this.forceResetOperationLock();
    this._isLoading = false;
    try {
      this.audio.pause();
    } catch (error) {
      console.error('暂停音频失败:', error);
    }
  }

  public stop() {
    this.forceResetOperationLock();
    // 移除尚未结算的加载监听器，避免 stop 后旧的 canplay/error 仍触发过期回调
    if (this.pendingLoadCleanup) {
      this.pendingLoadCleanup();
      this.pendingLoadCleanup = null;
    }
    this._isLoading = false;
    try {
      this.audio.pause();
      this.audio.removeAttribute('src');
      this.audio.load(); // Reset the element
    } catch (error) {
      console.error('停止音频失败:', error);
    }
    this.currentTrack = null;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
  }

  public seek(time: number) {
    if (!Number.isFinite(time) || !this.audio.src) return;
    this.forceResetOperationLock();
    try {
      const duration = this.audio.duration;
      const target = Math.max(
        0,
        Number.isFinite(duration) && duration > 0 ? Math.min(time, duration) : time
      );
      this.audio.currentTime = target;
      this.emit('seek_start', target);
      this.updateMediaSessionPositionState();
    } catch (error) {
      console.error('Seek操作失败:', error);
    }
  }

  public setVolume(volume: number) {
    this.applyVolume(volume);
  }

  private applyVolume(volume: number) {
    if (!Number.isFinite(volume)) return;
    const normalizedVolume = Math.max(0, Math.min(1, volume));
    this.volume = normalizedVolume;

    if (this.gainNode && this.context) {
      this.gainNode.gain.cancelScheduledValues(this.context.currentTime);
      this.gainNode.gain.setValueAtTime(normalizedVolume, this.context.currentTime);
    } else {
      // Fallback: direct volume (no Web Audio context)
      this.audio.volume = normalizedVolume;
    }

    try {
      localStorage.setItem('volume', normalizedVolume.toString());
    } catch (error) {
      console.warn('保存音量失败:', error);
    }
  }

  public setPlaybackRate(rate: number) {
    if (!Number.isFinite(rate) || rate <= 0) return;
    this.playbackRate = rate;
    this.audio.playbackRate = rate;
    this.updateMediaSessionPositionState();
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  // ==================== State Queries ====================

  getCurrentSound(): HTMLAudioElement | null {
    return this.audio.src ? this.audio : null;
  }

  getCurrentTrack(): SongResult | null {
    return this.currentTrack;
  }

  isLoading(): boolean {
    return this._isLoading || this.operationLock;
  }

  isActuallyPlaying(): boolean {
    if (!this.audio.src) return false;
    try {
      const isPlaying = !this.audio.paused && !this.audio.ended;
      const contextOk = !this.context || this.context.state === 'running';
      return isPlaying && !this._isLoading && contextOk;
    } catch (error) {
      console.error('检查播放状态出错:', error);
      return false;
    }
  }

  // ==================== Audio Output Devices ====================

  public async getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioOutputs = devices.filter((d) => d.kind === 'audiooutput');

      return audioOutputs.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Speaker ${index + 1}`,
        isDefault: device.deviceId === 'default' || device.deviceId === ''
      }));
    } catch (error) {
      console.error('枚举音频设备失败:', error);
      return [{ deviceId: 'default', label: 'Default', isDefault: true }];
    }
  }

  public async setAudioOutputDevice(deviceId: string): Promise<boolean> {
    try {
      if (this.context && typeof (this.context as any).setSinkId === 'function') {
        await (this.context as any).setSinkId(deviceId);
        this.currentSinkId = deviceId;
        localStorage.setItem('audioOutputDeviceId', deviceId);
        console.log('音频输出设备已切换:', deviceId);
        return true;
      } else {
        console.warn('AudioContext.setSinkId 不可用');
        return false;
      }
    } catch (error) {
      console.error('设置音频输出设备失败:', error);
      return false;
    }
  }

  public getCurrentSinkId(): string {
    return this.currentSinkId;
  }

  private async restoreSavedAudioDevice(): Promise<void> {
    const savedDeviceId = localStorage.getItem('audioOutputDeviceId');
    if (savedDeviceId && savedDeviceId !== 'default') {
      try {
        await this.setAudioOutputDevice(savedDeviceId);
      } catch (error) {
        console.warn('恢复音频输出设备失败，回退到默认设备:', error);
        localStorage.removeItem('audioOutputDeviceId');
        this.currentSinkId = 'default';
      }
    }
  }

  private setupContextStateMonitoring() {
    if (!this.context) return;

    this.context.addEventListener('statechange', async () => {
      console.log('AudioContext state changed:', this.context?.state);

      if (this.context?.state === 'suspended' && !this.audio.paused) {
        console.log('AudioContext suspended while playing, attempting to resume...');
        try {
          await this.context.resume();
          console.log('AudioContext resumed successfully');
        } catch (e) {
          console.error('Failed to resume AudioContext:', e);
          this.emit('audio_error', { type: 'context_suspended', error: e });
        }
      } else if (this.context?.state === 'closed') {
        console.warn('AudioContext was closed unexpectedly');
        this.emit('audio_error', { type: 'context_closed' });
      }
    });
  }
}

export const audioService = new AudioService();
