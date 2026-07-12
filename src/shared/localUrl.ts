// local:// 协议 URL 拼接工具
// 主进程与渲染进程共用，确保所有本地文件 URL 走同一套编码策略，
// 否则音频/封面/缓存/下载在 edge-case 上行为分裂。

/**
 * 把绝对文件路径转成 local:// 协议 URL。
 *
 * 编码顺序：
 * 1. \\ -> /（Windows 路径规范化）
 * 2. 按路径段 encodeURIComponent，再用 / 拼回去
 *
 * 不直接对整条路径 encodeURIComponent：它会把 / 编码成 %2F，注册为 standard 的
 * local:// 协议在 Chromium 解析含 %2F 的 path 时存在边界差异。
 * 按路径段编码可以保留目录分隔符，同时正确处理空格、中文、#、?、% 等特殊字符。
 *
 * 必须编码而不是裸拼：Image loader（含 crossOrigin='Anonymous' 时）对未编码空格
 * 比 audio.src 严格——封面常落到 "Application Support" 这类含空格目录会加载失败。
 *
 * 主进程 fileManager 用 decodeURIComponent 还原；它是 encodeURIComponent 的逆，
 * 能解码本函数产生的全部 %XX。
 */
export function filePathToLocalUrl(absPath: string): string {
  const normalized = absPath.replace(/\\/g, '/');
  const encoded = normalized.split('/').map(encodeURIComponent).join('/');
  return `local:///${encoded}`;
}
