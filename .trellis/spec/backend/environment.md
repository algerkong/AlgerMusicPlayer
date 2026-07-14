# Environment Configuration

> Guidelines for separating development and production environments.

---

## Dev/Prod Data Isolation

### The Problem

By default, Electron's `userData` is the same for dev and prod:

- Dev and prod share the same data
- Testing can corrupt data
- Can't run both simultaneously

### The Solution

```typescript
// src/main/env-setup.ts
import { app } from 'electron';

if (!app.isPackaged) {
  const devUserData = app.getPath('userData') + '-dev';
  app.setPath('userData', devUserData);
}

export {};
```

**Import order matters:**

```typescript
// src/main/index.ts
import { app } from 'electron';
import './env-setup'; // MUST be first after electron import

// Now safe to import modules that use electron-store
import Store from 'electron-store';
```

---

## Why a Separate Module?

ESM hoists imports, so this won't work:

```typescript
// WRONG
import { app } from "electron";
if (!app.isPackaged) {
  app.setPath("userData", ...); // Runs AFTER all imports
}
import Store from "electron-store"; // Already initialized!
```

With a separate module:

```typescript
// CORRECT
import { app } from 'electron';
import './env-setup'; // Side effect runs during import
import Store from 'electron-store'; // Now uses correct path
```

---

## Detection Methods

| Method                 | Use Case                                       |
| ---------------------- | ---------------------------------------------- |
| `app.isPackaged`       | Recommended - true when running from .app/.exe |
| `process.env.NODE_ENV` | Alternative - depends on build config          |

---

## What Gets Isolated

| Data Type      | Dev Path         | Prod Path    |
| -------------- | ---------------- | ------------ |
| electron-store | `App-dev/*.json` | `App/*.json` |
| Cookies        | `App-dev/`       | `App/`       |
| Logs           | `App-dev/logs/`  | `App/logs/`  |

---

## Database Path Exception

Keep database in project for easy inspection during dev:

```typescript
const getDbPath = () => {
  if (process.env.NODE_ENV === 'development') {
    return './app-dev.db'; // Project directory
  }
  return path.join(app.getPath('userData'), 'app.db');
};
```

---

## Summary

| Rule                        | Reason                     |
| --------------------------- | -------------------------- |
| Isolate dev/prod userData   | Prevent data corruption    |
| Use `app.isPackaged`        | Most reliable detection    |
| Set path in separate module | ESM hoisting               |
| Import env-setup first      | Before any userData access |
