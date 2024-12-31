import { Howl } from 'howler';

class AudioService {
  private currentSound: Howl | null = null;

  play(url: string) {
    if (this.currentSound) {
      this.currentSound.unload();
    }
    this.currentSound = null;
    this.currentSound = new Howl({
      src: [url],
      html5: true,
      autoplay: true,
      volume: localStorage.getItem('volume')
        ? parseFloat(localStorage.getItem('volume') as string)
        : 1
    });

    return this.currentSound;
  }

  getCurrentSound() {
    return this.currentSound;
  }

  stop() {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.unload();
      this.currentSound = null;
    }
  }

  // 监听播放
  onPlay(callback: () => void) {
    if (this.currentSound) {
      this.currentSound.on('play', callback);
    }
  }

  // 监听暂停
  onPause(callback: () => void) {
    if (this.currentSound) {
      this.currentSound.on('pause', callback);
    }
  }

  // 监听结束
  onEnd(callback: () => void) {
    if (this.currentSound) {
      this.currentSound.on('end', callback);
    }
  }
}

export const audioService = new AudioService();
