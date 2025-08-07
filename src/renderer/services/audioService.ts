import { Howl, Howler } from 'howler';

import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils'; // 导入isElectron常量

class AudioService {
  private currentSound: Howl | null = null;

  private currentTrack: SongResult | null = null;

  private context: AudioContext | null = null;

  private filters: BiquadFilterNode[] = [];

  private source: MediaElementAudioSourceNode | null = null;

  private gainNode: GainNode | null = null;

  private bypass = false;

  private playbackRate = 1.0; // 添加播放速度属性

  // 预设的 EQ 频段
  private readonly frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  // 默认的 EQ 设置
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

  private retryCount = 0;

  private seekLock = false;

  private seekDebounceTimer: NodeJS.Timeout | null = null;

  // 添加操作锁防止并发操作
  private operationLock = false;
  private operationLockTimer: NodeJS.Timeout | null = null;
  private operationLockTimeout = 5000; // 5秒超时
  private operationLockStartTime: number = 0;
  private operationLockId: string = '';

  constructor() {
    if ('mediaSession' in navigator) {
      this.initMediaSession();
    }
    // 从本地存储加载 EQ 开关状态
    const bypassState = localStorage.getItem('eqBypass');
    this.bypass = bypassState ? JSON.parse(bypassState) : false;

    // 页面加载时立即强制重置操作锁
    this.forceResetOperationLock();

    // 添加页面卸载事件，确保离开页面时清除锁
    window.addEventListener('beforeunload', () => {
      this.forceResetOperationLock();
    });
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
        // this.currentSound.seek(event.seekTime);
        this.seek(event.seekTime);
      }
    });

    navigator.mediaSession.setActionHandler('seekbackward', (event) => {
      if (this.currentSound) {
        const currentTime = this.currentSound.seek() as number;
        this.seek(currentTime - (event.seekOffset || 10));
      }
    });

    navigator.mediaSession.setActionHandler('seekforward', (event) => {
      if (this.currentSound) {
        const currentTime = this.currentSound.seek() as number;
        this.seek(currentTime + (event.seekOffset || 10));
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
        playbackRate: this.playbackRate,
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

  // EQ 相关方法
  public isEQEnabled(): boolean {
    return !this.bypass;
  }

  public setEQEnabled(enabled: boolean) {
    this.bypass = !enabled;
    localStorage.setItem('eqBypass', JSON.stringify(this.bypass));

    if (this.source && this.gainNode && this.context) {
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

  private saveEQSettings(frequency: string, gain: number) {
    const settings = this.loadEQSettings();
    settings[frequency] = gain;
    localStorage.setItem('eqSettings', JSON.stringify(settings));
  }

  private loadEQSettings(): { [key: string]: number } {
    const savedSettings = localStorage.getItem('eqSettings');
    return savedSettings ? JSON.parse(savedSettings) : { ...this.defaultEQSettings };
  }

  private async disposeEQ(keepContext = false) {
    try {
      // 清理音频节点连接
      if (this.source) {
        this.source.disconnect();
        this.source = null;
      }

      // 清理滤波器
      this.filters.forEach((filter) => {
        try {
          filter.disconnect();
        } catch (e) {
          console.warn('清理滤波器时出错:', e);
        }
      });
      this.filters = [];

      // 清理增益节点
      if (this.gainNode) {
        this.gainNode.disconnect();
        this.gainNode = null;
      }

      // 如果不需要保持上下文，则关闭它
      if (!keepContext && this.context) {
        try {
          await this.context.close();
          this.context = null;
        } catch (e) {
          console.warn('关闭音频上下文时出错:', e);
        }
      }
    } catch (error) {
      console.error('清理EQ资源时出错:', error);
    }
  }

  private async setupEQ(sound: Howl) {
    try {
      if (!isElectron) {
        console.log('Web环境中跳过EQ设置，避免CORS问题');
        this.bypass = true;
        return;
      }
      const howl = sound as any;

      const audioNode = howl._sounds?.[0]?._node;

      if (!audioNode || !(audioNode instanceof HTMLMediaElement)) {
        if (this.retryCount < 3) {
          console.warn('等待音频节点初始化，重试次数:', this.retryCount + 1);
          await new Promise((resolve) => setTimeout(resolve, 100));
          this.retryCount++;
          return await this.setupEQ(sound);
        }
        throw new Error('无法获取音频节点，请重试');
      }

      this.retryCount = 0;

      // 确保使用 Howler 的音频上下文
      this.context = Howler.ctx as AudioContext;

      if (!this.context || this.context.state === 'closed') {
        Howler.ctx = new AudioContext();
        this.context = Howler.ctx;
        Howler.masterGain = this.context.createGain();
        Howler.masterGain.connect(this.context.destination);
      }

      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      // 清理现有连接
      await this.disposeEQ(true);

      try {
        // 检查节点是否已经有源
        const existingSource = (audioNode as any).source as MediaElementAudioSourceNode;
        if (existingSource?.context === this.context) {
          console.log('复用现有音频源节点');
          this.source = existingSource;
        } else {
          // 创建新的源节点
          console.log('创建新的音频源节点');
          this.source = this.context.createMediaElementSource(audioNode);
          (audioNode as any).source = this.source;
        }
      } catch (e) {
        console.error('创建音频源节点失败:', e);
        throw e;
      }

      // 创建增益节点
      this.gainNode = this.context.createGain();

      // 创建滤波器
      this.filters = this.frequencies.map((freq) => {
        const filter = this.context!.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.value = freq;
        filter.Q.value = 1;
        filter.gain.value = this.loadEQSettings()[freq.toString()] || 0;
        return filter;
      });

      // 应用EQ状态
      this.applyBypassState();

      // 从 localStorage 应用音量到增益节点
      const savedVolume = localStorage.getItem('volume');
      if (savedVolume) {
        this.applyVolume(parseFloat(savedVolume));
      } else {
        this.applyVolume(1);
      }

      console.log('EQ initialization successful');
    } catch (error) {
      console.error('EQ initialization failed:', error);
      await this.disposeEQ();
      throw error;
    }
  }

  private applyBypassState() {
    if (!this.source || !this.gainNode || !this.context) return;

    try {
      // 断开所有现有连接
      this.source.disconnect();
      this.filters.forEach((filter) => filter.disconnect());
      this.gainNode.disconnect();

      if (this.bypass) {
        // EQ被禁用时，直接连接到输出
        this.source.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      } else {
        // EQ启用时，通过滤波器链连接
        this.source.connect(this.filters[0]);
        this.filters.forEach((filter, index) => {
          if (index < this.filters.length - 1) {
            filter.connect(this.filters[index + 1]);
          }
        });
        this.filters[this.filters.length - 1].connect(this.gainNode);
        this.gainNode.connect(this.context.destination);
      }
    } catch (error) {
      console.error('应用EQ状态时出错:', error);
    }
  }

  // 设置操作锁，带超时自动释放
  private setOperationLock(): boolean {
    // 生成唯一的锁ID
    const lockId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

    // 如果锁已经存在，检查是否超时
    if (this.operationLock) {
      const currentTime = Date.now();
      const lockDuration = currentTime - this.operationLockStartTime;

      // 如果锁持续时间超过2秒，直接强制重置
      if (lockDuration > 2000) {
        console.warn(`操作锁已激活 ${lockDuration}ms，超过安全阈值，强制重置`);
        this.forceResetOperationLock();
      } else {
        console.log(`操作锁激活中，持续时间 ${lockDuration}ms`);
        return false;
      }
    }

    this.operationLock = true;
    this.operationLockStartTime = Date.now();
    this.operationLockId = lockId;

    // 将锁信息存储到 localStorage（仅用于调试，实际不依赖此值）
    try {
      localStorage.setItem(
        'audioOperationLock',
        JSON.stringify({
          id: this.operationLockId,
          startTime: this.operationLockStartTime
        })
      );
    } catch (error) {
      console.error('存储操作锁信息失败:', error);
    }

    // 清除之前的定时器
    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
    }

    // 设置超时自动释放锁
    this.operationLockTimer = setTimeout(() => {
      console.warn('操作锁超时自动释放');
      this.releaseOperationLock();
    }, this.operationLockTimeout);

    return true;
  }

  // 释放操作锁
  public releaseOperationLock(): void {
    this.operationLock = false;
    this.operationLockStartTime = 0;

    // 从 localStorage 中移除锁信息
    try {
      localStorage.removeItem('audioOperationLock');
    } catch (error) {
      console.error('清除存储的操作锁信息失败:', error);
    }

    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }
  }

  // 强制重置操作锁，用于特殊情况
  public forceResetOperationLock(): void {
    console.log('强制重置操作锁');
    this.operationLock = false;
    this.operationLockStartTime = 0;
    this.operationLockId = '';

    if (this.operationLockTimer) {
      clearTimeout(this.operationLockTimer);
      this.operationLockTimer = null;
    }

    // 清除存储的锁
    localStorage.removeItem('audioOperationLock');
  }

  // 播放控制相关
  play(
    url?: string,
    track?: SongResult,
    isPlay: boolean = true,
    seekTime: number = 0
  ): Promise<Howl> {
    // 每次调用play方法时，尝试强制重置锁（注意：仅在页面刷新后的第一次播放时应用）
    if (!this.currentSound) {
      console.log('首次播放请求，强制重置操作锁');
      this.forceResetOperationLock();
    }

    // 如果操作锁已激活，但持续时间超过安全阈值，强制重置
    if (this.operationLock) {
      const currentTime = Date.now();
      const lockDuration = currentTime - this.operationLockStartTime;

      if (lockDuration > 2000) {
        console.warn(`操作锁已激活 ${lockDuration}ms，超过安全阈值，强制重置`);
        this.forceResetOperationLock();
      }
    }

    // 获取锁
    if (!this.setOperationLock()) {
      console.log('audioService: 操作锁激活，强制执行当前播放请求');

      // 如果只是要继续播放当前音频，直接执行
      if (this.currentSound && !url && !track) {
        if (this.seekLock && this.seekDebounceTimer) {
          clearTimeout(this.seekDebounceTimer);
          this.seekLock = false;
        }
        this.currentSound.play();
        return Promise.resolve(this.currentSound);
      }

      // 强制释放锁并继续执行
      this.forceResetOperationLock();

      // 这里不再返回错误，而是继续执行播放逻辑
    }

    // 如果没有提供新的 URL 和 track，且当前有音频实例，则继续播放
    if (this.currentSound && !url && !track) {
      // 如果有进行中的seek操作，等待其完成
      if (this.seekLock && this.seekDebounceTimer) {
        clearTimeout(this.seekDebounceTimer);
        this.seekLock = false;
      }
      this.currentSound.play();
      this.releaseOperationLock();
      return Promise.resolve(this.currentSound);
    }

    // 如果没有提供必要的参数，返回错误
    if (!url || !track) {
      this.releaseOperationLock();
      return Promise.reject(new Error('缺少必要参数: url和track'));
    }

    return new Promise<Howl>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;

      const tryPlay = async () => {
        try {
          console.log('audioService: 开始创建音频对象');

          // 确保 Howler 上下文已初始化
          if (!Howler.ctx) {
            console.log('audioService: 初始化 Howler 上下文');
            Howler.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          }

          // 确保使用同一个音频上下文
          if (Howler.ctx.state === 'closed') {
            console.log('audioService: 重新创建音频上下文');
            Howler.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.context = Howler.ctx;
            Howler.masterGain = this.context.createGain();
            Howler.masterGain.connect(this.context.destination);
          }

          // 恢复上下文状态
          if (Howler.ctx.state === 'suspended') {
            console.log('audioService: 恢复暂停的音频上下文');
            await Howler.ctx.resume();
          }

          // 先停止并清理现有的音频实例
          if (this.currentSound) {
            console.log('audioService: 停止并清理现有的音频实例');
            // 确保任何进行中的seek操作被取消
            if (this.seekLock && this.seekDebounceTimer) {
              clearTimeout(this.seekDebounceTimer);
              this.seekLock = false;
            }
            this.currentSound.stop();
            this.currentSound.unload();
            this.currentSound = null;
          }

          // 清理 EQ 但保持上下文
          console.log('audioService: 清理 EQ');
          await this.disposeEQ(true);

          this.currentTrack = track;
          console.log('audioService: 创建新的 Howl 对象');
          this.currentSound = new Howl({
            src: [url],
            html5: true,
            autoplay: false,
            volume: 1, // 禁用 Howler.js 音量控制
            rate: this.playbackRate,
            format: ['mp3', 'aac'],
            onloaderror: (_, error) => {
              console.error('Audio load error:', error);
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
                setTimeout(tryPlay, 1000 * retryCount);
              } else {
                // 发送URL过期事件，通知外部需要重新获取URL
                this.emit('url_expired', this.currentTrack);
                this.releaseOperationLock();
                reject(new Error('音频加载失败，请尝试切换其他歌曲'));
              }
            },
            onplayerror: (_, error) => {
              console.error('Audio play error:', error);
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
                setTimeout(tryPlay, 1000 * retryCount);
              } else {
                // 发送URL过期事件，通知外部需要重新获取URL
                this.emit('url_expired', this.currentTrack);
                this.releaseOperationLock();
                reject(new Error('音频播放失败，请尝试切换其他歌曲'));
              }
            },
            onload: async () => {
              try {
                // 初始化音频管道
                await this.setupEQ(this.currentSound!);

                // 重新应用已保存的音量
                const savedVolume = localStorage.getItem('volume');
                if (savedVolume) {
                  this.applyVolume(parseFloat(savedVolume));
                }

                // 音频加载成功后设置 EQ 和更新媒体会话
                if (this.currentSound) {
                  try {
                    if (seekTime > 0) {
                      this.currentSound.seek(seekTime);
                    }
                    console.log('audioService: 音频加载成功，设置 EQ');
                    this.updateMediaSessionMetadata(track);
                    this.updateMediaSessionPositionState();
                    this.emit('load');

                    // 此时音频已完全初始化，根据 isPlay 参数决定是否播放
                    console.log('audioService: 音频完全初始化，isPlay =', isPlay);
                    if (isPlay) {
                      console.log('audioService: 开始播放');
                      this.currentSound.play();
                    }

                    resolve(this.currentSound);
                  } catch (error) {
                    console.error('Audio initialization failed:', error);
                    reject(error);
                  }
                }
              } catch (error) {
                console.error('Audio initialization failed:', error);
                reject(error);
              }
            }
          });

          // 设置音频事件监听
          if (this.currentSound) {
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
          }
        } catch (error) {
          console.error('Error creating audio instance:', error);
          this.releaseOperationLock();
          reject(error);
        }
      };

      tryPlay();
    }).finally(() => {
      // 无论成功或失败都解除操作锁
      this.releaseOperationLock();
    });
  }

  getCurrentSound() {
    return this.currentSound;
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  stop() {
    // 强制重置操作锁并继续执行
    this.forceResetOperationLock();

    try {
      if (this.currentSound) {
        try {
          // 确保任何进行中的seek操作被取消
          if (this.seekLock && this.seekDebounceTimer) {
            clearTimeout(this.seekDebounceTimer);
            this.seekLock = false;
          }
          this.currentSound.stop();
          this.currentSound.unload();
        } catch (error) {
          console.error('停止音频失败:', error);
        }
        this.currentSound = null;
      }

      this.currentTrack = null;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      this.disposeEQ();
    } catch (error) {
      console.error('停止音频时发生错误:', error);
    }
  }

  setVolume(volume: number) {
    this.applyVolume(volume);
  }

  seek(time: number) {
    // 直接强制重置操作锁
    this.forceResetOperationLock();

    if (this.currentSound) {
      try {
        // 直接执行seek操作
        this.currentSound.seek(time);
        // 触发seek事件
        this.updateMediaSessionPositionState();
        this.emit('seek', time);
      } catch (error) {
        console.error('Seek操作失败:', error);
      }
    }
  }

  pause() {
    this.forceResetOperationLock();

    if (this.currentSound) {
      try {
        // 确保任何进行中的seek操作被取消
        if (this.seekLock && this.seekDebounceTimer) {
          clearTimeout(this.seekDebounceTimer);
          this.seekLock = false;
        }
        this.currentSound.pause();
      } catch (error) {
        console.error('暂停音频失败:', error);
      }
    }
  }

  clearAllListeners() {
    this.callbacks = {};
  }

  public getCurrentPreset(): string | null {
    return localStorage.getItem('currentPreset');
  }

  public setCurrentPreset(preset: string): void {
    localStorage.setItem('currentPreset', preset);
  }

  public setPlaybackRate(rate: number) {
    if (!this.currentSound) return;
    this.playbackRate = rate;

    // Howler 的 rate() 在 html5 模式下不生效
    this.currentSound.rate(rate);

    // 取出底层 HTMLAudioElement，改原生 playbackRate
    const sounds = (this.currentSound as any)._sounds as any[];
    sounds.forEach(({ _node }) => {
      if (_node instanceof HTMLAudioElement) {
        _node.playbackRate = rate;
      }
    });

    // 同步给 Media Session UI
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      navigator.mediaSession.setPositionState({
        duration: this.currentSound.duration(),
        playbackRate: rate,
        position: this.currentSound.seek() as number
      });
    }
  }

  public getPlaybackRate(): number {
    return this.playbackRate;
  }

  // 新的音量调节方法
  private applyVolume(volume: number) {
    // 确保值在0到1之间
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    // 使用线性缩放音量
    const linearVolume = normalizedVolume;

    // 将音量应用到所有相关节点
    if (this.gainNode) {
      // 立即设置音量
      this.gainNode.gain.cancelScheduledValues(this.context!.currentTime);
      this.gainNode.gain.setValueAtTime(linearVolume, this.context!.currentTime);
    } else {
      this.currentSound?.volume(linearVolume);
    }

    // 保存值
    localStorage.setItem('volume', linearVolume.toString());

    console.log('Volume applied (linear):', linearVolume);
  }

  // 添加方法检查当前音频是否在加载状态
  isLoading(): boolean {
    if (!this.currentSound) return false;

    // 检查Howl对象的内部状态
    // 如果状态为1表示已经加载但未完成，状态为2表示正在加载
    const state = (this.currentSound as any)._state;
    // 如果操作锁激活也认为是加载状态
    return this.operationLock || state === 'loading' || state === 1;
  }

  // 检查音频是否真正在播放
  isActuallyPlaying(): boolean {
    if (!this.currentSound) return false;

    try {
      // 综合判断:
      // 1. Howler API是否报告正在播放
      // 2. 是否不在加载状态
      // 3. 确保音频上下文状态正常
      const isPlaying = this.currentSound.playing();
      const isLoading = this.isLoading();
      const contextRunning = Howler.ctx && Howler.ctx.state === 'running';

      console.log(
        `实际播放状态检查: playing=${isPlaying}, loading=${isLoading}, contextRunning=${contextRunning}`
      );

      // 只有在三个条件都满足时才认为是真正在播放
      return isPlaying && !isLoading && contextRunning;
    } catch (error) {
      console.error('检查播放状态出错:', error);
      return false;
    }
  }
}

export const audioService = new AudioService();
