# API Module Organization

> Domain-driven API module layout using TypeScript + Zod for strict type safety.

---

## Core Principles

1. **Domain-driven structure** - Each business domain gets its own folder
2. **Type safety first** - Zod schemas for every input/output
3. **Single source of truth** - Types defined once in `types.ts`
4. **Code reuse** - Shared logic extracted to `lib/`
5. **Clear separation** - One file per procedure
6. **Thin IPC handlers** - Wrappers calling procedures

---

## Module Structure

```
src/main/services/{domain}/
├── types.ts              # Zod schemas + TypeScript types (REQUIRED)
├── procedures/           # Endpoint handlers (REQUIRED)
│   ├── create.ts         # Create operation
│   ├── list.ts           # List with filters
│   ├── get.ts            # Get by ID
│   ├── update.ts         # Update operation
│   └── delete.ts         # Delete operation
└── lib/                  # Shared business logic (OPTIONAL)
    ├── helpers.ts        # General helpers
    └── cache.ts          # Caching operations
```

---

## File Responsibilities

### types.ts - Schema & Type Definitions

**Purpose**: Define every Zod schema and TypeScript type for the module.

```typescript
// src/main/services/project/types.ts
import { z } from 'zod';

// ============= Base Schemas =============

export const projectStatusSchema = z.enum(['active', 'archived', 'draft']);

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: projectStatusSchema,
  // Use z.number() for API responses (Unix milliseconds)
  // See shared/timestamp.md for full timestamp specification
  createdAt: z.number(),
  updatedAt: z.number()
});

// ============= Input Schemas =============

export const createProjectInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().optional()
});

export const listProjectsInputSchema = z.object({
  status: projectStatusSchema.optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional()
});

// ============= Output Schemas =============

export const createProjectOutputSchema = z.object({
  success: z.boolean(),
  project: projectSchema.optional(),
  error: z.string().optional()
});

// ============= Type Exports =============

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type CreateProjectOutput = z.infer<typeof createProjectOutputSchema>;
```

---

### procedures/ - Endpoint Handlers

**Purpose**: Implement endpoint logic per file with validated inputs.

```typescript
// src/main/services/project/procedures/create.ts
import { db } from '../../../db/client';
import { project } from '../../../db/schema';
import { logger as baseLogger } from '../../logger';
import { createProjectInputSchema } from '../types';
import type { CreateProjectInput, CreateProjectOutput } from '../types';

const logger = baseLogger.scope('project:create');

export function createProject(input: CreateProjectInput): CreateProjectOutput {
  try {
    // 1. Validate input
    const parseResult = createProjectInputSchema.safeParse(input);
    if (!parseResult.success) {
      return { success: false, error: parseResult.error.issues[0].message };
    }

    const { name, description } = parseResult.data;
    const projectId = crypto.randomUUID();

    // 2. Insert into database
    const [newProject] = db
      .insert(project)
      .values({
        id: projectId,
        name,
        description: description ?? null,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()
      .all();

    logger.info('Project created', { projectId });
    // Convert Date to Unix milliseconds for API response
    // See shared/timestamp.md for timestamp specification
    return {
      success: true,
      project: {
        ...newProject,
        createdAt: newProject.createdAt.getTime(),
        updatedAt: newProject.updatedAt.getTime()
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Create project failed', { error: message });
    return { success: false, error: 'Failed to create project' };
  }
}
```

---

### lib/ - Shared Business Logic

**Purpose**: Host reusable logic used by multiple procedures.

```typescript
// src/main/services/project/lib/helpers.ts
import { eq } from 'drizzle-orm';
import { db } from '../../../db/client';
import { project } from '../../../db/schema';

export function isNameUnique(name: string, excludeId?: string): boolean {
  const existing = db.select({ id: project.id }).from(project).where(eq(project.name, name)).get();

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;
  return false;
}
```

---

## IPC Handler Integration

IPC handlers are **thin wrappers** that call procedures:

```typescript
// src/main/ipc/project.handler.ts
import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants/channels';
import { createProject } from '../services/project/procedures/create';
import { listProjects } from '../services/project/procedures/list';

export function setupProjectHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.PROJECT.CREATE, (_, input) => createProject(input));
  ipcMain.handle(IPC_CHANNELS.PROJECT.LIST, (_, input) => listProjects(input));
}
```

---

## Best Practices

### DO

```typescript
// 1. Always validate inputs with Zod
const parseResult = schema.safeParse(input);
if (!parseResult.success) {
  return { success: false, error: parseResult.error.issues[0].message };
}

// 2. Use typed return values
export function createProject(input: Input): Output { ... }

// 3. Use scoped logger
const logger = baseLogger.scope("project:create");

// 4. Return consistent response format
return { success: true, project };
return { success: false, error: "Name is required" };
```

### DON'T

```typescript
// 1. Don't skip validation
export function createProject(input: any) { ... }

// 2. Don't use console.log
console.log("Project created");  // Use logger

// 3. Don't expose internal errors
return { success: false, error: error.stack };
```

---

## Quick Start Checklist

When creating a new service domain:

- [ ] Create `services/{domain}/` directory
- [ ] Add `types.ts` with Zod schemas
- [ ] Create `procedures/` with one file per action
- [ ] Add `lib/` for shared logic (if needed)
- [ ] Create thin IPC handler in `ipc/{domain}.handler.ts`
- [ ] Register handler in `ipc/index.ts`
- [ ] Add IPC channels in `shared/constants/channels.ts`
