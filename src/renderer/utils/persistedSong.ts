// 持久化歌曲对象的精简工具
// 三处 store 共用：playlist、playerCore、playHistory
//
// 为什么需要：localStorage 仅 5MB 配额。SongResult 直接持久化时，picUrl 可能是
// 几百 KB 的 base64 Data URL（旧版本本地音乐扫描会注入），lyric/song/expiredAt 等
// 字段也是只在运行时有意义的派生数据。一旦撑爆配额，整个 store 写入失败 → 历史记录、
// 当前播放、播放列表全部丢失。
//
// 现在源头（src/main/modules/localMusicScanner.ts + filePathToLocalUrl）已经把
// 本地音乐封面落盘，picUrl 是 local:// 短引用；这个工具兜底两件事：
//   1. 老用户从 base64 版本升级上来时，剥离已写入 localStorage 的脏数据
//   2. 远程音乐的 lyric/expiredAt 等大字段从持久化路径切走（重启后 API 重拉即可）
//
// 仅 local:// 的 playMusicUrl 会保留——本地音乐 URL 永不过期，恢复后免重新解析。
// 其他 URL（云端、缓存代理）会过期，丢掉让恢复时重新拉。

import type { Artist, SongResult } from '@/types/music';
import type { DjProgram } from '@/types/podcast';

/**
 * 播客 program 持久化保留的最小字段集合
 *
 * SongResult.program 在运行时是 any（来源接口透传），实际形态对齐 DjProgram。
 * 这里只保留 addPodcast/podcast 列表 UI 真正消费的字段，避免接口塞进来的冗余
 * 字段（评论列表、推荐位等）跟着持久化。仍要剥 coverUrl 的 base64 兜底。
 */
export type MinifiedDjProgram = Pick<
  DjProgram,
  | 'id'
  | 'name'
  | 'mainSong'
  | 'radio'
  | 'coverUrl'
  | 'description'
  | 'createTime'
  | 'listenerCount'
  | 'commentCount'
  | 'liked'
  | 'likedCount'
>;

/**
 * 持久化保留的最小字段集合
 *
 * ar/al 类型用 SongResult['ar' | 'al'] 而非自定义 Pick：
 * Artist/Album 类型有几十个必填子字段，自定义 Pick 后无法回填成 Artist[]/Album,
 * 调用 setPlay/SongItem 等期望 SongResult 的接口会全部报错。这里用类型断言把
 * "只填了 id/name/picUrl 的对象"伪装成 Artist/Album——运行时下游用 optional chain
 * 访问，缺字段不会炸；类型层省下一大批 cast。
 *
 * isPodcast/program 必须保留：playbackController.playTrack 用 music.isPodcast
 * 决定写普通歌历史还是播客历史；缺失会让重启恢复后的播客被误记进 musicHistory。
 */
export type MinifiedSong = {
  id: SongResult['id'];
  name: SongResult['name'];
  picUrl: SongResult['picUrl'];
  ar: SongResult['ar'];
  // SongResult.al 是非 optional，但 minifySong 在 s.al 缺失时返回 undefined。
  // 用 NonNullable + ? 显式表达「可选且缺失即不存在」，下游 optional chain 访问更安全
  al?: NonNullable<SongResult['al']>;
  source?: SongResult['source'];
  dt?: SongResult['dt'];
  playMusicUrl?: SongResult['playMusicUrl'];
  isPodcast?: SongResult['isPodcast'];
  program?: MinifiedDjProgram;
};

/** 历史记录条目：精简歌曲 + 计数/时间戳 */
export type MusicHistoryItem = MinifiedSong & {
  count: number;
  lastPlayTime?: number;
};

/**
 * 剥离 base64 Data URL，其余 URL 原样返回
 * 旧版本注入的 data: 协议封面 → 空串（SongItem v-if 跳过渲染，展示默认封面）
 */
const stripDataUrl = (url: string | undefined): string =>
  !url || url.startsWith('data:') ? '' : url;

/**
 * 把 SongResult 精简到仅持久化必要字段
 * - 剥离 base64 picUrl
 * - 仅保留 local:// 协议的 playMusicUrl（本地音乐 URL 永不过期）
 * - 不持久化 lyric/song/backgroundColor/primaryColor/expiredAt/createdAt 等派生数据
 *
 * JSON.stringify 自动丢 undefined，不需要条件 spread
 */
export const minifySong = (s: SongResult): MinifiedSong => {
  // 兼容老数据：早期 SongResult 可能只填了 artists 没填 ar（接口字段历史回退路径），
  // 取一次合并后再精简，避免 minify 后丢失歌手名导致 heatmap/SongItem 显示 'Unknown Artist'
  // 用 length 守卫而不是 ??：?? 只在 null/undefined 回退，ar:[] 是 truthy 会原样保留空数组,
  // 旧数据里同时存在 ar:[] 和 artists:[填值] 时会丢歌手名
  const artistList = s.ar?.length ? s.ar : s.artists;
  // program 透传可能塞接口冗余字段（评论列表、推荐位等），这里挑明保留 DjProgram 已知字段
  // id 守卫：缺 id 视作无效 program，避免序列化出空壳
  const minifyProgram = (p: any): MinifiedDjProgram | undefined => {
    if (!p?.id) return undefined;
    return {
      id: p.id,
      name: p.name,
      mainSong: p.mainSong,
      radio: p.radio,
      coverUrl: stripDataUrl(p.coverUrl),
      description: p.description,
      createTime: p.createTime,
      listenerCount: p.listenerCount,
      commentCount: p.commentCount,
      liked: p.liked,
      likedCount: p.likedCount
    };
  };
  return {
    id: s.id,
    name: s.name,
    picUrl: stripDataUrl(s.picUrl),
    // 类型断言：只回填 id/name 的 Artist 不满足全字段约束，但下游消费 ar 全是 optional chain
    ar: (artistList?.map((a) => ({ id: a.id, name: a.name })) ?? []) as Artist[],
    // 类型断言同 ar：Album 类型有几十个必填字段，这里只回填三个；下游用 optional chain 访问安全
    // id 守卫：truthy 但字段全空的对象（如 `{}`）会被过滤为 undefined，避免序列化出
    // `{name: undefined, picUrl: ''}` 这种无意义残骸（id undefined 被 JSON 丢弃，反而留下空串占位）
    al: (s.al?.id
      ? {
          id: s.al.id,
          name: s.al.name,
          picUrl: stripDataUrl(s.al.picUrl)
        }
      : undefined) as MinifiedSong['al'],
    source: s.source,
    dt: s.dt,
    playMusicUrl: s.playMusicUrl?.startsWith('local://') ? s.playMusicUrl : undefined,
    // 必须保留 isPodcast/program：playbackController.playTrack 用 music.isPodcast 决定写
    // 普通歌历史还是播客历史；缺失会让重启恢复后的播客被误记进 musicHistory
    isPodcast: s.isPodcast,
    program: minifyProgram(s.program)
  };
};

export const minifySongList = (list: SongResult[] | undefined): MinifiedSong[] =>
  list?.map(minifySong) ?? [];

/** 历史记录条目精简：在 minifySong 基础上附带 count/lastPlayTime */
export const minifyHistoryEntry = (
  s: SongResult & { count?: number; lastPlayTime?: number }
): MusicHistoryItem => ({
  ...minifySong(s),
  // 能进历史 = 至少播过一次，缺省给 1 而非 0；history 列表直接 {{ count }} 显示，0 会渲染成「0 次播放」
  count: s.count ?? 1,
  lastPlayTime: s.lastPlayTime
});

export const minifyHistoryList = (
  list: (SongResult & { count?: number; lastPlayTime?: number })[] | undefined
): MusicHistoryItem[] => list?.map(minifyHistoryEntry) ?? [];

/**
 * 通用防御层：剥离任意对象上常见图片字段中的 base64 Data URL
 *
 * 给 podcast/playlist/album/podcastRadio 等历史记录做兜底：
 * 即使源头注入了 base64 封面（可能来自爬虫、第三方接口、旧版本数据），
 * 持久化时也会被洗成空串，避免单张几百 KB 的 Data URL 撑爆 5MB 配额。
 *
 * 覆盖三个常见字段名：picUrl（专辑/电台/单曲）、coverImgUrl（歌单）、coverUrl（电台节目）。
 * 用 readonly tuple 而不是字符串数组：让 TS 把 key 推断成字面量类型集合，未来加字段需显式扩展。
 *
 * 已知盲区：仅扫顶层字段，嵌套结构（DjProgram.radio.picUrl、Playlist.creator.avatarUrl 等）
 * 不在覆盖范围内。当前线上数据未观察到嵌套字段被注入 base64，所以暂不递归——避免无脑深度
 * 遍历影响每次序列化的开销。后续如果发现新的嵌套注入路径，再针对该字段做点对点处理
 * （参考 minifySong 对 al.picUrl 的专门洗法），不要把 stripBase64Covers 改成递归。
 */
const PIC_KEYS = ['picUrl', 'coverImgUrl', 'coverUrl'] as const;

export const stripBase64Covers = <T extends Record<string, any>>(item: T): T => {
  // 浅拷贝 + 仅扫顶层：嵌套字段是已知盲区（见上方 jsdoc）
  // minifySong 已专门处理嵌套 al.picUrl，此处不重复
  const result: Record<string, any> = { ...item };
  for (const key of PIC_KEYS) {
    const value = result[key];
    if (typeof value === 'string' && value.startsWith('data:')) {
      result[key] = '';
    }
  }
  return result as T;
};

export const stripBase64CoversList = <T extends Record<string, any>>(list: T[] | undefined): T[] =>
  list?.map(stripBase64Covers) ?? [];
