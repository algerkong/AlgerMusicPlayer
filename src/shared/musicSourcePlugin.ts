export type PluginMediaSource = {
  url: string;
  headers?: Record<string, string>;
  format?: string;
  br?: number;
};

/**
 * 本地音源插件音频代理协议。HTML audio 元素无法携带自定义请求头，
 * 带头的直链由主进程协议代理请求；下载队列复用同一编码携带请求头。
 */
export const PLUGIN_MEDIA_SCHEME = 'pluginmedia';

type PluginMediaPayload = {
  url: string;
  headers?: Record<string, string>;
};

const encodePayload = (payload: PluginMediaPayload): string =>
  encodeURIComponent(JSON.stringify(payload));

export const buildPluginMediaUrl = (url: string, headers?: Record<string, string>): string => {
  if (!headers || Object.keys(headers).length === 0) return url;
  return `${PLUGIN_MEDIA_SCHEME}://p/?d=${encodePayload({ url, headers })}`;
};

export const parsePluginMediaUrl = (
  value: string
): { url: string; headers: Record<string, string> } | null => {
  if (typeof value !== 'string' || !value.startsWith(`${PLUGIN_MEDIA_SCHEME}://`)) return null;
  try {
    const parsed = new URL(value);
    const raw = parsed.searchParams.get('d');
    if (!raw) return null;
    const payload = JSON.parse(raw) as PluginMediaPayload;
    const url = validatePluginHttpUrl(payload.url);
    if (!url) return null;

    const headers: Record<string, string> = {};
    for (const [name, content] of Object.entries(payload.headers || {})) {
      if (
        !/^[!#$%&'*+.^_`|~\w-]+$/.test(name) ||
        name.length > 128 ||
        typeof content !== 'string' ||
        content.length > 1024
      ) {
        return null;
      }
      headers[name] = content;
    }
    return { url, headers };
  } catch {
    return null;
  }
};

export const validatePluginHttpUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length > 2048 || /[\r\n]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
};

export const validatePluginMediaSource = (value: unknown): PluginMediaSource | null => {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const url = validatePluginHttpUrl(raw.url);
  if (!url) return null;
  const headers: Record<string, string> = {};
  if (raw.headers !== undefined) {
    if (!raw.headers || typeof raw.headers !== 'object' || Array.isArray(raw.headers)) return null;
    const entries = Object.entries(raw.headers);
    if (entries.length > 32) return null;
    for (const [name, content] of entries) {
      if (
        !/^[!#$%&'*+.^_`|~\w-]+$/.test(name) ||
        name.length > 128 ||
        typeof content !== 'string' ||
        content.length > 1024 ||
        /[\r\n\0]/.test(content) ||
        /^(host|connection|content-length|transfer-encoding|upgrade|proxy-.+)$/i.test(name)
      )
        return null;
      headers[name] = content;
    }
  }
  const format =
    typeof raw.format === 'string' && /^[a-z0-9]{1,8}$/i.test(raw.format)
      ? raw.format.toLowerCase()
      : undefined;
  const br =
    typeof raw.br === 'number' && Number.isFinite(raw.br) && raw.br > 0 ? raw.br : undefined;
  return {
    url,
    ...(Object.keys(headers).length ? { headers } : {}),
    ...(format ? { format } : {}),
    ...(br ? { br } : {})
  };
};
