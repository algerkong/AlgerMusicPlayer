# Type Safety Guidelines

> Type safety patterns for TypeScript + Zod development.

---

## No Non-Null Assertions

```typescript
// WRONG
const name = user!.name;

// CORRECT
const user = db.select().from(users).where(eq(users.id, id)).get();
if (!user) {
  throw new Error('User not found');
}
const name = user.name;
```

---

## Discriminated Union Narrowing

Use strict equality for type narrowing:

```typescript
type Result = { success: true; data: string } | { success: false; error: string };

// CORRECT: Use === true
if (result.success === true) {
  console.log(result.data);
} else {
  console.log(result.error);
}

// WRONG: Truthy check may not narrow
if (result.success) {
  console.log(result.data);
} else {
  console.log(result.error); // May cause type error
}
```

---

## Zod Schema for All Types

```typescript
import { z } from 'zod';

// Input schemas
export const createUserInputSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name required')
});

// Entity schemas (for API responses - use z.number() for timestamps)
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.number() // Unix milliseconds
});

// Inferred types
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type User = z.infer<typeof userSchema>;
```

---

## Zod Error Handling

```typescript
const parseResult = schema.safeParse(input);

if (!parseResult.success) {
  // CORRECT: Use .issues
  const error = parseResult.error.issues[0].message;
  return { success: false, error };
}

// WRONG: .errors doesn't exist
parseResult.error.errors; // TypeScript error!
```

---

## Type Imports

```typescript
// CORRECT
import type { User, Project } from './types';
import { createUser } from './procedures';

// Also acceptable
import { type User, createUser } from './types';
```

---

## Explicit Return Types

```typescript
// WRONG
export function getUser(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

// CORRECT
export function getUser(id: string): User | undefined {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
```

---

## Avoid `any`

```typescript
// WRONG
function process(data: any) { ... }

// CORRECT
function process(data: ProcessInput) { ... }
function process(data: unknown) { ... }
```

---

## Summary

| Rule                        | Reason                 |
| --------------------------- | ---------------------- |
| No `!` assertions           | Runtime errors         |
| Use `=== true` for unions   | Proper narrowing       |
| Zod-first types             | Single source of truth |
| Use `.issues` not `.errors` | Correct Zod API        |
| `import type` for types     | Clear separation       |
| Explicit return types       | Documentation          |
| Avoid `any`                 | Type safety            |
