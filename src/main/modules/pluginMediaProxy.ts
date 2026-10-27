import { net, protocol } from 'electron';

import { parsePluginMediaUrl, PLUGIN_MEDIA_SCHEME } from '../../shared/musicSourcePlugin';

/**
 * 本地音源插件媒体代理协议。
 *
 * 插件解析出的直链常要求 Referer/User-Agent 等请求头，渲染进程的 audio
 * 元素无法携带，统一改由主进程按 pluginmedia:// 协议代为请求。Range 等
 * 条件请求头原样转发，响应流式透传，保证拖动进度条可用。
 */
export const initPluginMediaProxy = (): void => {
  protocol.handle(PLUGIN_MEDIA_SCHEME, async (request) => {
    const target = parsePluginMediaUrl(request.url);
    if (!target) {
      return new Response(null, { status: 400 });
    }

    const headers: Record<string, string> = { ...target.headers };
    const range = request.headers.get('range');
    if (range) headers['Range'] = range;

    try {
      const upstream = await net.fetch(target.url, {
        method: 'GET',
        headers,
        redirect: 'follow'
      });

      const responseHeaders: Record<string, string> = {};
      for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
        const value = upstream.headers.get(name);
        if (value) responseHeaders[name] = value;
      }

      return new Response(upstream.body, {
        status: upstream.status,
        headers: responseHeaders
      });
    } catch (error) {
      console.error('[PluginMediaProxy] 代理请求失败:', target.url, error);
      return new Response(null, { status: 502 });
    }
  });
};
