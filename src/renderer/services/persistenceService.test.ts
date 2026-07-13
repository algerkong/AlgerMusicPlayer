import { beforeEach, describe, expect, it } from 'vitest';

import {
  persistenceService,
  type PersistSchema,
  playProgressSchema,
  volumeSchema
} from './persistenceService';

describe('persistenceService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and loads versioned envelope', () => {
    persistenceService.save(volumeSchema, 0.42);
    expect(persistenceService.load(volumeSchema)).toBe(0.42);
    const raw = localStorage.getItem('volume');
    expect(raw).toContain('"v":1');
  });

  it('migrates legacy bare playProgress JSON', () => {
    localStorage.setItem('playProgress', JSON.stringify({ songId: 9, progress: 12.5 }));
    const data = persistenceService.load(playProgressSchema);
    expect(data).toEqual({ songId: 9, progress: 12.5 });
  });

  it('runs multi-step migrations', () => {
    const schema: PersistSchema<{ n: number }> = {
      owner: 'misc',
      key: 'mig-test',
      version: 2,
      defaultValue: { n: 0 },
      migrations: {
        0: (d) => ({ n: Number((d as any)?.n || 0) + 1 }),
        1: (d) => ({ n: Number((d as any)?.n || 0) + 10 })
      }
    };
    localStorage.setItem('mig-test', JSON.stringify({ n: 1 }));
    expect(persistenceService.load(schema)).toEqual({ n: 12 });
  });
});
