import axios from 'axios';

import type { SongResult } from '@/types/music';

import { validatePluginMediaSource } from '../../../shared/musicSourcePlugin';
import type { ResolveSongResult } from './types';

const normalizePositiveInteger = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isSafeInteger(normalized) && normalized > 0 ? normalized : 0;
};

const normalizeDuration = (value: unknown): number => {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized >= 0 ? Math.round(normalized) : 0;
};

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const buildContainerMusicRequest = (song: SongResult) => {
  const compatibleSong = song as SongResult & { alias?: unknown };
  const album = song.al ?? song.album;
  const artists = song.ar?.length ? song.ar : (song.artists ?? []);
  const aliases = song.alia?.length
    ? song.alia
    : Array.isArray(compatibleSong.alias)
      ? compatibleSong.alias
      : [];

  return {
    id: normalizePositiveInteger(song.id),
    song: {
      name: normalizeText(song.name),
      alias: aliases.map(normalizeText).filter(Boolean),
      duration: normalizeDuration(song.dt ?? song.duration),
      album: {
        id: normalizePositiveInteger(album?.id),
        name: normalizeText(album?.name)
      },
      artists: artists.map((artist) => ({
        id: normalizePositiveInteger(artist?.id),
        name: normalizeText(artist?.name)
      }))
    }
  };
};

export const resolveContainerSong = async (
  apiUrl: string,
  song: SongResult
): Promise<ResolveSongResult | null> => {
  try {
    const response = await axios.post(apiUrl, buildContainerMusicRequest(song), {
      timeout: 17000
    });
    if (response.data?.code !== 200 || typeof response.data.message !== 'string') return null;

    const data = response.data.data;
    const media = validatePluginMediaSource({
      url: data?.url,
      format: data?.type,
      br: data?.br
    });
    if (!media) return null;

    return {
      media,
      providerKey: 'container',
      providerName: 'Docker',
      attempts: [{ providerKey: 'container', ok: true }]
    };
  } catch (error) {
    console.warn('Container music request failed', {
      code: axios.isAxiosError(error) ? error.response?.status || error.code : undefined
    });
    return null;
  }
};
