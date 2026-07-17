/**
 * 稳定领域模型：曲目元数据与播放运行态分离。
 * 音源 DTO 只在 adapter 层转成 Track；URL/loading/歌词/颜色等不得写回 Track。
 */

export interface ArtistRef {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface AlbumRef {
  id?: string;
  name: string;
  coverUrl?: string;
}

export interface TrackPreview {
  startMs: number;
  durationMs: number;
  vid?: string;
}

export interface TrackDigital {
  paymentItemId?: string;
  amount?: number;
  paymentItemType?: number;
  onlineDate?: number;
}

/** 曲目元数据（可持久化的「是什么歌」） */
export interface Track {
  platform: string;
  id: string;
  title: string;
  artists: ArtistRef[];
  album?: AlbumRef;
  coverUrl?: string;
  durationMs?: number;
  isVip?: boolean;
  isOriginal?: boolean;
  isLimitedFree?: boolean;
  limitedFreeExpireAt?: number;
  hasPreview?: boolean;
  preview?: TrackPreview;
  isDigital?: boolean;
  digital?: TrackDigital;
  genreTags?: string[];
  lyricists?: string[];
  composers?: string[];
  /** 收藏/喜欢数（feed stats） */
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
}

/** 当前播放源（可过期，不写回 Track） */
export interface PlaybackSource {
  url?: string;
  isPreviewStream?: boolean;
  previewStartMs?: number;
  previewDurationMs?: number;
  expiresAt?: number;
  createdAt?: number;
}

/** 播放器运行态（仅会话内；勿写回 Track） */
export interface PlaybackRuntime {
  source?: PlaybackSource;
  playLoading?: boolean;
  isFirstPlay?: boolean;
  /** 歌词等大字段只在运行时持有 */
  lyric?: unknown;
  backgroundColor?: string;
  primaryColor?: string;
  /** 加密前缀秒播 / 完整文件接上 */
  isPartialStream?: boolean;
  pendingFullUrl?: string;
  availableQualities?: string[];
  streamQuality?: string;
  streamBitrate?: number;
  preferredQuality?: string;
  forceQualityResolve?: boolean;
}

/** 列表/播放器组合视图：Track + 可选运行态 */
export interface PlayableTrack {
  track: Track;
  runtime?: PlaybackRuntime;
}
