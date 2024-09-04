import 'vfonts/Lato.css';
import 'vfonts/FiraCode.css';
// tailwind css
import './index.css';
import 'remixicon/fonts/remixicon.css';

import { createApp } from 'vue';

import router from '@/router';
import store from '@/store';

import App from './App.vue';
import directives from './directive';

const app = createApp(App);

Object.keys(directives).forEach((key: string) => {
  app.directive(key, directives[key]);
});
app.use(router);
app.use(store);
app.mount('#app');
