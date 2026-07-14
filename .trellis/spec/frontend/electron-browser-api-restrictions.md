> **OBSOLETE (Trellis React scaffold).** This file does **not** describe LYMusicPlayer.
> Use `directory-structure.md`, `component-guidelines.md`, `hook-guidelines.md`,
> `state-management.md`, `type-safety.md`, and `quality-guidelines.md` instead.

# Electron Browser API Restrictions

> **Critical**: Certain browser APIs that work in regular web browsers do NOT work in Electron's renderer process. Using these APIs will cause runtime errors.

---

## Overview

Electron's renderer process runs in a Chromium-based environment, but it's not a standard browser. Some browser-native APIs are:

1. **Completely unsupported** - Will throw errors
2. **Behave differently** - May work but with limitations
3. **Blocked for security** - Disabled by Electron security policies

This document covers APIs that are commonly used in web development but fail in Electron.

---

## Unsupported Browser APIs

### 1. Dialog APIs (CRITICAL)

These browser dialog APIs are **NOT supported** in Electron:

| API                | Error                                       | Reason                                    |
| ------------------ | ------------------------------------------- | ----------------------------------------- |
| `window.prompt()`  | `Uncaught Error: prompt() is not supported` | Electron disables synchronous dialog APIs |
| `window.alert()`   | May be disabled or behave unexpectedly      | Not recommended in desktop apps           |
| `window.confirm()` | May be disabled or behave unexpectedly      | Not recommended in desktop apps           |

#### Why This Matters

These APIs are commonly used for quick prototyping or temporary implementations:

```typescript
// NEVER DO THIS - Will crash in Electron
const name = prompt('Enter your name:');
const confirmed = confirm('Are you sure?');
alert('Operation completed!');
```

Even if you add a "temporary" `prompt()` call with a TODO comment, **it will cause a runtime error when users interact with it**.

#### Correct Alternatives

| Need         | Bad (Browser API) | Good (Project Pattern)        |
| ------------ | ----------------- | ----------------------------- |
| Text input   | `prompt()`        | Custom input dialog component |
| Confirmation | `confirm()`       | Confirmation dialog component |
| Notification | `alert()`         | Toast notification component  |

#### Example: Replacing prompt() with Dialog

```tsx
// Bad - prompt() doesn't work in Electron
const handleCreate = () => {
  const title = prompt('Enter title:');
  if (title) {
    createItem(title);
  }
};

// Good - Use dialog component
const [showDialog, setShowDialog] = useState(false);
const [inputValue, setInputValue] = useState('');

const handleCreate = () => {
  setShowDialog(true);
};

const handleConfirm = () => {
  if (inputValue.trim()) {
    createItem(inputValue);
    setShowDialog(false);
    setInputValue('');
  }
};

return (
  <>
    <button onClick={handleCreate}>Create</button>
    {showDialog && (
      <Dialog onClose={() => setShowDialog(false)}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter title"
          autoFocus
        />
        <button onClick={handleConfirm}>Confirm</button>
        <button onClick={() => setShowDialog(false)}>Cancel</button>
      </Dialog>
    )}
  </>
);
```

#### Example: Replacing confirm() with Dialog

```tsx
// Bad - confirm() may not work in Electron
const handleDelete = () => {
  if (confirm('Are you sure you want to delete?')) {
    deleteItem();
  }
};

// Good - Use confirmation dialog component
const [showConfirm, setShowConfirm] = useState(false);

const handleDeleteClick = () => {
  setShowConfirm(true);
};

const handleConfirmDelete = () => {
  deleteItem();
  setShowConfirm(false);
};

return (
  <>
    <button onClick={handleDeleteClick}>Delete</button>
    {showConfirm && (
      <ConfirmDialog
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
      />
    )}
  </>
);
```

#### Example: Replacing alert() with Toast

```tsx
// Bad - alert() blocks the thread and may not work
alert('Item saved successfully!');

// Good - Use toast notification
import { useToast } from '../hooks/useToast';

const { toast } = useToast();
toast.success('Item saved successfully!');
```

---

### 2. Print Dialog

| API              | Status                | Alternative                       |
| ---------------- | --------------------- | --------------------------------- |
| `window.print()` | Limited functionality | Use `webContents.print()` via IPC |

```typescript
// Limited in Electron
window.print();

// Use IPC for full control
await window.api.print.printDocument(options);
```

---

### 3. Geolocation API

| API                     | Status                       | Notes                                            |
| ----------------------- | ---------------------------- | ------------------------------------------------ |
| `navigator.geolocation` | Requires permission handling | Works but needs proper Electron permission setup |

---

### 4. Notification API

| API                  | Status            | Alternative                                                    |
| -------------------- | ----------------- | -------------------------------------------------------------- |
| `new Notification()` | Works but limited | Use Electron's `Notification` via IPC for native notifications |

```typescript
// Browser API - works but limited
new Notification('Title', { body: 'Message' });

// Better - Use Electron native notification via IPC
await window.api.notification.show({
  title: 'Title',
  body: 'Message'
});
```

---

## Behavioral Differences

### 1. File Input

The `<input type="file">` element works, but `File.path` is **NOT available** due to context isolation:

```typescript
// Won't work - path is undefined
const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  console.log(file.path); // undefined!
};

// Use IPC for file paths
const result = await window.api.dialog.selectFile();
console.log(result.path); // "/Users/.../file.txt"
```

See [ipc-electron.md](./ipc-electron.md) for details on context isolation.

### 2. Drag and Drop

Same issue - `File.path` from drag events is not available:

```typescript
// Won't work
const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer.files[0];
  console.log(file.path); // undefined!
};

// Use IPC to handle dropped files
// Implement drag-drop handling in main process
```

### 3. Clipboard

The browser Clipboard API works for basic text, but for full clipboard access (images, files), use Electron's clipboard via IPC:

```typescript
// Browser API - basic text only
await navigator.clipboard.writeText('text');

// Full clipboard access via IPC
await window.api.clipboard.writeImage(imageBuffer);
```

---

## Development Guidelines

### Rule 1: Never Use Browser Dialogs

Even for "quick prototypes" or "temporary solutions", **never use `prompt()`, `alert()`, or `confirm()`**. They will cause runtime errors that users will encounter.

```typescript
// FORBIDDEN - Even with TODO comments
// TODO: Replace with proper dialog
const name = prompt('Name:'); // This WILL crash

// REQUIRED - Use project components from the start
const [showDialog, setShowDialog] = useState(false);
```

### Rule 2: Test in Electron, Not Browser

During development, always test in the actual Electron app, not just the browser dev server. Some APIs work in browsers but fail in Electron.

```bash
# Test in Electron
pnpm dev  # or your electron dev command

# Browser testing may miss Electron-specific issues
```

### Rule 3: Check This Document Before Using Browser APIs

Before using any browser API that involves:

- User input dialogs
- File system access
- Native notifications
- Clipboard operations
- Permissions

Check this document or [ipc-electron.md](./ipc-electron.md) to ensure the API is supported.

---

## Quick Reference: API Support Matrix

| Browser API             | Electron Support | Alternative                   |
| ----------------------- | ---------------- | ----------------------------- |
| `prompt()`              | Not supported    | Custom input dialog/component |
| `alert()`               | Unreliable       | Toast component               |
| `confirm()`             | Unreliable       | Confirmation dialog component |
| `window.print()`        | Limited          | `webContents.print()` via IPC |
| `File.path`             | Not available    | IPC file dialog               |
| `navigator.clipboard`   | Text only        | Electron clipboard via IPC    |
| `Notification`          | Limited          | Electron Notification via IPC |
| `navigator.geolocation` | With permissions | -                             |
| `localStorage`          | Works            | -                             |
| `sessionStorage`        | Works            | -                             |
| `IndexedDB`             | Works            | -                             |
| `fetch`                 | Works            | -                             |

---

## Creating Custom Dialog Components

When you need a new dialog type, follow this pattern:

```tsx
interface DialogProps {
  isOpen: boolean;
  onConfirm: (data: unknown) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function MyDialog({ isOpen, onConfirm, onCancel, isLoading }: DialogProps) {
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onKeyDown={handleKeyDown}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={isLoading ? undefined : onCancel} />

      {/* Dialog content */}
      <div className="relative z-10 bg-background rounded-lg p-6">
        {/* Your form content */}
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onCancel} disabled={isLoading}>
            Cancel
          </button>
          <button onClick={() => onConfirm({})} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Key elements**:

- Modal backdrop with click-to-close
- Keyboard handling (Escape to cancel, Enter to confirm)
- Loading state support
- Proper focus management
- Accessible ARIA attributes

---

## Lessons Learned

### Case Study: prompt() Crash

**Bug**: `Uncaught Error: prompt() is not supported` when users tried to create items.

**Root Cause**: Developer used `prompt()` as a "temporary" solution:

```typescript
// Show inline input - for now just prompt
const title = prompt('Enter name:');
```

**Impact**: Application crash when users tried to create items.

**Fix**: Replaced with proper dialog component using React state management.

**Lesson**: There are no "temporary" solutions with unsupported APIs. The code ships, users encounter it, and it crashes. Always use the correct pattern from the start.

---

## Related Documentation

| Document                             | Content                                                |
| ------------------------------------ | ------------------------------------------------------ |
| [ipc-electron.md](./ipc-electron.md) | IPC patterns, context isolation, native feature access |
| [components.md](./components.md)     | UI component patterns                                  |

---

**Language**: All documentation must be written in **English**.
