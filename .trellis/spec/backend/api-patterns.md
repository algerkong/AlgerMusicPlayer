# API Patterns

> Common patterns and anti-patterns for API modules.

---

## Common Patterns

### 1. CRUD with Transaction

For creating entities with related data, use transactions.

```typescript
export function createProject(input: CreateProjectInput): CreateProjectOutput {
  const parseResult = createProjectInputSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0].message };
  }

  const { name, description, members } = parseResult.data;
  const projectId = crypto.randomUUID();

  try {
    const result = db.transaction((tx) => {
      // 1. Create project
      const [newProject] = tx
        .insert(project)
        .values({ id: projectId, name, description })
        .returning()
        .all();

      // 2. Create members if provided
      if (members && members.length > 0) {
        tx.insert(projectMember)
          .values(members.map((m) => ({ projectId, userId: m.userId })))
          .run();
      }

      return newProject;
    });

    // Note: Convert Date fields to Unix ms before returning
    // See shared/timestamp.md for specification
    return { success: true, project: result };
  } catch (error) {
    logger.error('Create failed', { error });
    return { success: false, error: 'Failed to create project' };
  }
}
```

### 2. Paginated List with Cursor

```typescript
export function listProjects(input: ListProjectsInput): ListProjectsOutput {
  const { status, limit = 20, cursor } = input;
  const conditions = [];

  if (status) {
    conditions.push(eq(project.status, status));
  }

  if (cursor) {
    const cursorData = decodeCursor(cursor);
    if (cursorData) {
      conditions.push(
        or(
          lt(project.updatedAt, cursorData.updatedAt),
          and(eq(project.updatedAt, cursorData.updatedAt), lt(project.id, cursorData.id))
        )
      );
    }
  }

  const fetchLimit = limit + 1;
  const results = db
    .select()
    .from(project)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(project.updatedAt), desc(project.id))
    .limit(fetchLimit)
    .all();

  const hasMore = results.length > limit;
  if (hasMore) results.pop();

  const nextCursor =
    hasMore && results.length > 0
      ? encodeCursor(results[results.length - 1].updatedAt, results[results.length - 1].id)
      : null;

  return { success: true, projects: results, nextCursor, hasMore };
}
```

### 3. External API Call

Use `net.fetch` for proper proxy support.

```typescript
export async function fetchRemoteData(input: FetchRemoteInput): Promise<FetchRemoteOutput> {
  const parseResult = fetchRemoteInputSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0].message };
  }

  try {
    // Use net.fetch for proper proxy support
    const response = await net.fetch(`${API_URL}/resources/${input.id}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${input.token}` }
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'Network request failed' };
  }
}
```

---

## Anti-Patterns

### 1. Fat IPC Handlers

```typescript
// BAD: Logic in IPC handler
ipcMain.handle("project:create", async (_, input) => {
  const parseResult = schema.safeParse(input);
  if (!parseResult.success) { ... }
  const [project] = db.insert(...).returning().all();
  return { success: true, project };
});

// GOOD: Thin IPC handler
ipcMain.handle("project:create", (_, input) => createProject(input));
```

### 2. Missing Validation

```typescript
// BAD: No validation
export function createProject(input: any) {
  db.insert(project).values(input).run();
}

// GOOD: Validate first
export function createProject(input: CreateProjectInput) {
  const parseResult = schema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0].message };
  }
  // ...
}
```

### 3. Node fetch Instead of net.fetch

```typescript
// BAD: Ignores system proxy
import fetch from 'node-fetch';
const response = await fetch(url);

// GOOD: Respects system proxy
import { net } from 'electron';
const response = await net.fetch(url);
```

### 4. Silent Return in Transactions

```typescript
// BAD: Transaction continues on failure
export function insertItem(tx, data) {
  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    return; // Transaction continues!
  }
  tx.insert(table).values(data).run();
}

// GOOD: Throw to rollback
export function insertItem(tx, data) {
  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    throw new Error('Validation failed');
  }
  tx.insert(table).values(data).run();
}
```

---

## Upsert Pattern

```typescript
db.insert(settings)
  .values({ key: 'theme', value: 'dark' })
  .onConflictDoUpdate({
    target: settings.key,
    set: { value: 'dark', updatedAt: new Date() }
  })
  .run();
```

---

## Soft Delete Pattern

```typescript
// Soft delete
db.update(project).set({ isDeleted: true, deletedAt: new Date() }).where(eq(project.id, id)).run();

// Query active only
db.select().from(project).where(eq(project.isDeleted, false)).all();
```

---

## Summary

| Pattern           | Use Case           |
| ----------------- | ------------------ |
| Transaction       | Multiple writes    |
| Cursor pagination | Large lists        |
| net.fetch         | External API calls |
| Upsert            | Insert or update   |
| Soft delete       | Data recovery      |
