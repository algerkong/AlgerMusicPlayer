# Database Guidelines (Drizzle + SQLite)

> Guidelines for Drizzle ORM and SQLite development in Electron.

---

## Drizzle Client Setup

```typescript
// src/main/db/client.ts
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import * as schema from './schema';

const getDbPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return './app-dev.db';
  }
  return path.join(app.getPath('userData'), 'app.db');
};

const sqlite = new Database(getDbPath());
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { sqlite };
```

---

## Schema Definition

```typescript
// src/main/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status', { enum: ['active', 'archived', 'draft'] })
    .default('active')
    .notNull(),
  // Use timestamp_ms for millisecond precision
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => new Date())
});

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
});

// Relations for db.query.* API
export const projectsRelations = relations(projects, ({ many }) => ({
  tasks: many(tasks)
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  })
}));

// Export types
export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
```

---

## Timestamp Precision

**CRITICAL: Always use `{ mode: 'timestamp_ms' }` for timestamps.**

```typescript
// BAD: Using seconds mode
createdAt: integer('createdAt', { mode: 'timestamp' }); // Stores 1734019200

// GOOD: Using milliseconds mode
createdAt: integer('createdAt', { mode: 'timestamp_ms' }); // Stores 1734019200000
```

---

## Query Patterns

```typescript
// Single result
const user = db.select().from(users).where(eq(users.id, id)).get();

// Multiple results
const allUsers = db.select().from(users).all();

// Insert with return
const newUser = db.insert(users).values(data).returning().get();

// Relational queries
const projectsWithTasks = db.query.projects.findMany({
  with: { tasks: true }
});

// Transaction
db.transaction((tx) => {
  tx.insert(projects).values(projectData).run();
  tx.insert(tasks).values(taskData).run();
});

// Batch lookup (avoid N+1)
const results = db.select().from(items).where(inArray(items.id, ids)).all();
```

---

## Migrations

```typescript
// src/main/db/migrate.ts
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { db } from './client';
import { existsSync } from 'fs';
import path from 'path';

export function runMigrations() {
  const migrationsFolder =
    process.env.NODE_ENV === 'development'
      ? path.resolve(__dirname, '..', '..', 'drizzle')
      : path.join(process.resourcesPath, 'drizzle');

  if (!existsSync(migrationsFolder)) {
    return { success: false, reason: 'missing-folder' };
  }

  try {
    migrate(db, { migrationsFolder });
    return { success: true };
  } catch (error) {
    return { success: false, reason: 'error', error: error.message };
  }
}
```

---

## Quick Reference

| Operation     | Method                  |
| ------------- | ----------------------- |
| Single        | `.get()`                |
| Multiple      | `.all()`                |
| Insert/Update | `.run()`                |
| With return   | `.returning().get()`    |
| Relational    | `db.query.*.findMany()` |

| Rule               | Reason                |
| ------------------ | --------------------- |
| Use `timestamp_ms` | Match JavaScript Date |
| Use transactions   | Atomic operations     |
| Use `inArray`      | Avoid N+1 queries     |
| Filter `isDeleted` | Exclude soft-deleted  |
