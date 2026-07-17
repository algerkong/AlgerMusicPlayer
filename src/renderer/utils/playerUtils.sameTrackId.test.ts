import { describe, expect, it } from 'vitest';

import { sameTrackId, trackIdKey } from './playerUtils';

describe('trackIdKey', () => {
  it('stringifies ids and maps nullish to empty', () => {
    expect(trackIdKey(null)).toBe('');
    expect(trackIdKey(undefined)).toBe('');
    expect(trackIdKey(123)).toBe('123');
    expect(trackIdKey('abc')).toBe('abc');
  });
});

describe('sameTrackId', () => {
  it('matches number/string snowflake without Number()', () => {
    expect(sameTrackId(123, '123')).toBe(true);
    expect(sameTrackId('9999999999999999999', '9999999999999999999')).toBe(true);
    expect(sameTrackId(1, 2)).toBe(false);
  });

  it('rejects empty', () => {
    expect(sameTrackId('', '1')).toBe(false);
    expect(sameTrackId(null, '1')).toBe(false);
    expect(sameTrackId(1, null)).toBe(false);
  });

  it('matches bilibili composite ids by bvid+cid', () => {
    expect(sameTrackId('BVabc--1--cid9', 'BVabc--2--cid9')).toBe(true);
    expect(sameTrackId('BVabc--1--cid9', 'BVxyz--1--cid9')).toBe(false);
  });
});
