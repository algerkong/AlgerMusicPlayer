/**
 * Local music source plugin contract.
 *
 * The contract is intentionally limited to media URL resolution. Content
 * source APIs can be added later without changing the playback path.
 */

export type MusicSourcePluginDialect = 'native' | 'musicfree' | 'lxmusic';

export type MusicSourcePluginVarType = 'text' | 'secret' | 'url';

export type MusicSourcePluginVar = {
  key: string;
  label: string;
  type: MusicSourcePluginVarType;
  required: boolean;
  placeholder?: string;
};

export type MusicSourcePlugin = {
  id: string;
  platform: string;
  name: string;
  dialect: MusicSourcePluginDialect;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  sourceUrl?: string;
  source: string;
  vars: MusicSourcePluginVar[];
  userVars: Record<string, string>;
  enabled: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
};

export type MusicSourcePluginMeta = {
  name: string;
  platform?: string;
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  sourceUrl?: string;
  vars: MusicSourcePluginVar[];
};

export type { PluginMediaSource } from '../../shared/musicSourcePlugin';

export const LOCAL_PLUGIN_SOURCE_PREFIX = 'plugin:';

export const getMusicSourcePluginKey = (pluginId: string): `plugin:${string}` =>
  `${LOCAL_PLUGIN_SOURCE_PREFIX}${pluginId}`;

export const isMusicSourcePluginKey = (source: string): boolean =>
  source.startsWith(LOCAL_PLUGIN_SOURCE_PREFIX);

export const getMusicSourcePluginId = (source: string): string =>
  source.startsWith(LOCAL_PLUGIN_SOURCE_PREFIX)
    ? source.slice(LOCAL_PLUGIN_SOURCE_PREFIX.length)
    : source;
