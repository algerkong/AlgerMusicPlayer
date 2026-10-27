/**
 * 音源注册表：一切音源（内置 + 插件）的唯一身份来源
 *
 * UI（音源勾选/管理/重解析弹窗）与解析器（resolver）都从这里取
 * provider 列表；音源顺序与启停只有一个模型 —— musicSourceOrder
 * （有序 key 数组）+ enabledMusicSources（启用集合），不再有
 * 策略 priority × 插件 order 的双层排序。
 */
import { computed } from 'vue';

import { useSettingsStore } from '@/store';
import type { MusicSourcePlugin } from '@/types/musicSourcePlugin';

import { getPluginSandboxRunner } from './PluginSandboxRunner';
import { builtinProviders } from './providers/builtin';
import type { MusicSourceProvider } from './types';

const PLUGIN_ICON_COLORS = ['#06b6d4', '#f59e0b', '#a855f7', '#10b981', '#ef4444', '#3b82f6'];
const PLUGIN_ICON_NAMES = [
  'ri-puzzle-2-fill',
  'ri-flashlight-fill',
  'ri-rocket-2-fill',
  'ri-star-fill',
  'ri-fire-fill',
  'ri-magic-fill'
];

/** 插件 → provider（解析统一走沙箱 Runner，方言差异已收敛在 worker） */
export const pluginToProvider = (plugin: MusicSourcePlugin, index = 0): MusicSourceProvider => ({
  key: `plugin:${plugin.id}`,
  name: plugin.name,
  kind: 'plugin',
  icon: PLUGIN_ICON_NAMES[index % PLUGIN_ICON_NAMES.length],
  color: PLUGIN_ICON_COLORS[index % PLUGIN_ICON_COLORS.length],
  builtin: false,
  available: plugin.enabled,
  configHint: plugin.enabled ? undefined : 'settings.playback.pluginSources.disabled',
  plugin,
  resolve: async (song, quality) => {
    if (!plugin.enabled) return null;
    const runner = await getPluginSandboxRunner(plugin);
    return runner.getMediaSource(song, quality);
  }
});

export const useMusicSourceRegistry = () => {
  const settingsStore = useSettingsStore();

  /** 全部 provider：内置 + 已安装插件（按插件 order） */
  const providers = computed<MusicSourceProvider[]>(() => {
    const plugins = ((settingsStore.setData.musicSourcePlugins || []) as MusicSourcePlugin[])
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((plugin, index) => pluginToProvider(plugin, index));
    return [...builtinProviders, ...plugins];
  });

  const findProvider = (key: string): MusicSourceProvider | undefined =>
    providers.value.find((provider) => provider.key === key);

  /**
   * 参与解析的 provider（按用户排序）。
   * @param sourceKeys 歌曲级覆盖（重解析弹窗/单歌音源配置）；缺省用全局启用集合。
   *   与 Flutter 的 resolveKeys 语义一致：失效键（已卸载/停用的插件）不进链。
   */
  const orderedProviders = (sourceKeys?: string[]): MusicSourceProvider[] => {
    const enabledKeys = sourceKeys ?? (settingsStore.setData.enabledMusicSources || []);
    const order: string[] = settingsStore.setData.musicSourceOrder || [];
    const orderIndex = new Map(order.map((key, index) => [key, index]));

    return providers.value
      .filter((provider) => enabledKeys.includes(provider.key))
      .filter((provider) => provider.available !== false)
      .sort((a, b) => {
        const ia = orderIndex.has(a.key) ? orderIndex.get(a.key)! : Number.MAX_SAFE_INTEGER;
        const ib = orderIndex.has(b.key) ? orderIndex.get(b.key)! : Number.MAX_SAFE_INTEGER;
        if (ia !== ib) return ia - ib;
        // 未入排序表的按默认序（注册表声明顺序）
        return providers.value.indexOf(a) - providers.value.indexOf(b);
      });
  };

  return { providers, orderedProviders, findProvider };
};
