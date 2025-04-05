/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  /** 快捷键字符串 */
  key: string;
  /** 是否启用 */
  enabled: boolean;
  /** 作用范围: global(全局) 或 app(仅应用内) */
  scope: 'global' | 'app';
}

/**
 * 快捷键配置集合
 */
export interface ShortcutsConfig {
  [key: string]: ShortcutConfig;
}
