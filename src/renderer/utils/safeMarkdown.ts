import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

/** Markdown → 安全 HTML，禁止脚本、事件、style、iframe 等。 */
export function renderSafeMarkdown(source: string): string {
  if (!source) return '';

  let html: string;
  try {
    html = marked.parse(source) as string;
  } catch (error) {
    console.error('Markdown 解析失败:', error);
    // 解析失败时按纯文本转义，避免把原始 HTML 直接塞进 v-html
    return DOMPurify.sanitize(source, { ALLOWED_TAGS: [] });
  }

  return DOMPurify.sanitize(html, {
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
    // 禁止 style / 事件；DOMPurify 默认会去掉 on*
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'style', 'link', 'meta'],
    FORBID_ATTR: ['style', 'src', 'srcset']
  });
}
