/**
 * 音源注册表与迁移测试
 *
 * 覆盖重构后的两个核心决策：
 *  - orderedProviders：用户排序（musicSourceOrder）+ 歌曲级覆盖 + 失效键剔除
 *  - migrateLegacyMusicSources：LX 脚本入库、旧 key remap（全局/歌曲级）、排序初始化
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MusicSourcePlugin } from '../src/renderer/types/musicSourcePlugin';

// node 环境无 localStorage：migration 与测试要用，挂最小实现
const localStorageStub = (() => {
  let store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => (store = new Map()),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    }
  };
})();
(globalThis as any).localStorage = localStorageStub;

// —— 测试环境最小 stub ——————————————————————————————

const mockSetData: Record<string, any> = {};

vi.mock('@/hooks/MusicHook', () => ({
  musicDB: { saveData: vi.fn(), getData: vi.fn(), deleteData: vi.fn() }
}));

const settingsStoreMock = {
  setData: mockSetData,
  setSetData: (data: Record<string, any>) => Object.assign(mockSetData, data)
};

vi.mock('@/store', () => ({
  useSettingsStore: () => settingsStoreMock,
  usePlaylistStore: () => ({}),
  usePlayerStore: () => ({})
}));

// store/modules/settings 的真实模块也依赖 '@/store' barrel —— 直接拦截
vi.mock('@/store/modules/settings', () => ({
  useSettingsStore: () => settingsStoreMock
}));

vi.mock('@/services/musicSource/PluginSandboxRunner', () => ({
  getPluginSandboxRunner: vi.fn(),
  disposePluginSandbox: vi.fn()
}));

// 内置 provider 包装的旧 API 实现走真实网络模块（request.ts 依赖 window）——测试里桩掉
vi.mock('@/api/music', () => ({
  getMusicUrl: vi.fn(async () => ({ data: { data: [{ url: '' }] } }))
}));
vi.mock('@/api/gdmusic', () => ({
  parseFromGDMusic: vi.fn(async () => null)
}));
vi.mock('@/api/parseFromCustomApi', () => ({
  parseFromCustomApi: vi.fn(async () => null)
}));

import { migrateLegacyMusicSources } from '../src/renderer/services/musicSource/migration';
import { builtinProviders } from '../src/renderer/services/musicSource/providers/builtin';
import { useMusicSourceRegistry } from '../src/renderer/services/musicSource/registry';

const resetData = () => {
  for (const key of Object.keys(mockSetData)) delete mockSetData[key];
  mockSetData.musicSourcePlugins = [];
  mockSetData.enabledMusicSources = [];
  mockSetData.musicSourceOrder = [];
  mockSetData.lxMusicScripts = [];
  mockSetData.activeLxMusicApiId = null;
};

beforeEach(() => {
  setActivePinia(createPinia());
  resetData();
  localStorage.clear();
});

describe('registry: orderedProviders', () => {
  it('内置 provider 齐全且 key 稳定', () => {
    expect(builtinProviders.map((p) => p.key)).toEqual([
      'customApi',
      'netease',
      'gdmusic',
      'pyncmd'
    ]);
  });

  it('未配置排序时按注册表默认序，失效键不进链', () => {
    const { orderedProviders } = useMusicSourceRegistry();
    mockSetData.enabledMusicSources = ['gdmusic', 'pyncmd', 'not-exist-key'];

    const keys = orderedProviders().map((p) => p.key);
    // 'not-exist-key' 已卸载/不存在 → 剔除；其余按默认序（gdmusic 在 pyncmd 前）
    expect(keys).toEqual(['gdmusic', 'pyncmd']);
  });

  it('musicSourceOrder 决定尝试顺序', () => {
    const { orderedProviders } = useMusicSourceRegistry();
    mockSetData.enabledMusicSources = ['pyncmd', 'gdmusic', 'netease'];
    mockSetData.musicSourceOrder = ['netease', 'pyncmd', 'gdmusic'];

    expect(orderedProviders().map((p) => p.key)).toEqual(['netease', 'pyncmd', 'gdmusic']);
  });

  it('歌曲级覆盖优先于全局集合', () => {
    const { orderedProviders } = useMusicSourceRegistry();
    mockSetData.enabledMusicSources = ['netease', 'gdmusic'];
    mockSetData.musicSourceOrder = ['netease', 'gdmusic'];

    expect(orderedProviders(['gdmusic']).map((p) => p.key)).toEqual(['gdmusic']);
  });

  it('插件以 plugin:<id> 进入注册表且停用后被剔除', () => {
    mockSetData.musicSourcePlugins = [
      {
        id: 'abc',
        platform: 'demo',
        name: '演示插件',
        dialect: 'musicfree',
        source: '/* musicfree */',
        vars: [],
        userVars: {},
        enabled: false,
        order: 0,
        createdAt: 0,
        updatedAt: 0
      } as MusicSourcePlugin
    ];
    const { providers, orderedProviders } = useMusicSourceRegistry();
    expect(providers.value.map((p) => p.key)).toContain('plugin:abc');

    mockSetData.enabledMusicSources = ['netease', 'plugin:abc'];
    // available=false（停用）→ 剔除
    expect(orderedProviders().map((p) => p.key)).toEqual(['netease']);
  });
});

describe('migration: migrateLegacyMusicSources', () => {
  const lxScript = {
    id: 'lx_1',
    name: '测试洛雪源',
    script:
      '/*! @name 测试洛雪源 */\n;(function(){var lx = globalThis.lx; lx.on(lx.EVENT_NAMES.request, function(){}); lx.send(lx.EVENT_NAMES.inited, {sources:{}});})();',
    info: { version: '1.0' },
    createdAt: 1700000000000
  };

  it('LX 脚本入库 + 激活脚本启用 + 旧 key remap', async () => {
    const { hashMusicSource } = await import('../src/renderer/utils/musicSourcePlugin');
    mockSetData.lxMusicScripts = [lxScript];
    mockSetData.activeLxMusicApiId = 'lx_1';
    mockSetData.enabledMusicSources = ['lxMusic', 'custom', 'migu'];

    migrateLegacyMusicSources();

    const plugins = mockSetData.musicSourcePlugins as MusicSourcePlugin[];
    expect(plugins).toHaveLength(1);
    expect(plugins[0].dialect).toBe('lxmusic');
    expect(plugins[0].enabled).toBe(true);
    expect(plugins[0].id).toBe(hashMusicSource(lxScript.script));

    // 旧 key remap：lxMusic → plugin:<id>；custom → customApi；migu 原样
    expect(mockSetData.enabledMusicSources).toEqual([
      `plugin:${hashMusicSource(lxScript.script)}`,
      'customApi',
      'migu'
    ]);

    // 排序已初始化（含 customApi/netease 在前）
    expect(mockSetData.musicSourceOrder[0]).toBe('customApi');
    expect(mockSetData.musicSourceOrder[1]).toBe('netease');
    // 幂等标记
    expect(mockSetData.musicSourceUnifiedMigrated).toBe(true);
  });

  it('非激活的 LX 脚本入库但停用', () => {
    mockSetData.lxMusicScripts = [lxScript];
    mockSetData.activeLxMusicApiId = null;

    migrateLegacyMusicSources();
    expect((mockSetData.musicSourcePlugins as MusicSourcePlugin[])[0].enabled).toBe(false);
  });

  it('歌曲级配置里的旧 key 同步 remap', async () => {
    const { hashMusicSource } = await import('../src/renderer/utils/musicSourcePlugin');
    mockSetData.lxMusicScripts = [lxScript];
    mockSetData.activeLxMusicApiId = 'lx_1';
    localStorage.setItem('song_source_123', JSON.stringify(['lxMusic', 'migu']));
    localStorage.setItem('song_source_type_123', 'manual');

    migrateLegacyMusicSources();

    const remapped = JSON.parse(localStorage.getItem('song_source_123')!);
    expect(remapped).toEqual([`plugin:${hashMusicSource(lxScript.script)}`, 'migu']);
    expect(localStorage.getItem('song_source_type_123')).toBe('manual');
  });

  it('幂等：已迁移过直接跳过', () => {
    mockSetData.musicSourceUnifiedMigrated = true;
    mockSetData.lxMusicScripts = [lxScript];

    expect(migrateLegacyMusicSources()).toBe(false);
    expect(mockSetData.musicSourcePlugins).toEqual([]);
  });
});
