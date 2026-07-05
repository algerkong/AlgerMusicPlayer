// 最小 Service Worker：仅满足 PWA 可安装性要求（需存在 fetch 处理器）。
// 不做任何缓存拦截，所有请求保持浏览器默认网络行为。
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // 特意留空：不拦截，默认走网络
});
