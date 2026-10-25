import { describe, expect, it } from 'vitest';

import {
  getMusicFreeQualityLadder,
  getPluginQuality,
  inferPluginAudioFormat,
  qualityToBitrate
} from '../src/renderer/services/musicSourcePluginProtocol';
import {
  getMusicSourcePluginId,
  getMusicSourcePluginKey,
  isMusicSourcePluginKey
} from '../src/renderer/types/musicSourcePlugin';
import {
  detectMusicSourcePluginDialect,
  hashMusicSource,
  parseMusicFreeVars,
  parseMusicSourcePluginMeta,
  sanitizeMusicSourcePlatform
} from '../src/renderer/utils/musicSourcePlugin';
import {
  buildPluginMediaUrl,
  parsePluginMediaUrl,
  validatePluginMediaSource
} from '../src/shared/musicSourcePlugin';

const NATIVE_SOURCE = `/**
 * @name 测试音源
 * @version 1.2.0
 * @author tester
 * @var token | 访问令牌 | secret | required | 请输入令牌
 */
module.exports = {
  platform: 'test-source',
  getMediaSource: async (item, quality, ctx) => ({ url: 'https://example.com/a.mp3' })
};`;

const MUSICFREE_SOURCE = `module.exports = {
  platform: 'demo',
  userVariables: [{ key: 'apikey', name: 'API Key', type: 'password' }],
  getMediaSource: async (musicBase, quality) => 'https://example.com/b.flac'
};`;

const LX_SOURCE = `/*!


*/
const { EVENT_NAMES } = globalThis.lx;
globalThis.lx.on(EVENT_NAMES.request, () => {});`;

describe('detectMusicSourcePluginDialect', () => {
  it('识别 Alger 原生插件', () => {
    expect(detectMusicSourcePluginDialect(NATIVE_SOURCE)).toBe('native');
  });

  it('识别 MusicFree 插件', () => {
    expect(detectMusicSourcePluginDialect(MUSICFREE_SOURCE)).toBe('musicfree');
  });

  it('识别 LX Music 插件', () => {
    expect(detectMusicSourcePluginDialect(LX_SOURCE)).toBe('lxmusic');
  });

  it('空内容返回 null', () => {
    expect(detectMusicSourcePluginDialect('')).toBeNull();
    expect(detectMusicSourcePluginDialect('const x = 1;')).toBeNull();
  });
});

describe('parseMusicSourcePluginMeta', () => {
  it('解析原生插件元信息与变量', () => {
    const meta = parseMusicSourcePluginMeta(NATIVE_SOURCE);
    expect(meta.name).toBe('测试音源');
    expect(meta.version).toBe('1.2.0');
    expect(meta.author).toBe('tester');
    expect(meta.platform).toBe('test-source');
    expect(meta.vars).toHaveLength(1);
    expect(meta.vars[0]).toMatchObject({
      key: 'token',
      label: '访问令牌',
      type: 'secret',
      required: true
    });
  });

  it('无元信息时回退到 platform 字段', () => {
    const meta = parseMusicSourcePluginMeta(MUSICFREE_SOURCE);
    expect(meta.platform).toBe('demo');
    expect(meta.name).toBe('demo');
  });
});

describe('parseMusicFreeVars', () => {
  it('归一化 MusicFree userVariables', () => {
    const vars = parseMusicFreeVars([
      { key: 'apikey', name: 'API Key', type: 'password' },
      { key: 'homepage', title: '主页', type: 'text' },
      'invalid'
    ]);
    expect(vars).toHaveLength(2);
    expect(vars[0]).toMatchObject({ key: 'apikey', type: 'secret' });
    expect(vars[1]).toMatchObject({ key: 'homepage', type: 'text' });
  });
});

describe('validatePluginMediaSource', () => {
  it('接受合法返回值', () => {
    const media = validatePluginMediaSource({
      url: 'https://example.com/a.mp3',
      headers: { Referer: 'https://example.com' },
      format: 'MP3',
      br: 320000
    });
    expect(media).toMatchObject({ url: 'https://example.com/a.mp3', format: 'mp3', br: 320000 });
  });

  it('拒绝非 http(s) URL', () => {
    expect(validatePluginMediaSource({ url: 'file:///etc/passwd' })).toBeNull();
    expect(validatePluginMediaSource({ url: 'javascript:alert(1)' })).toBeNull();
  });

  it('拒绝非法请求头', () => {
    expect(
      validatePluginMediaSource({ url: 'https://a.com/a.mp3', headers: { Host: 'evil.com' } })
    ).toBeNull();
    expect(
      validatePluginMediaSource({ url: 'https://a.com/a.mp3', headers: { Bad: 'a\r\nX: y' } })
    ).toBeNull();
  });
});

describe('plugin media url codec', () => {
  it('无请求头时直接透传原 URL', () => {
    expect(buildPluginMediaUrl('https://example.com/a.mp3')).toBe('https://example.com/a.mp3');
  });

  it('编码后可还原 URL 与请求头', () => {
    const proxied = buildPluginMediaUrl('https://example.com/a.mp3', {
      Referer: 'https://example.com',
      'User-Agent': 'Alger/1.0'
    });
    expect(proxied.startsWith('pluginmedia://')).toBe(true);
    const parsed = parsePluginMediaUrl(proxied);
    expect(parsed).toEqual({
      url: 'https://example.com/a.mp3',
      headers: { Referer: 'https://example.com', 'User-Agent': 'Alger/1.0' }
    });
  });

  it('拒绝伪造的非 http 目标', () => {
    const forged = `pluginmedia://p/?d=${encodeURIComponent(
      JSON.stringify({ url: 'file:///etc/passwd' })
    )}`;
    expect(parsePluginMediaUrl(forged)).toBeNull();
    expect(parsePluginMediaUrl('pluginmedia://p/')).toBeNull();
    expect(parsePluginMediaUrl('https://example.com')).toBeNull();
  });
});

describe('musicSourcePluginProtocol', () => {
  it('音质映射到各方言', () => {
    expect(getPluginQuality('lossless', 'musicfree')).toBe('super');
    expect(getPluginQuality('exhigh', 'musicfree')).toBe('high');
    expect(getPluginQuality('lossless', 'lxmusic')).toBe('flac');
    expect(getPluginQuality('exhigh', 'native')).toBe('exhigh');
  });

  it('MusicFree 音质阶梯从目标开始降级', () => {
    // 目标档优先，随后按剩余档位依次补齐
    expect(getMusicFreeQualityLadder('standard')).toEqual(['low', 'standard', 'high', 'super']);
    expect(getMusicFreeQualityLadder('lossless')).toEqual(['super', 'high', 'standard', 'low']);
  });

  it('从 URL 推断音频格式', () => {
    expect(inferPluginAudioFormat('https://a.com/x.flac?sign=1')).toBe('flac');
    expect(inferPluginAudioFormat('https://a.com/x', 999000)).toBe('flac');
    expect(inferPluginAudioFormat('https://a.com/x')).toBe('mp3');
  });

  it('qualityToBitrate 数值合理', () => {
    expect(qualityToBitrate('standard')).toBe(128000);
    expect(qualityToBitrate('unknown')).toBe(320000);
  });
});

describe('plugin source key helpers', () => {
  it('plugin key 读写对称', () => {
    const key = getMusicSourcePluginKey('abc123');
    expect(key).toBe('plugin:abc123');
    expect(isMusicSourcePluginKey(key)).toBe(true);
    expect(isMusicSourcePluginKey('gdmusic')).toBe(false);
    expect(getMusicSourcePluginId(key)).toBe('abc123');
    expect(getMusicSourcePluginId('gdmusic')).toBe('gdmusic');
  });
});

describe('hashMusicSource & sanitizeMusicSourcePlatform', () => {
  it('相同源码哈希稳定', () => {
    expect(hashMusicSource(NATIVE_SOURCE)).toBe(hashMusicSource(NATIVE_SOURCE));
    expect(hashMusicSource(NATIVE_SOURCE)).not.toBe(hashMusicSource(MUSICFREE_SOURCE));
  });

  it('平台名清洗非法字符', () => {
    expect(sanitizeMusicSourcePlatform('My Source!$', 'fallback')).toBe('My-Source');
    expect(sanitizeMusicSourcePlatform('///', 'fallback')).toBe('fallback');
  });
});
