import type { LxMusicInfo } from '@/types/lxMusic';
import type { SongResult } from '@/types/music';
import type { MusicSourcePluginDialect } from '@/types/musicSourcePlugin';

export { validatePluginMediaSource } from '../../shared/musicSourcePlugin';

const QUALITY_TO_MUSICFREE: Record<string, string> = {
  // MusicFree 音质档位：low=128k / standard=192k / high=320k / super=无损
  standard: 'low',
  higher: 'standard',
  exhigh: 'high',
  lossless: 'super',
  hires: 'super',
  jyeffect: 'high',
  sky: 'high',
  dolby: 'high',
  jymaster: 'super'
};

const MUSICFREE_QUALITY_LADDER = ['super', 'high', 'standard', 'low'];

const QUALITY_TO_LX: Record<string, '128k' | '320k' | 'flac' | 'flac24bit'> = {
  standard: '128k',
  higher: '320k',
  exhigh: '320k',
  lossless: 'flac',
  hires: 'flac24bit',
  jyeffect: 'flac',
  sky: 'flac',
  dolby: 'flac',
  jymaster: 'flac24bit'
};

export const getMusicFreeQualityLadder = (quality: string): string[] => {
  const target = QUALITY_TO_MUSICFREE[quality] || 'standard';
  const index = MUSICFREE_QUALITY_LADDER.indexOf(target);
  return [
    ...MUSICFREE_QUALITY_LADDER.slice(index),
    ...MUSICFREE_QUALITY_LADDER.slice(0, index).reverse()
  ];
};

export const getPluginQuality = (quality: string, dialect: MusicSourcePluginDialect): string => {
  if (dialect === 'musicfree') return getMusicFreeQualityLadder(quality)[0] || 'standard';
  if (dialect === 'lxmusic') return QUALITY_TO_LX[quality] || '320k';
  return quality || 'exhigh';
};

export const inferPluginAudioFormat = (url: string, br?: number): string => {
  const extension = /\.(flac|mp3|m4a|aac|ogg|wav|webm)(?:\?|$)/i.exec(url)?.[1];
  if (extension) return extension.toLowerCase();
  return br !== undefined && br >= 800000 ? 'flac' : 'mp3';
};

export const qualityToBitrate = (quality: string): number => {
  const values: Record<string, number> = {
    standard: 128000,
    higher: 192000,
    exhigh: 320000,
    lossless: 999000,
    hires: 999000,
    jyeffect: 320000,
    sky: 320000,
    dolby: 320000,
    jymaster: 999000
  };
  return values[quality] || 320000;
};

/** SongResult → LX Music 协议的 musicInfo（歌曲固定按网易云源解析） */
export const toLxMusicInfo = (song: SongResult): LxMusicInfo => {
  const artistName =
    song.ar && song.ar.length > 0
      ? song.ar.map((a) => a.name).join('、')
      : song.artists && song.artists.length > 0
        ? song.artists.map((a) => a.name).join('、')
        : '';
  const duration = song.dt || song.duration || 0;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);

  return {
    songmid: song.id,
    name: song.name,
    singer: artistName,
    album: song.al?.name || (song.album as { name?: string } | undefined)?.name || '',
    albumId: song.al?.id || (song.album as { id?: string | number } | undefined)?.id || '',
    source: 'wy',
    interval: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
    img: song.picUrl || song.al?.picUrl || ''
  };
};
