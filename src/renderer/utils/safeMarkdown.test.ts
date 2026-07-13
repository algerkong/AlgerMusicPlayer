import { describe, expect, it } from 'vitest';

import { renderSafeMarkdown } from './safeMarkdown';

describe('renderSafeMarkdown', () => {
  it('renders safe markdown', () => {
    const html = renderSafeMarkdown('**hi**\n\n- a');
    expect(html).toContain('<strong>hi</strong>');
    expect(html).toContain('<li>');
  });

  it('strips script and event handlers', () => {
    const html = renderSafeMarkdown('<img src=x onerror=alert(1)><script>evil()</script>');
    expect(html.toLowerCase()).not.toContain('onerror');
    expect(html.toLowerCase()).not.toContain('<script');
  });

  it('returns empty for empty input', () => {
    expect(renderSafeMarkdown('')).toBe('');
  });
});
