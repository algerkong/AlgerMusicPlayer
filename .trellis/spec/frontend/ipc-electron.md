> **OBSOLETE (Trellis React scaffold).** This file does **not** describe LYMusicPlayer.
> Use `directory-structure.md`, `component-guidelines.md`, `hook-guidelines.md`,
> `state-management.md`, `type-safety.md`, and `quality-guidelines.md` instead.

# IPC & Electron Guidelines

> IPC API usage, context isolation, and Electron-specific patterns.

---

## IPC API Guidelines

### Using window.api

The preload script exposes `window.api` for communicating with the main process.

```tsx
// Good - Use window.api for IPC calls
const result = await window.api.auth.login({ email, password });
const session = await window.api.session.restore();

// Bad - Don't use ipcRenderer directly in renderer
import { ipcRenderer } from 'electron'; // Won't work with contextIsolation
```

### Type Safety for IPC

Types should be defined in a shared location and used by both main and renderer processes.

```tsx
// Import types from shared types
import type { LoginInput, AuthResponse, SessionData } from '../shared/types/auth';

// window.api is fully typed via preload.ts
const result: AuthResponse = await window.api.auth.login(data);
```

### Preload API Structure

```typescript
// src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from './shared/constants/channels';

contextBridge.exposeInMainWorld('api', {
  auth: {
    login: (data: LoginInput): Promise<AuthResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGIN, data),
    register: (data: RegisterInput): Promise<AuthResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH.REGISTER, data),
    logout: (): Promise<AuthResponse> => ipcRenderer.invoke(IPC_CHANNELS.AUTH.LOGOUT)
  },
  session: {
    get: (): Promise<SessionData> => ipcRenderer.invoke(IPC_CHANNELS.SESSION.GET),
    restore: (): Promise<SessionData> => ipcRenderer.invoke(IPC_CHANNELS.SESSION.RESTORE)
  }
});

// Type declaration for window.api
declare global {
  interface Window {
    api: {
      auth: {
        login: (data: LoginInput) => Promise<AuthResponse>;
        register: (data: RegisterInput) => Promise<AuthResponse>;
        logout: () => Promise<AuthResponse>;
      };
      session: {
        get: () => Promise<SessionData>;
        restore: () => Promise<SessionData>;
      };
    };
  }
}
```

---

## Data Refresh Subscription Pattern

All hooks that fetch data from the backend via IPC **should** subscribe to data change events. This ensures UI updates when data changes from external sources (sync, background refresh, etc.).

### Why This Matters

When data changes in the background:

1. New data is written to local database
2. **But UI won't update** unless hooks refetch their data
3. Without subscription, users see stale data until page reload

### Implementation Pattern

```typescript
// Required pattern for data-fetching hooks
import { useDataRefresh } from '../context/DataRefreshContext';

export function useMyData({ workspaceId }: Options) {
  const [data, setData] = useState([]);
  const { onDataRefresh } = useDataRefresh();

  const fetchData = useCallback(async () => {
    const result = await window.api.myData.list({ workspaceId });
    setData(result);
  }, [workspaceId]);

  // Initial fetch
  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // CRITICAL: Subscribe to data refresh events
  useEffect(() => {
    const unsubscribe = onDataRefresh(() => {
      void fetchData(); // Refetch when data refreshes
    });
    return unsubscribe;
  }, [onDataRefresh, fetchData]);

  return { data, refetch: fetchData };
}
```

### Common Mistake: Missing Hook

```tsx
// MyPage.tsx uses TWO data hooks:
const { items } = useItems({ workspaceId }); // Has subscription
const { tree } = useItemTree({ workspaceId }); // ALSO needs subscription!

// UI renders from useItemTree, not useItems!
<TreeView nodes={tree} />;
```

**Rule**: Trace which hook's data the UI actually renders, not just what "looks related".

---

## Electron Context Isolation Restrictions

This project uses `contextIsolation: true` for security. This means the renderer process is isolated from Node.js and Electron APIs.

### What You CANNOT Do in Renderer

```tsx
// These will NOT work in renderer process:

// 1. File.path from drag-and-drop
const handleDrop = (e: DragEvent) => {
  const file = e.dataTransfer.files[0];
  console.log(file.path); // undefined! Not exposed with contextIsolation
};

// 2. Node.js APIs
import fs from 'fs'; // Error: Module not found
import path from 'path'; // Error: Module not found

// 3. Electron APIs directly
import { dialog } from 'electron'; // Error: Not available in renderer
import { clipboard } from 'electron'; // Error: Not available in renderer
```

### How to Access Native Features

When you need native functionality (file system, dialogs, clipboard, etc.), you MUST:

1. **Create IPC channel** in shared constants
2. **Add IPC handler** in main process
3. **Expose via preload** in preload.ts
4. **Call via window.api** in renderer

```tsx
// Example: Native directory picker

// Step 1: Add channel (src/shared/constants/channels.ts)
export const IPC_CHANNELS = {
  DIALOG: {
    SELECT_DIRECTORY: 'dialog:selectDirectory'
  }
} as const;

// Step 2: Add handler (src/main/ipc/dialog.handler.ts)
import { ipcMain, dialog } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/channels';

ipcMain.handle(IPC_CHANNELS.DIALOG.SELECT_DIRECTORY, async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return { success: true, path: result.filePaths[0] };
});

// Step 3: Expose in preload (src/preload.ts)
contextBridge.exposeInMainWorld('api', {
  dialog: {
    selectDirectory: (): Promise<{ success: boolean; path?: string }> =>
      ipcRenderer.invoke(IPC_CHANNELS.DIALOG.SELECT_DIRECTORY)
  }
});

// Step 4: Use in renderer
const result = await window.api.dialog.selectDirectory();
if (result.path) {
  console.log('Selected:', result.path);
}
```

### Common Native Features via IPC

| Feature          | IPC Channel              | API                                   |
| ---------------- | ------------------------ | ------------------------------------- |
| Select directory | `dialog:selectDirectory` | `window.api.dialog.selectDirectory()` |
| Select file      | `dialog:selectFile`      | `window.api.dialog.selectFile()`      |
| Save file        | `dialog:saveFile`        | `window.api.dialog.saveFile()`        |
| Read clipboard   | `clipboard:read`         | `window.api.clipboard.read()`         |
| Write clipboard  | `clipboard:write`        | `window.api.clipboard.write()`        |

### Key Reminder

> **Before implementing any feature that requires file paths, native dialogs, or system APIs:**
>
> 1. Check if `window.api` already has the needed function
> 2. If not, implement the full IPC flow (channel -> handler -> preload -> renderer)
> 3. Never assume browser/Electron APIs work the same way

---

## Desktop Title Bar (macOS traffic lights + draggable regions)

When implementing a custom title bar (like Obsidian/Notion-style **TabBar in the window title bar area**) on macOS, you must coordinate three layers:

1. **Main process**: `BrowserWindow` title bar configuration
2. **Renderer bootstrap**: platform class for CSS targeting
3. **CSS**: explicit draggable / non-draggable regions via `-webkit-app-region`

### 1) Main process: BrowserWindow config (macOS)

- Use `titleBarStyle: "hiddenInset"` on macOS to extend web contents into the title bar.
- Set `trafficLightPosition` so the traffic lights are visually centered in your title bar height.
- Treat the title bar height as a **design constant**: if you change the height, you must re-check `trafficLightPosition`.

```typescript
// src/main.ts
const win = new BrowserWindow({
  titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  trafficLightPosition: { x: 12, y: 12 } // Adjust based on your title bar height
  // ...other options
});
```

### 2) Renderer bootstrap: platform class

Add a platform class to `document.documentElement` and use it for CSS offsets:

```typescript
// src/renderer.ts
if (process.platform === 'darwin') {
  document.documentElement.classList.add('platform-mac');
}
```

Use it to add left padding to the title bar so tabs do not overlap the traffic lights:

```css
.platform-mac .tab-bar {
  padding-left: 80px; /* Space for traffic lights */
}
```

### 3) CSS: drag/no-drag regions (Electron)

Rules:

- Set `-webkit-app-region: drag` on the _outer_ title bar container (e.g., `.tab-bar`).
- Mark **every interactive element** inside it as `-webkit-app-region: no-drag` (buttons, tabs, menus, inputs).
- Avoid visual seams between the active tab and the main content.

```css
/* Title bar is draggable by default */
.tab-bar {
  -webkit-app-region: drag;
  height: 40px;
  display: flex;
  align-items: center;
}

/* Interactive elements must be non-draggable */
.tab-bar button,
.tab-bar .tab-item,
.tab-bar input {
  -webkit-app-region: no-drag;
}
```

---

## Menu Accelerators (Keyboard Shortcuts)

When implementing native keyboard shortcuts like `Cmd+W`, `Cmd+T`, `Cmd+N`, you must use **Electron's Application Menu**, not `globalShortcut` or `before-input-event`.

### Why Menu Accelerators

- macOS respects menu accelerators as the **authoritative source** for keyboard shortcuts
- Using `globalShortcut` can conflict with other apps
- `before-input-event` is low-level and harder to maintain
- Menu accelerators automatically appear in the native menu with correct key symbols

### Implementation Pattern

#### 1. Define IPC Channel

```typescript
// src/shared/constants/channels.ts
export const IPC_CHANNELS = {
  TABS: {
    NEW_TAB: 'tabs:newTab', // Cmd+T
    NEW_DOC: 'tabs:newDoc', // Cmd+N
    CLOSE_ACTIVE: 'tabs:closeActive', // Cmd+W
    REOPEN_CLOSED: 'tabs:reopenClosed' // Shift+Cmd+T
  }
} as const;
```

#### 2. Create Menu with Accelerators

```typescript
// src/main.ts
import { Menu, BrowserWindow, MenuItemConstructorOptions } from 'electron';
import { IPC_CHANNELS } from './shared/constants/channels';

function createApplicationMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Tab',
          accelerator: 'CmdOrCtrl+T',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(IPC_CHANNELS.TABS.NEW_TAB);
            }
          }
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send(IPC_CHANNELS.TABS.CLOSE_ACTIVE);
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
```

#### 3. Bridge in Preload

```typescript
// src/preload.ts
contextBridge.exposeInMainWorld('api', {
  tabs: {
    onNewTab: (handler: () => void) => {
      const wrapped = () => handler();
      ipcRenderer.on(IPC_CHANNELS.TABS.NEW_TAB, wrapped);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.TABS.NEW_TAB, wrapped);
    },
    onCloseActiveTab: (handler: () => void) => {
      const wrapped = () => handler();
      ipcRenderer.on(IPC_CHANNELS.TABS.CLOSE_ACTIVE, wrapped);
      return () => ipcRenderer.removeListener(IPC_CHANNELS.TABS.CLOSE_ACTIVE, wrapped);
    }
  }
});
```

#### 4. Subscribe in Renderer

```tsx
// src/renderer/src/App.tsx or TabsContext.tsx
useEffect(() => {
  const unsubscribe = window.api.tabs.onNewTab(() => {
    openNewTab();
  });
  return unsubscribe;
}, [openNewTab]);
```

### Data Flow

```
Main Process (Menu Accelerator)
    | webContents.send(channel)
Preload (ipcRenderer.on)
    | handler callback
Renderer (useEffect subscription)
    | state update
UI Re-render
```

### Key Points

| Rule                                      | Reason                                     |
| ----------------------------------------- | ------------------------------------------ |
| Use `Menu.setApplicationMenu()`           | macOS uses app menu as truth for shortcuts |
| Use `webContents.send()` in click handler | Main -> Renderer communication             |
| Return unsubscribe function in preload    | Prevent memory leaks                       |
| Clean up in useEffect return              | React lifecycle management                 |

### Common Shortcuts Reference

| Shortcut    | Action        | Channel                     |
| ----------- | ------------- | --------------------------- |
| Cmd+N       | New document  | `tabs:newDoc`               |
| Cmd+T       | New tab       | `tabs:newTab`               |
| Cmd+W       | Close tab     | `tabs:closeActive`          |
| Shift+Cmd+T | Reopen closed | `tabs:reopenClosed`         |
| Shift+Cmd+N | New window    | (creates new BrowserWindow) |

---

## Floating Window Pattern (Global Shortcut + Always-on-Top)

When implementing a floating window (like Raycast Notes) that:

- Stays on top of other apps
- Toggles via global shortcut
- Pre-loads for instant open

### Architecture Overview

```
Main Process (floating-window.ts)
+-- createFloatingWindow() - Pre-create hidden window
+-- toggleFloatingWindow() - Show/hide instantly
+-- registerFloatingShortcut() - globalShortcut registration
+-- hover tracking (cursor polling -> IPC)
         | webContents.send()
Preload (preload.ts)
+-- floatingWindow.toggle/show/hide
+-- floatingWindow.onFocused
+-- floatingWindow.onHoverChanged
         | callback
Renderer (FloatingWindowPage.tsx)
+-- useEffect subscriptions
```

### Key Implementation Points

#### 1. Pre-load Window for Instant Open

```typescript
// In main process service
import { BrowserWindow } from 'electron';

let floatingWindow: BrowserWindow | null = null;

export function createFloatingWindow(): BrowserWindow {
  floatingWindow = new BrowserWindow({
    show: false, // Hidden initially
    alwaysOnTop: true, // Float above other apps
    frame: false, // Custom titlebar
    skipTaskbar: true, // Don't show in dock/taskbar
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  // Load content immediately so it's ready
  floatingWindow.loadURL(`${MAIN_WINDOW_VITE_URL}#/floating-window`);

  // Don't destroy on close, just hide
  floatingWindow.on('close', (event) => {
    event.preventDefault();
    floatingWindow?.hide();
  });

  return floatingWindow;
}
```

#### 2. Global Shortcut Registration

```typescript
import { globalShortcut, app } from 'electron';

export function registerFloatingShortcut(): boolean {
  return globalShortcut.register('Alt+J', toggleFloatingWindow);
}

// MUST unregister on app quit
app.on('before-quit', () => {
  globalShortcut.unregister('Alt+J');
});

export function toggleFloatingWindow(): void {
  if (!floatingWindow) return;

  if (floatingWindow.isVisible()) {
    floatingWindow.hide();
  } else {
    floatingWindow.show();
    floatingWindow.focus();
    floatingWindow.webContents.send('floating-window:focused');
  }
}
```

#### 3. Cross-Process Hover Detection

When using `-webkit-app-region: drag`, DOM mouse events don't fire. Solution: poll cursor position in main process.

```typescript
// Main process
import { screen } from 'electron';

let hoverInterval: NodeJS.Timeout | null = null;

export function startHoverTracking(): void {
  hoverInterval = setInterval(() => {
    if (!floatingWindow || !floatingWindow.isVisible()) return;

    const cursor = screen.getCursorScreenPoint();
    const bounds = floatingWindow.getBounds();
    const isInside =
      cursor.x >= bounds.x &&
      cursor.x <= bounds.x + bounds.width &&
      cursor.y >= bounds.y &&
      cursor.y <= bounds.y + bounds.height;

    floatingWindow.webContents.send('floating-window:hoverChanged', isInside);
  }, 50);
}
```

```tsx
// Renderer - avoid React re-renders by manipulating DOM directly
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const container = containerRef.current;
  const unsubscribe = window.api.floatingWindow.onHoverChanged((isHovered) => {
    container?.classList.toggle('floating-window--hovered', isHovered);
  });
  return unsubscribe;
}, []);
```

### IPC Channels

| Channel                        | Direction | Purpose                        |
| ------------------------------ | --------- | ------------------------------ |
| `floating-window:toggle`       | R->M      | Toggle visibility              |
| `floating-window:show`         | R->M      | Show window                    |
| `floating-window:hide`         | R->M      | Hide window                    |
| `floating-window:focused`      | M->R      | Window just shown, focus input |
| `floating-window:hoverChanged` | M->R      | Cursor inside/outside window   |

---

**Language**: All documentation must be written in **English**.
