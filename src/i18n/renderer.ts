import type { I18nOptions } from 'vue-i18n';
import { createI18n } from 'vue-i18n';

import enUS from './lang/en-US';
import zhCN from './lang/zh-CN';

// 从配置中获取保存的语言设置
const savedLanguage =
  window?.electron?.ipcRenderer?.sendSync('get-store-value', 'set.language') || 'zh-CN';

const options = {
  legacy: false,
  locale: savedLanguage,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  },
  globalInjection: true,
  silentTranslationWarn: true,
  silentFallbackWarn: true
} as I18nOptions;

const i18n = createI18n(options);

export default i18n;
