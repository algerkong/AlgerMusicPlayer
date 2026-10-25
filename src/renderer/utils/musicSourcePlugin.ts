import type {
  MusicSourcePluginDialect,
  MusicSourcePluginMeta,
  MusicSourcePluginVar,
  MusicSourcePluginVarType
} from '@/types/musicSourcePlugin';

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const META_FIELDS = [
  ['name', 'name'],
  ['platform', 'platform'],
  ['version', 'version'],
  ['author', 'author'],
  ['description', 'description'],
  ['srcUrl', 'sourceUrl'],
  ['homepage', 'homepage']
] as const;
const MF_MARKS = [
  'getMusicInfo',
  'getMusicSheetInfo',
  'getAlbumInfo',
  'getArtistWorks',
  'getTopListDetail',
  'getRecommendSheetTags',
  'getRecommendSheetsByTag',
  'getMusicComments',
  'importMusicSheet',
  'importMusicItem',
  'primaryKey',
  'cacheControl',
  'userVariables',
  'supportedSearchType'
];
const VAR_TYPES = new Set<MusicSourcePluginVarType>(['text', 'secret', 'url']);

const pickMetaBlock = (source: string): string => {
  let first = '';
  for (const match of source.matchAll(/\/\*[*!]?([\s\S]*?)\*\//g)) {
    const body = match[1] || '';
    if (!first) first = body;
    if (/@alger-plugin\b/.test(body)) return body;
  }
  return first;
};

const readMetaField = (body: string, key: string): string | undefined => {
  const match = new RegExp(`@${key}\\s+([^\\n\\r*]+)`).exec(body);
  return match?.[1]?.trim() || undefined;
};

const parseVars = (body: string): MusicSourcePluginVar[] => {
  const vars: MusicSourcePluginVar[] = [];
  const seen = new Set<string>();

  for (const match of body.matchAll(/@var\s+([^\n\r*]+)/g)) {
    if (vars.length >= 32) break;
    const parts = match[1].split('|').map((part) => part.trim());
    const key = (parts[0] || '').slice(0, 64);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const declaredType = parts[2] as MusicSourcePluginVarType | undefined;
    vars.push({
      key,
      label: (parts[1] || key).slice(0, 256),
      type: VAR_TYPES.has(declaredType as MusicSourcePluginVarType)
        ? (declaredType as MusicSourcePluginVarType)
        : 'text',
      required: parts[3] === 'required',
      ...(parts[4] ? { placeholder: parts[4].slice(0, 256) } : {})
    });
  }

  return vars;
};

export const detectMusicSourcePluginDialect = (source: string): MusicSourcePluginDialect | null => {
  const value = typeof source === 'string' ? source : '';
  if (!value.trim()) return null;

  const blocks = value.match(BLOCK_COMMENT) || [];
  if (blocks.some((block) => /@alger-plugin\b/.test(block))) return 'native';

  if (/(?:globalThis|window|self)\s*(?:\.\s*lx\b|\[\s*['"`]lx['"`]\s*\])/.test(value)) {
    return 'lxmusic';
  }

  const musicFreeMark = new RegExp(`\\b(?:${MF_MARKS.join('|')})\\b`);
  if (musicFreeMark.test(value)) return 'musicfree';

  if (/\bplatform\s*:\s*["'`]/.test(value)) return 'native';
  return null;
};

export const parseMusicFreeVars = (value: unknown): MusicSourcePluginVar[] => {
  if (!Array.isArray(value)) return [];

  const vars: MusicSourcePluginVar[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    const key = typeof raw.key === 'string' ? raw.key.trim().slice(0, 64) : '';
    if (!key || seen.has(key) || vars.length >= 32) continue;
    seen.add(key);

    const declaredType = typeof raw.type === 'string' ? raw.type.toLowerCase() : '';
    const type: MusicSourcePluginVarType =
      declaredType === 'password' || declaredType === 'secret'
        ? 'secret'
        : declaredType === 'url'
          ? 'url'
          : declaredType !== 'text' && /pass|secret|token|key$/i.test(key)
            ? 'secret'
            : 'text';
    const label =
      typeof raw.name === 'string' ? raw.name : typeof raw.title === 'string' ? raw.title : key;
    const hint =
      typeof raw.description === 'string'
        ? raw.description
        : typeof raw.hint === 'string'
          ? raw.hint
          : undefined;

    vars.push({
      key,
      label: label.slice(0, 256),
      type,
      required: false,
      ...(hint ? { placeholder: hint.slice(0, 256) } : {})
    });
  }
  return vars;
};

export const parseMusicSourcePluginMeta = (source: string): MusicSourcePluginMeta => {
  const body = pickMetaBlock(source);
  const values = Object.fromEntries(
    META_FIELDS.map(([key, target]) => [target, readMetaField(body, key)])
  ) as Partial<MusicSourcePluginMeta>;

  const platform =
    values.platform || /platform\s*:\s*['"`]([\w-]+)['"`]/.exec(source)?.[1] || undefined;
  const name =
    values.name ||
    platform ||
    (detectMusicSourcePluginDialect(source) === 'lxmusic' ? 'LX Music source' : 'Local source');

  return {
    name,
    ...(platform ? { platform } : {}),
    ...(values.description ? { description: values.description } : {}),
    ...(values.version ? { version: values.version } : {}),
    ...(values.author ? { author: values.author } : {}),
    ...(values.homepage ? { homepage: values.homepage } : {}),
    ...(values.sourceUrl ? { sourceUrl: values.sourceUrl } : {}),
    vars: parseVars(body)
  };
};

export const sanitizeMusicSourcePlatform = (value: string, fallback: string): string => {
  const sanitized = value
    .trim()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return sanitized || fallback;
};

/**
 * A small stable id is enough for local settings. It avoids storing the full
 * source text in another index while still making repeated imports idempotent.
 */
export const hashMusicSource = (source: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};
