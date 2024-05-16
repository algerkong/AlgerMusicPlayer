export interface ILyric {
  sgc: boolean;
  sfy: boolean;
  qfy: boolean;
  lrc: Lrc;
  klyric: Lrc;
  tlyric: Lrc;
  code: number;
}

interface Lrc {
  version: number;
  lyric: string;
}
