/** 产品只保留深色主题 */
export type ThemeType = 'dark';

export const getSystemTheme = (): ThemeType => 'dark';

export const applyTheme = (_theme: ThemeType = 'dark') => {
  document.documentElement.classList.add('dark');
  document.documentElement.classList.remove('light');
  localStorage.setItem('theme', 'dark');
};

export const getCurrentTheme = (): ThemeType => 'dark';

/** 已无系统浅色跟随，保留空清理函数以免调用方炸 */
export const watchSystemTheme = (_callback: (theme: ThemeType) => void) => {
  return () => {};
};
