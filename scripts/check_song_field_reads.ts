/**
 * P0 门禁：禁止在业务代码中直接读 SongResult 镜像字段 ar / dt。
 * 读艺人/时长请用 songFields 或 toPlayableView。
 *
 * 允许白名单：bridge、songFields、类型、测试、持久化 minify（仍落盘 ar/dt）。
 *
 * Usage: bun scripts/check_song_field_reads.ts
 * Exit 1 if new violations outside allowlist.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(import.meta.dir, '..');
const SRC = join(ROOT, 'src');

/** 相对 src/ 的路径前缀或文件；命中则跳过 */
const ALLOW_PREFIXES = [
  'shared/domain/songFields.ts',
  'renderer/utils/songFields.ts',
  'renderer/utils/trackBridge.ts',
  'renderer/utils/playableView.ts',
  'renderer/utils/persistedSong.ts',
  'renderer/types/music.ts',
  // 测试
  'renderer/utils/songFields.test.ts',
  'renderer/utils/trackBridge.test.ts',
  'renderer/utils/playableView.test.ts',
  'shared/domain/songFields.test.ts'
];

/**
 * 仍待迁移（P2+ 逐步清零）；只允许这里存量，勿再扩大。
 * main 进程下载任务 DTO 仍带 ar 字段名（非 SongResult 镜像读路径可后续再收）。
 */
const LEGACY_ALLOW = new Set(['main/modules/downloadManager.ts']);

// 读镜像字段：.ar / ['ar'] / .dt（属性）
// 避免匹配 start / artist 等：要求属性边界
const PATTERNS: { name: string; re: RegExp }[] = [
  {
    name: 'read .ar',
    re: /(?:^|[^.\w])(?:song|item|music|track|info|s|n|cur|base|extra|playMusic)\.ar\b/
  },
  { name: 'read ?.ar', re: /\?\.ar\b/ },
  { name: 'read .dt', re: /(?:^|[^.\w])(?:song|item|music|track|info|s|n|cur|playMusic)\.dt\b/ },
  { name: 'read ?.dt', re: /\?\.dt\b/ }
];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.') || name === 'out' || name === 'dist')
      continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|vue|tsx)$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

function isAllowed(rel: string): boolean {
  if (ALLOW_PREFIXES.some((a) => rel === a || rel.startsWith(a.replace(/\.ts$/, '')))) {
    if (ALLOW_PREFIXES.includes(rel)) return true;
  }
  for (const a of ALLOW_PREFIXES) {
    if (rel === a) return true;
  }
  if (rel.endsWith('.test.ts') || rel.endsWith('.spec.ts')) return true;
  if (LEGACY_ALLOW.has(rel)) return true;
  return false;
}

const files = walk(SRC);
const violations: { file: string; line: number; text: string; rule: string }[] = [];

for (const file of files) {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  if (isAllowed(rel)) continue;
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    // 跳过纯注释
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
    for (const { name, re } of PATTERNS) {
      if (re.test(line)) {
        violations.push({ file: rel, line: i + 1, text: trimmed.slice(0, 120), rule: name });
      }
    }
  });
}

if (violations.length) {
  console.error(
    `[check_song_field_reads] ${violations.length} violation(s) — use songFields / toPlayableView:\n`
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} [${v.rule}] ${v.text}`);
  }
  console.error(
    '\nAllow only via LEGACY_ALLOW (shrink over time) or songFields/trackBridge/playableView.'
  );
  process.exit(1);
}

console.log('[check_song_field_reads] ok (no bare ar/dt reads outside allowlist)');
