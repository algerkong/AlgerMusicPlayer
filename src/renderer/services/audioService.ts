import { Howl, Howler } from 'howler';

import type { AudioOutputDevice } from '@/types/audio';
import type { SongResult } from '@/types/music';
import { isElectron } from '@/utils'; // 导入isElectron常量

class AudioService {
  private currentSound: Howl | null = null;
  private pendingSound: Howl | null = null;

  private currentTrack: SongResult | null = null;

  private context: AudioContext | null = null;

  private filters: BiquadFilterNode[] = [];

  private source: MediaElementAudioSourceNode | null = null;

  private gainNode: GainNode | null = null;

  private bypass = false;

  private playbackRate = 1.0; // 添加播放速度属性

  private currentSinkId: string = 'default';

  private contextStateMonitoringInitialized = false;

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
    try {
      if (!('mediaSession' in navigator)) return;

      const artists = track.ar
        ? track.ar.map((a) => a.name)
        : track.song.artists?.map((a) => a.name);
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
      if (!this.currentSound || !('mediaSession' in navigator)) return;
      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: this.currentSound.duration(),
          playbackRate: this.playbackRate,
          position: this.currentSound.seek() as number
        });
      }
    } catch (error) {
      console.error('更新媒体会话位置状态时出错:', error);
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

      // 设置 AudioContext 状态监控
      this.setupContextStateMonitoring();

      // 恢复保存的音频输出设备
      this.restoreSavedAudioDevice();

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
      // 断开所有现有连接（捕获已断开的错误）
      try {
        this.source.disconnect();
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
      console.error('Error applying EQ state, attempting fallback:', error);
      // Fallback: connect source directly to destination
      try {
        if (this.source && this.context) {
          this.source.connect(this.context.destination);
          console.log('Fallback: connected source directly to destination');
        }
      } catch (fallbackError) {
        console.error('Fallback connection also failed:', fallbackError);
        this.emit('audio_error', { type: 'graph_disconnected', error: fallbackError });
      }
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
  public play(
    url: string,
    track: SongResult,
    isPlay: boolean = true,
    seekTime: number = 0,
    existingSound?: Howl
  ): Promise<Howl> {
    // 如果没有提供新的 URL 和 track，且当前有音频实例，则继续播放当前音频
    if (this.currentSound && !url && !track) {
      if (this.seekLock && this.seekDebounceTimer) {
        clearTimeout(this.seekDebounceTimer);
        this.seekLock = false;
      }
      this.currentSound.play();
      return Promise.resolve(this.currentSound);
    }

    // 新播放请求：强制重置旧锁，确保不会被遗留锁阻塞
    this.forceResetOperationLock();

    // 获取操作锁
    if (!this.setOperationLock()) {
      // 理论上不会到这里（刚刚 forceReset 过），但作为防御性编程
      console.warn('audioService: 获取操作锁失败，强制继续');
      this.forceResetOperationLock();
      this.setOperationLock();
    }

    // 如果没有提供必要的参数，返回错误
    if (!url || !track) {
      this.releaseOperationLock();
      return Promise.reject(new Error('缺少必要参数: url和track'));
    }

    // 检查是否是同一首歌曲的无缝切换（Hot-Swap）
    const isHotSwap =
      this.currentTrack && track && this.currentTrack.id === track.id && this.currentSound;

    if (isHotSwap) {
      console.log('audioService: 检测到同一首歌曲的源切换，启用无缝切换模式');
    }

    return new Promise<Howl>((resolve, reject) => {
      let retryCount = 0;
      const maxRetries = 1;

      // 如果有正在加载的 pendingSound，先清理掉
      if (this.pendingSound) {
        console.log('audioService: 清理正在加载的 pendingSound');
        this.pendingSound.unload();
        this.pendingSound = null;
      }

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
            // 重新创建上下文后恢复输出设备
            this.restoreSavedAudioDevice();
          }

          // 恢复上下文状态
          if (Howler.ctx.state === 'suspended') {
            console.log('audioService: 恢复暂停的音频上下文');
            await Howler.ctx.resume();
          }

          // 非热切换模式下，先停止并清理现有的音频实例
          if (!isHotSwap && this.currentSound) {
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

          // 清理 EQ 但保持上下文 (热切换时暂时不清理，等切换完成后再处理)
          if (!isHotSwap) {
            console.log('audioService: 清理 EQ');
            await this.disposeEQ(true);
          }

          // 如果不是热切换，立即更新 currentTrack
          if (!isHotSwap) {
            this.currentTrack = track;
          }

          let newSound: Howl;

          if (existingSound) {
            console.log('audioService: 使用预加载的 Howl 对象');
            newSound = existingSound;
            // 确保 volume 和 rate 正确
            newSound.volume(1); // 内部 volume 设为 1，由 Howler.masterGain 控制实际音量
            newSound.rate(this.playbackRate);

            // 重新绑定事件监听器，因为 PreloadService 可能没有绑定这些
            // 注意：Howler 允许重复绑定，但最好先清理（如果无法清理，就直接绑定，Howler 是 EventEmitter）
            // 这里我们假设 existingSound 是干净的或者我们只绑定我们需要关心的
          } else {
            console.log('audioService: 创建新的 Howl 对象');
            newSound = new Howl({
              src: [url],
              html5: true,
              autoplay: false,
              volume: 1, // 禁用 Howler.js 音量控制
              rate: this.playbackRate,
              format: ['mp3', 'aac']
            });
          }

          // 统一设置事件处理
          const setupEvents = () => {
            newSound.off('loaderror');
            newSound.off('playerror');
            newSound.off('load');

            newSound.on('loaderror', (_, error) => {
              console.error('Audio load error:', error);
              this.emit('loaderror', { track, error });
              if (retryCount < maxRetries && !existingSound) {
                // 预加载的音频通常已经 loaded，不应重试
                retryCount++;
                console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
                setTimeout(tryPlay, 1000 * retryCount);
              } else {
                this.emit('url_expired', track);
                this.releaseOperationLock();
                if (isHotSwap) this.pendingSound = null;
                reject(new Error('音频加载失败，请尝试切换其他歌曲'));
              }
            });

            newSound.on('playerror', (_, error) => {
              console.error('Audio play error:', error);
              this.emit('playerror', { track, error });
              if (retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying playback (${retryCount}/${maxRetries})...`);
                setTimeout(tryPlay, 1000 * retryCount);
              } else {
                this.emit('url_expired', track);
                this.releaseOperationLock();
                if (isHotSwap) this.pendingSound = null;
                reject(new Error('音频播放失败，请尝试切换其他歌曲'));
              }
            });

            const onLoaded = async () => {
              try {
                // 如果是热切换，现在执行切换逻辑
                if (isHotSwap) {
                  console.log('audioService: 执行无缝切换');

                  // 1. 获取当前播放进度或使用指定的 seekTime
                  let targetPos = 0;
                  if (seekTime > 0) {
                    // 如果有指定的 seekTime（如恢复播放进度），优先使用
                    targetPos = seekTime;
                    console.log(`audioService: 使用指定的 seekTime: ${seekTime}s`);
                  } else if (this.currentSound) {
                    // 否则同步当前进度
                    targetPos = this.currentSound.seek() as number;
                  }

                  // 2. 同步新音频进度
                  newSound.seek(targetPos);

                  // 3. 初始化新音频的 EQ
                  await this.disposeEQ(true);
                  await this.setupEQ(newSound);

                  // 4. 播放新音频
                  if (isPlay) {
                    newSound.play();
                  }

                  // 5. 停止旧音频
                  if (this.currentSound) {
                    this.currentSound.stop();
                    this.currentSound.unload();
                  }

                  // 6. 更新引用
                  this.currentSound = newSound;
                  this.currentTrack = track;
                  this.pendingSound = null;

                  console.log(`audioService: 无缝切换完成，进度同步至 ${targetPos}s`);
                } else {
                  // 普通加载逻辑
                  await this.setupEQ(newSound);
                  this.currentSound = newSound;
                }

                // 重新应用已保存的音量
                const savedVolume = localStorage.getItem('volume');
                if (savedVolume) {
                  this.applyVolume(parseFloat(savedVolume));
                }

                if (this.currentSound) {
                  try {
                    if (!isHotSwap && seekTime > 0) {
                      this.currentSound.seek(seekTime);
                    }

                    console.log('audioService: 音频加载成功，设置 EQ');
                    this.updateMediaSessionMetadata(track);
                    this.updateMediaSessionPositionState();
                    this.emit('load');

                    if (!isHotSwap) {
                      console.log('audioService: 音频完全初始化，isPlay =', isPlay);
                      if (isPlay) {
                        console.log('audioService: 开始播放');
                        this.currentSound.play();
                      }
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
            };

            if (newSound.state() === 'loaded') {
              onLoaded();
            } else {
              newSound.once('load', onLoaded);
            }
          };

          setupEvents();

          if (isHotSwap) {
            this.pendingSound = newSound;
          } else {
            this.currentSound = newSound;
          }

          // 设置音频事件监听 (play, pause, end, seek)
          // ... (保持原有的事件监听逻辑不变，但需要确保绑定到 newSound)
          const soundInstance = newSound;
          if (soundInstance) {
            // 清除旧的监听器以防重复
            soundInstance.off('play');
            soundInstance.off('pause');
            soundInstance.off('end');
            soundInstance.off('seek');

            soundInstance.on('play', () => {
              if (this.currentSound === soundInstance) {
                this.updateMediaSessionState(true);
                this.emit('play');
              }
            });

            soundInstance.on('pause', () => {
              if (this.currentSound === soundInstance) {
                this.updateMediaSessionState(false);
                this.emit('pause');
              }
            });

            soundInstance.on('end', () => {
              if (this.currentSound === soundInstance) {
                this.emit('end');
              }
            });

            soundInstance.on('seek', () => {
              if (this.currentSound === soundInstance) {
                this.updateMediaSessionPositionState();
                this.emit('seek');
              }
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

  // ==================== 音频输出设备管理 ====================

  /**
   * 获取可用的音频输出设备列表
   */
  public async getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
    try {
      // 先尝试获取一个临时音频流来触发权限授予
      // 确保 enumerateDevices 返回完整的设备信息（包括 label）
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // 即使失败也继续，可能已有权限
      }

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

  /**
   * 设置音频输出设备
   * 使用 AudioContext.setSinkId() 而不是 HTMLMediaElement.setSinkId()
   * 因为音频通过 MediaElementAudioSourceNode 进入 Web Audio 图后，
   * HTMLMediaElement.setSinkId() 不再生效
   */
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

  /**
   * 获取当前输出设备ID
   */
  public getCurrentSinkId(): string {
    return this.currentSinkId;
  }

  /**
   * 恢复保存的音频输出设备设置
   */
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

  /**
   * 设置 AudioContext 状态监控
   * 监听上下文状态变化，自动恢复 suspended 状态
   */
  private setupContextStateMonitoring() {
    if (!this.context || this.contextStateMonitoringInitialized) return;

    this.context.addEventListener('statechange', async () => {
      console.log('AudioContext state changed:', this.context?.state);

      if (this.context?.state === 'suspended' && this.currentSound?.playing()) {
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

    this.contextStateMonitoringInitialized = true;
    console.log('AudioContext state monitoring initialized');
  }

  /**
   * 验证音频图是否正确连接
   * 用于检测音频播放前的图状态
   */
  // 检查音频图是否连接（调试用，保留供 EQ 诊断）
  // @ts-ignore 保留供调试使用
  private isAudioGraphConnected(): boolean {
    if (!this.context || !this.gainNode || !this.source) {
      return false;
    }

    try {
      // 检查 context 是否运行
      if (this.context.state !== 'running') {
        console.warn('AudioContext is not running, state:', this.context.state);
        return false;
      }

      // Web Audio API 不直接暴露连接状态，
      // 但我们可以验证节点存在且 context 有效
      return true;
    } catch (e) {
      console.error('Error checking audio graph:', e);
      return false;
    }
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
      // 核心判断：Howler API 是否报告正在播放 + 音频上下文是否正常
      // 注意：不再检查 isAudioGraphConnected()，因为 EQ 重建期间
      // source/gainNode 会暂时为 null，导致误判为未播放
      const isPlaying = this.currentSound.playing();
      const isLoading = this.isLoading();
      const contextRunning = Howler.ctx && Howler.ctx.state === 'running';

      return isPlaying && !isLoading && contextRunning;
    } catch (error) {
      console.error('检查播放状态出错:', error);
      return false;
    }
  }
}

export const audioService = new AudioService();
