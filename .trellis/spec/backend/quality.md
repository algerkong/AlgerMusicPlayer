# Code Quality & Import Guidelines

> Import path rules and code quality standards.

---

## Import Path Rules

### Import Path by Process

Different processes use different import path styles:

| Process                                | Path Style      | Example                      |
| -------------------------------------- | --------------- | ---------------------------- |
| **Main process** (`src/main/`)         | Relative paths  | `../../../shared/types/user` |
| **Renderer process** (`src/renderer/`) | `@shared` alias | `@shared/types/user`         |
| **Shared** (`src/shared/`)             | Relative paths  | `./common`                   |

### Main Process: Use Relative Paths

Files in `src/main/` **MUST** use relative paths for imports from `src/shared/`:

```typescript
// CORRECT - src/main/services/project/types.ts
import { createOutputSchema } from '../../../shared/types/common';

// WRONG - ESLint will fail
import { createOutputSchema } from '@shared/types/common';
```

**Why?** The `@shared` alias is only configured for the Vite-bundled renderer process, not for the main process which runs directly in Node.js.

### Renderer Process: Use @shared Alias

Files in `src/renderer/` should use the `@shared` alias:

```typescript
// CORRECT - src/renderer/src/hooks/useProject.ts
import { projectSchema, Project } from '@shared/types/project';

// Works but not recommended
import { projectSchema } from '../../../../shared/types/project';
```

---

## Vite Path Alias Configuration

### The Problem

Electron projects have **three separate Vite configs**:

- `vite.main.config.ts` - Main process
- `vite.preload.config.ts` - Preload scripts
- `vite.renderer.config.ts` - Renderer process

**Critical**: Vite does NOT automatically read `tsconfig.json` paths. Each config needs explicit `resolve.alias`.

### Common Error

```
[vite]: Rollup failed to resolve import "@shared/types/user" from "src/main/services/xxx.ts"
```

### Solution

Add path aliases to **all three** Vite config files:

```typescript
// vite.main.config.ts (and vite.preload.config.ts)
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared')
    }
  }
  // ... other config
});
```

### Best Practice: Shared Alias Config

Create a shared alias configuration:

```typescript
// vite.shared.ts
import path from 'node:path';

export const sharedAlias = {
  '@shared': path.resolve(__dirname, './src/shared')
};

// vite.main.config.ts
import { sharedAlias } from './vite.shared';

export default defineConfig({
  resolve: {
    alias: sharedAlias
  }
});
```

### Alternative: vite-tsconfig-paths Plugin

```bash
npm install -D vite-tsconfig-paths
```

```typescript
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()]
});
```

### Key Insight

- **TypeScript paths** (`tsconfig.json`) only affect type checking
- **Vite aliases** (`resolve.alias`) affect actual module resolution at build time
- Both must be kept in sync

---

## Quality Guidelines

### Before Every Commit

- [ ] `npm run lint` - 0 errors
- [ ] `npm run typecheck` (or `tsc --noEmit`) - No type errors
- [ ] Database schema changes have migrations

### Forbidden Patterns

| Pattern                        | Reason                | Alternative                   |
| ------------------------------ | --------------------- | ----------------------------- |
| `!` (non-null assertion)       | Type unsafe           | Use null checks               |
| `console.log`                  | Not structured        | Use `electron-log`            |
| `await` in loops               | N+1 queries           | Use `inArray` or relations    |
| Direct `db` access in renderer | Security              | Use IPC handlers              |
| `let` for non-reassigned       | ESLint `prefer-const` | Use `const`                   |
| `any` type                     | Type unsafe           | Use proper types or `unknown` |

### Drizzle-Specific Rules

- [ ] Use `.get()` for single result, `.all()` for multiple
- [ ] Define relations in schema for related queries
- [ ] Use transactions for multiple write operations
- [ ] Always use `$defaultFn` for auto-generated values

---

## Testing Guidelines

### Test Coverage Requirements

| Layer        | Target Coverage | Description                    |
| ------------ | --------------- | ------------------------------ |
| Procedures   | > 80%           | CRUD operations                |
| Lib/Helpers  | > 80%           | Pure utility functions         |
| IPC Handlers | > 60%           | Thin wrappers (lower priority) |
| Shared Types | N/A             | Type definitions only          |

### Test Structure

```
tests/
├── setup/
│   ├── global-setup.ts        # Test database initialization
│   └── test-helpers.ts        # Test utilities
├── factories/                 # Test data factories
│   ├── index.ts               # Barrel export + resetAllCounters()
│   └── project.factory.ts
├── unit/                      # Mock-based unit tests
│   └── services/{module}/
│       ├── lib/*.test.ts
│       └── procedures/*.test.ts
└── integration/               # Real database tests
    └── database/*.test.ts
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/services/project/procedures/create.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Test File Template

```typescript
/**
 * [ProcedureName] Procedure Unit Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Define mocks using vi.hoisted() (MUST be before vi.mock)
const { mockGet, mockSelect } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({ where: vi.fn(() => ({ get: mockGet })) }))
  }));
  return { mockGet, mockSelect };
});

// 2. Set up module mocks
vi.mock('@main/db/client', () => ({
  db: { select: mockSelect }
}));

// 3. Import the module under test AFTER mocks
import { getProject } from '@main/services/project/procedures/get';

describe('getProject Procedure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue({ id: '123', name: 'Test' });
  });

  describe('Input Validation', () => {
    it('should reject missing id', () => {
      const result = getProject({ id: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('Normal Operations', () => {
    it('should return project when found', () => {
      const result = getProject({ id: '123' });
      expect(result.success).toBe(true);
      expect(result.project.name).toBe('Test');
    });
  });
});
```

### Test Scenario Categories

Each procedure test should cover:

| Category            | What to Test            | Example                        |
| ------------------- | ----------------------- | ------------------------------ |
| Input Validation    | Required fields, format | Missing id, invalid status     |
| Normal Operations   | Happy path              | Create with valid input        |
| Error Handling      | Exceptions, not found   | Database error, entity missing |
| Boundary Conditions | Edge cases              | Empty string, max length       |

---

## Summary

| Rule                         | Reason              |
| ---------------------------- | ------------------- |
| Main process: relative paths | No alias resolution |
| Renderer: `@shared` alias    | Cleaner imports     |
| Sync Vite + TypeScript paths | Both needed         |
| No `!` assertions            | Type safety         |
| Use structured logging       | Searchable logs     |
| Test with mocks              | Fast, isolated      |
| 80% coverage for procedures  | Quality assurance   |
