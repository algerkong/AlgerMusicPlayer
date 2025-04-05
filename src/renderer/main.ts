import './index.css';
import 'animate.css';
import 'remixicon/fonts/remixicon.css';

import { createApp } from 'vue';

import i18n from '@/../i18n/renderer';
import router from '@/router';
import pinia from '@/store';

import App from './App.vue';
import directives from './directive';
import { initAppShortcuts } from './utils/appShortcuts';

const app = createApp(App);

Object.keys(directives).forEach((key: string) => {
  app.directive(key, directives[key as keyof typeof directives]);
});

app.use(pinia);
app.use(router);
app.use(i18n);
app.mount('#app');

// 初始化应用内快捷键
initAppShortcuts();
