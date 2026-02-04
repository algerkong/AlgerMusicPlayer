// 扩展 AudioContext 以支持 setSinkId (Chromium 110+)
interface AudioContext {
  setSinkId(sinkId: string): Promise<void>;
  readonly sinkId: string;
}

// 音频输出设备类型
export type AudioOutputDevice = {
  deviceId: string;
  label: string;
  isDefault: boolean;
};
