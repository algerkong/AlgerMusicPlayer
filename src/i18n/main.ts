import type { I18nOptions } from 'vue-i18n';
import { createI18n } from 'vue-i18n';

import { getStore } from '../main/modules/config';
import enUS from './lang/en-US';
import zhCN from './lang/zh-CN';

// 从配置中获取保存的语言设置
const store = getStore();
const savedLanguage = (store?.get('set.language') as string) || 'zh-CN';

const options = {
  legacy: false,
  locale: savedLanguage,
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  },
  silentTranslationWarn: true,
  silentFallbackWarn: true
} as I18nOptions;

const i18n = createI18n(options);

export const $t: typeof i18n.global.t = i18n.global.t;

export default i18n;
