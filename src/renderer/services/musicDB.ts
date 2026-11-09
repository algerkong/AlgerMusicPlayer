import useIndexedDB from '@/hooks/IndexDBHook';

// 音乐缓存数据库单例。
// 原先定义在 MusicHook 中：模块顶层 await 与 api/music、musicSource/cache 等
// 模块对 MusicHook 的循环引用叠加后，打包产物的模块执行顺序无法保证
// MusicHook 先完成初始化，触发 "Cannot access 'musicDB' before initialization"
// 的 TDZ 崩溃导致整个渲染进程白屏。抽取为无循环依赖的叶子模块后，
// 顶层 await 只阻塞直接依赖本模块的代码，执行顺序恢复确定。
export const musicDB = await useIndexedDB(
  'musicDB',
  [
    { name: 'music', keyPath: 'id' },
    { name: 'music_lyric', keyPath: 'id' },
    { name: 'api_cache', keyPath: 'id' },
    { name: 'music_url_cache', keyPath: 'id' },
    { name: 'music_failed_cache', keyPath: 'id' }
  ],
  3
);
