export type ThemeType = 'dark' | 'light';

// 应用主题
export const applyTheme = (theme: ThemeType) => {
  // 使用 Tailwind 的暗色主题类
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // 保存主题到本地存储
  localStorage.setItem('theme', theme);
};

// 获取当前主题
export const getCurrentTheme = (): ThemeType => {
  return (localStorage.getItem('theme') as ThemeType) || 'light';
};
