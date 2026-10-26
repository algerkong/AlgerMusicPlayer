import { describe, expect, it } from 'vitest';

import {
  builtInMediaKeyBindings,
  defaultShortcuts,
  normalizeShortcutAccelerator,
  resolveBuiltInMediaKeyAccelerators,
  type ShortcutAction,
  type ShortcutConfig,
  type ShortcutsConfig
} from '../src/shared/shortcuts';

function withActionConfig(
  action: ShortcutAction,
  config: Partial<ShortcutConfig>
): ShortcutsConfig {
  const shortcuts: ShortcutsConfig = JSON.parse(JSON.stringify(defaultShortcuts));
  shortcuts[action] = { ...shortcuts[action], ...config };
  return shortcuts;
}

describe('builtInMediaKeyBindings', () => {
  it('覆盖播放/暂停、上一首、下一首三个多媒体键', () => {
    expect(builtInMediaKeyBindings).toEqual([
      { action: 'togglePlay', accelerator: 'MediaPlayPause' },
      { action: 'prevPlay', accelerator: 'MediaPreviousTrack' },
      { action: 'nextPlay', accelerator: 'MediaNextTrack' }
    ]);
  });
});

describe('resolveBuiltInMediaKeyAccelerators', () => {
  it('默认配置下返回全部多媒体键', () => {
    expect(resolveBuiltInMediaKeyAccelerators(defaultShortcuts)).toEqual([
      'MediaPlayPause',
      'MediaPreviousTrack',
      'MediaNextTrack'
    ]);
  });

  it('多媒体键被启用的全局快捷键占用时跳过该键', () => {
    const shortcuts = withActionConfig('togglePlay', {
      key: 'MediaPlayPause',
      enabled: true,
      scope: 'global'
    });

    const accelerators = resolveBuiltInMediaKeyAccelerators(shortcuts);
    expect(accelerators).not.toContain('MediaPlayPause');
    expect(accelerators).toContain('MediaPreviousTrack');
    expect(accelerators).toContain('MediaNextTrack');
  });

  it('多媒体键被应用内作用域快捷键占用时同样跳过，避免全局热键吞掉按键', () => {
    const shortcuts = withActionConfig('nextPlay', {
      key: 'MediaNextTrack',
      enabled: true,
      scope: 'app'
    });

    expect(resolveBuiltInMediaKeyAccelerators(shortcuts)).not.toContain('MediaNextTrack');
  });

  it('被禁用的用户快捷键不占用多媒体键', () => {
    const shortcuts = withActionConfig('togglePlay', {
      key: 'MediaPlayPause',
      enabled: false,
      scope: 'global'
    });

    expect(resolveBuiltInMediaKeyAccelerators(shortcuts)).toContain('MediaPlayPause');
  });

  it('别名键名归一化后同样命中占用判断', () => {
    expect(normalizeShortcutAccelerator('mediaplaypause')).toBe('MediaPlayPause');

    const shortcuts = withActionConfig('prevPlay', {
      key: 'mediaprevioustrack',
      enabled: true,
      scope: 'global'
    });

    expect(resolveBuiltInMediaKeyAccelerators(shortcuts)).not.toContain('MediaPreviousTrack');
  });
});
