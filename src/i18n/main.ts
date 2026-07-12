import { DEFAULT_LANGUAGE } from './languages';
import { buildLanguageMessages } from './utils';

// 使用工具函数构建语言消息对象
const messages = buildLanguageMessages();

type Language = keyof typeof messages;

// 为主进程提供一个简单的 i18n 实现
const mainI18n = {
  global: {
    currentLocale: DEFAULT_LANGUAGE as Language,
    get locale() {
      return this.currentLocale;
    },
    set locale(value: Language) {
      this.currentLocale = value;
    },
    t(key: string) {
      const keys = key.split('.');
      // 未知/非法 locale 时回退默认语言，避免 messages[locale] 为 undefined 导致崩溃
      let current: any = messages[this.currentLocale] ?? messages[DEFAULT_LANGUAGE as Language];
      if (current == null) {
        return key;
      }
      for (const k of keys) {
        if (current == null || current[k] === undefined) {
          // 如果找不到翻译，返回键名
          return key;
        }
        current = current[k];
      }
      return current;
    },
    messages
  }
};

export type { Language };
export default mainI18n;
