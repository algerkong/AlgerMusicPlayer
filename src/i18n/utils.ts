// 自动导入所有语言的所有翻译文件
const allLangModules = import.meta.glob('./lang/**/*.ts', { eager: true });

// 构建语言消息对象
export const buildLanguageMessages = () => {
  const messages: Record<string, Record<string, any>> = {};

  Object.entries(allLangModules).forEach(([path, module]) => {
    // 解析路径，例如 './lang/zh-CN/common.ts' -> { lang: 'zh-CN', module: 'common' }
    const match = path.match(/\.\/lang\/([^/]+)\/([^/]+)\.ts$/);
    if (match) {
      const [, langCode, moduleName] = match;

      // 跳过 index 文件
      if (moduleName !== 'index') {
        if (!messages[langCode]) {
          messages[langCode] = {};
        }
        messages[langCode][moduleName] = (module as any).default;
      }
    }
  });

  return messages;
};

// 获取所有支持的语言
export const getSupportedLanguages = (): string[] => {
  const messages = buildLanguageMessages();
  return Object.keys(messages);
};

export const isLanguageSupported = (lang: string): boolean => {
  return getSupportedLanguages().includes(lang);
};

import { LANGUAGE_DISPLAY_NAMES, LANGUAGE_PRIORITY } from './languages';

// 获取语言显示名称的映射
export const getLanguageDisplayNames = (): Record<string, string> => {
  return LANGUAGE_DISPLAY_NAMES;
};

// 生成语言选项数组，用于下拉选择等组件
export const getLanguageOptions = () => {
  const supportedLanguages = getSupportedLanguages();
  const displayNames = getLanguageDisplayNames();

  // 按优先级排序
  const sortedLanguages = supportedLanguages.sort((a, b) => {
    const priorityA = LANGUAGE_PRIORITY[a] || 999;
    const priorityB = LANGUAGE_PRIORITY[b] || 999;
    return priorityA - priorityB;
  });

  return sortedLanguages.map((lang) => ({
    label: displayNames[lang] || lang,
    value: lang
  }));
};
