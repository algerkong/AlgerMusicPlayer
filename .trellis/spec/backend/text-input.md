# Text Input Without Clipboard Pollution

> Best practices for inserting text into other applications without polluting the clipboard.

## Overview

When building voice-to-text or similar features, you need to insert text at the user's cursor position. There are several approaches, each with trade-offs.

---

## Approaches Comparison

| Approach                   | Clipboard Pollution | Speed | Compatibility | Complexity |
| -------------------------- | ------------------- | ----- | ------------- | ---------- |
| Clipboard + Cmd+V          | Yes                 | Fast  | Universal     | Low        |
| Save/Restore Clipboard     | Partial\*           | Slow  | Universal     | Medium     |
| Direct Keyboard Simulation | No                  | Fast  | Good\*\*      | Medium     |

\* Clipboard manager apps may still capture the temporary content  
\*\* Some apps may not accept keyboard-simulated input

---

## Recommended: Direct Keyboard Simulation

Use `@xitanggg/node-insert-text` for macOS:

```typescript
import { insertText } from '@xitanggg/node-insert-text';

export async function pasteTextAtCursor(
  text: string
): Promise<{ success: boolean; error?: string }> {
  try {
    insertText(text);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
```

### Why This Approach?

- **No clipboard pollution**: Uses `CGEventKeyboardSetUnicodeString` to simulate typing
- **Fast**: No clipboard operations needed
- **Clean**: User's clipboard remains untouched

---

## Setup for @xitanggg/node-insert-text

### 1. Install

```bash
pnpm add @xitanggg/node-insert-text
```

### 2. Add to Vite Externals

```typescript
// vite.main.config.ts
external: [
  "@xitanggg/node-insert-text",
],
```

### 3. Add to Forge Native Modules

```typescript
// forge.config.ts
const nativeModules = [
  '@xitanggg/node-insert-text',
  '@xitanggg/node-insert-text-darwin-arm64' // Platform-specific
];
```

**Important**: Include the platform-specific package (check `node_modules` after install).

---

## Accessibility Permission Required

Text insertion requires macOS **Accessibility** permission.

### Check Permission

```typescript
import { systemPreferences } from 'electron';

function checkAccessibilityPermission(): boolean {
  return systemPreferences.isTrustedAccessibilityClient(false);
}
```

### Prompt for Permission

```typescript
function promptAccessibilityPermission(): boolean {
  // This will show the system prompt
  return systemPreferences.isTrustedAccessibilityClient(true);
}
```

### Guide User to Settings

```typescript
import { shell } from 'electron';

function openAccessibilitySettings(): void {
  shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
  );
}
```

---

## Fallback: Clipboard Approach

If direct keyboard simulation doesn't work for certain apps:

```typescript
import { clipboard } from 'electron';

export async function pasteTextViaClipboard(text: string): Promise<void> {
  // Save original clipboard content
  const originalText = clipboard.readText();
  const originalHTML = clipboard.readHTML();

  try {
    // Write new text
    clipboard.writeText(text);

    // Simulate Cmd+V
    // Use robotjs or uiohook for this

    // Wait for paste to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
  } finally {
    // Restore original clipboard
    if (originalHTML) {
      clipboard.writeHTML(originalHTML);
    } else if (originalText) {
      clipboard.writeText(originalText);
    } else {
      clipboard.clear();
    }
  }
}
```

**Warning**: This approach still pollutes clipboard history managers like Paste, Maccy, etc.

---

## Error Handling Pattern

```typescript
export async function pasteTextAtCursor(
  text: string
): Promise<{ success: boolean; error?: string }> {
  // Check accessibility permission first
  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    return {
      success: false,
      error: 'Accessibility permission required'
    };
  }

  try {
    insertText(text);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
```

---

## Testing Checklist

1. **Test with various apps**: TextEdit, VS Code, Chrome, Terminal
2. **Test with clipboard managers**: Verify clipboard history isn't polluted
3. **Test special characters**: Unicode, emojis, multi-line text
4. **Test long text**: Performance with large text blocks
5. **Test without permission**: Verify error handling

---

## Common Issues

### Text Not Inserting

1. Check Accessibility permission is granted
2. Check the target app accepts keyboard input
3. Some apps (like Terminal) handle input differently

### Partial Text Inserted

Some apps have input buffers that can't handle fast input:

```typescript
// Add small delay between chunks for problematic apps
async function insertTextWithDelay(text: string, chunkSize = 100): Promise<void> {
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    insertText(chunk);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
```

### Permission Not Taking Effect

After granting Accessibility permission, the app may need to be restarted:

```typescript
import { app } from 'electron';

function checkAndPromptRestart(): void {
  if (!systemPreferences.isTrustedAccessibilityClient(false)) {
    // Show UI to guide user to settings
    // After they grant, tell them to restart the app
  }
}
```

---

## Key Takeaways

1. **Prefer `@xitanggg/node-insert-text`** over clipboard-based approaches
2. **Always check Accessibility permission** before attempting text insertion
3. **Handle errors gracefully** - not all apps accept simulated input
4. **Test extensively** - different apps behave differently
5. **Configure as native module** in both Vite and Forge configs
