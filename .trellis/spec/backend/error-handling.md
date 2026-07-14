# Error Handling Guidelines

> Strategies for handling errors in Electron backend procedures.

---

## Error Categories

| Error Type              | Action                      | Example                             |
| ----------------------- | --------------------------- | ----------------------------------- |
| **Data Integrity**      | `throw Error`               | Parent not found, invalid reference |
| **Input Validation**    | `return { success: false }` | Missing field, invalid format       |
| **External Dependency** | `warn` or `return error`    | Network failure                     |
| **Business Rule**       | `return { success: false }` | Duplicate name                      |

---

## Pattern 1: Data Integrity - Must Throw

When data consistency is at risk, throw to trigger transaction rollback.

```typescript
// CORRECT: Throw to rollback
const parent = findByPath(tx, parentPath);
if (!parent) {
  throw new Error(`Parent not found: ${parentPath}`);
}
item.parentId = parent.id;

// WRONG: Continue with invalid state
const parent = findByPath(tx, parentPath);
if (!parent) {
  logger.warn('Parent not found');
  // Transaction continues with null parentId!
}
```

---

## Pattern 2: Input Validation - Return Error

```typescript
const parseResult = updateProjectInputSchema.safeParse(input);
if (!parseResult.success) {
  const errorMessage = parseResult.error.issues.map((issue) => issue.message).join(', ');
  return { success: false, error: errorMessage };
}
```

---

## Pattern 3: Transaction Helpers Must Throw

Functions inside transactions must throw on failure.

```typescript
// CORRECT: Throw on failure
export function insertItem(tx, data) {
  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    throw new Error(`Validation failed: ${parseResult.error.issues[0].message}`);
  }
  tx.insert(items).values(data).run();
}

// WRONG: Silent return causes partial writes
export function insertItem(tx, data) {
  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    return; // Transaction continues!
  }
  tx.insert(items).values(data).run();
}
```

---

## Pattern 4: External Dependencies

```typescript
// Non-critical: warn and continue
try {
  await sendAnalytics(event);
} catch (error) {
  logger.warn('Analytics failed', { error });
}

// Critical: return error
const response = await net.fetch(url);
if (!response.ok) {
  return { success: false, error: 'Service unavailable' };
}
```

---

## Zod Error Handling

Use `safeParse` and access `.issues`:

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

## Decision Flowchart

```
Inside transaction?
|-- YES: Would continuing cause data inconsistency?
|   |-- YES --> throw Error()
|   |-- NO --> return { success: false }
|-- NO: Is this critical?
    |-- YES --> return { success: false }
    |-- NO --> logger.warn() + continue
```

---

## Common Mistakes

### Swallowing Errors

```typescript
// WRONG
try {
  await operation();
} catch (e) {
  // Silent failure
}

// CORRECT
try {
  await operation();
} catch (error) {
  logger.error('Failed', { error });
  return { success: false, error: 'Operation failed' };
}
```

### Exposing Internal Errors

```typescript
// WRONG
return { error: error.stack };

// CORRECT
return { error: 'Failed to save data' };
```

---

## Summary

| Situation            | Action                         |
| -------------------- | ------------------------------ |
| Validation fails     | `return { success: false }`    |
| Data integrity risk  | `throw Error()`                |
| Non-critical failure | `logger.warn()` + continue     |
| Critical failure     | `return { success: false }`    |
| Transaction helper   | `throw Error()` on any failure |
