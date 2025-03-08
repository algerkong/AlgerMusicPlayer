import { Howl, Howler } from 'howler';
import Tuna from 'tunajs';

// 类型定义扩展
interface HowlSound {
  _sounds: Array<{
    _node: HTMLMediaElement & {
      destination?: MediaElementAudioSourceNode;
    };
  }>;
}

export interface EQSettings {
  [key: string]: number;
}

export class EQService {
  private context: AudioContext | null = null;

  private tuna: any = null;

  private equalizer: any = null;

  private source: MediaElementAudioSourceNode | null = null;

  private gainNode: GainNode | null = null;

  private bypass = false;

  // 预设频率
  private readonly frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

  // 默认EQ设置
  private defaultEQSettings: EQSettings = Object.fromEntries(
    this.frequencies.map((f) => [f.toString(), 0])
  );

  constructor() {
    this.loadSavedSettings();
    this.bypass = localStorage.getItem('eqBypass') === 'true';
    this.initializeUserGestureHandler();
  }

  // 初始化用户手势处理
  private initializeUserGestureHandler() {
    const handler = async () => {
      if (this.context?.state === 'suspended') {
        await this.context.resume();
      }
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
  }

  // 初始化音频上下文
  public async setupAudioContext(howl: Howl) {
    try {
      // 使用Howler的现有上下文
      this.context = (Howler.ctx as AudioContext) || new AudioContext();

      // 初始化Howler的音频系统（如果需要）
      if (!Howler.ctx) {
        Howler.ctx = this.context;
        Howler.masterGain = this.context.createGain();
        Howler.masterGain.connect(this.context.destination);
      }

      // 确保上下文处于运行状态
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      const sound = (howl as unknown as HowlSound)._sounds[0];
      if (!sound?._node) throw new Error('无法获取音频节点');

      // 清理现有资源
      await this.dispose();

      // 创建新的处理链
      this.tuna = new Tuna(this.context);

      // 创建/复用源节点
      if (!sound._node.destination) {
        this.source = this.context.createMediaElementSource(sound._node);
        sound._node.destination = this.source;
      } else {
        this.source = sound._node.destination;
      }

      // 创建效果节点
      this.gainNode = this.context.createGain();
      this.equalizer = new this.tuna.Equalizer({
        frequencies: this.frequencies,
        gains: this.frequencies.map((f) => this.getSavedGain(f.toString())),
        bypass: this.bypass
      });

      // 连接节点链
      this.source!.connect(this.equalizer.input).connect(this.gainNode).connect(Howler.masterGain);

      // 恢复音量设置
      const volume = localStorage.getItem('volume');
      this.gainNode.gain.value = volume ? parseFloat(volume) : 1;
    } catch (error) {
      console.error('音频上下文初始化失败:', error);
      await this.dispose();
      throw error;
    }
  }

  // EQ功能开关
  public setEnabled(enabled: boolean) {
    this.bypass = !enabled;
    localStorage.setItem('eqBypass', JSON.stringify(this.bypass));
    if (this.equalizer) this.equalizer.bypass = this.bypass;
  }

  public isEnabled(): boolean {
    return !this.bypass;
  }

  // 调整频率增益
  public setFrequencyGain(frequency: string, gain: number) {
    const index = this.frequencies.findIndex((f) => f.toString() === frequency);
    if (index !== -1 && this.equalizer) {
      this.equalizer.setGain(index, gain);
      this.saveSettings(frequency, gain);
    }
  }

  // 重置EQ设置
  public resetEQ() {
    this.frequencies.forEach((f) => {
      this.setFrequencyGain(f.toString(), 0);
    });
    localStorage.removeItem('eqSettings');
  }

  // 获取当前设置
  public getAllSettings(): EQSettings {
    return this.loadSavedSettings();
  }

  // 保存/加载设置
  private saveSettings(frequency: string, gain: number) {
    const settings = this.loadSavedSettings();
    settings[frequency] = gain;
    localStorage.setItem('eqSettings', JSON.stringify(settings));
  }

  private loadSavedSettings(): EQSettings {
    const saved = localStorage.getItem('eqSettings');
    return saved ? JSON.parse(saved) : { ...this.defaultEQSettings };
  }

  private getSavedGain(frequency: string): number {
    return this.loadSavedSettings()[frequency] || 0;
  }

  // 清理资源
  public async dispose() {
    try {
      [this.source, this.equalizer, this.gainNode].forEach((node) => {
        if (node) {
          node.disconnect();
          // 特殊清理Tuna节点
          if (node instanceof Tuna.Equalizer) node.destroy();
        }
      });

      if (this.context && this.context !== Howler.ctx) {
        await this.context.close();
      }

      this.context = null;
      this.tuna = null;
      this.source = null;
      this.equalizer = null;
      this.gainNode = null;
    } catch (error) {
      console.error('资源清理失败:', error);
    }
  }
}

export const eqService = new EQService();
