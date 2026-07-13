import createDOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

function purify() {
  // 显式绑定 window，避免非浏览器/测试环境 sanitize 变成 no-op
  return createDOMPurify(window);
}

const SANITIZE_OPTIONS: Parameters<ReturnType<typeof createDOMPurify>['sanitize']>[1] = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'b',
    'i',
    'u',
    's',
    'del',
    'code',
    'pre',
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'a',
    'hr',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td'
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta'],
  FORBID_ATTR: ['style', 'src', 'srcset']
};

/** Markdown → 安全 HTML，禁止脚本、事件、style、iframe 等。 */
export function renderSafeMarkdown(source: string): string {
  if (!source) return '';

  let html: string;
  try {
    html = marked.parse(source) as string;
  } catch (error) {
    console.error('Markdown 解析失败:', error);
    return String(purify().sanitize(source, { ALLOWED_TAGS: [] }));
  }

  const cleaned = String(purify().sanitize(html, SANITIZE_OPTIONS));
  // 兜底：个别测试/DOM 环境下 DOMPurify 可能未剥事件/脚本
  if (/<script/i.test(cleaned) || /\son\w+=/i.test(cleaned)) {
    return cleaned
      .replace(/<script\b[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/<\/?(iframe|object|embed|form)\b[^>]*>/gi, '');
  }
  return cleaned;
}
