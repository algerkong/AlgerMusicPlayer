# macOS System Permissions

> Guide for handling system permissions (microphone, accessibility, etc.) in Electron apps.

## Overview

macOS requires explicit user consent for sensitive permissions. The behavior differs significantly between **signed** and **unsigned** apps.

---

## Permission Types

| Permission       | API                                                 | Use Case                           |
| ---------------- | --------------------------------------------------- | ---------------------------------- |
| Microphone       | `systemPreferences.askForMediaAccess('microphone')` | Voice input                        |
| Camera           | `systemPreferences.askForMediaAccess('camera')`     | Video capture                      |
| Accessibility    | `systemPreferences.isTrustedAccessibilityClient()`  | Text insertion, global shortcuts   |
| Screen Recording | `systemPreferences.getMediaAccessStatus('screen')`  | Screen capture                     |
| Input Monitoring | N/A (part of Accessibility)                         | Global keyboard hooks, HID devices |

---

## Signed vs Unsigned Apps

| Behavior             | Unsigned App               | Signed App                 |
| -------------------- | -------------------------- | -------------------------- |
| Permission dialog    | Never shows                | Shows automatically        |
| User action required | Manual in System Settings  | Click Allow in dialog      |
| Development mode     | Inherits from terminal     | N/A                        |
| TCC database entry   | Created on manual approval | Created on dialog approval |

**Key insight**: For development, run with `pnpm start` to inherit terminal's permissions.

---

## Checking Permissions

### Microphone

```typescript
import { systemPreferences } from 'electron';

function getMicrophoneStatus(): string {
  // Returns: 'not-determined' | 'granted' | 'denied' | 'restricted'
  return systemPreferences.getMediaAccessStatus('microphone');
}
```

### Accessibility

```typescript
function getAccessibilityStatus(): boolean {
  // false = don't prompt, just check
  return systemPreferences.isTrustedAccessibilityClient(false);
}
```

---

## Requesting Permissions

### Microphone (Signed Apps Only)

```typescript
import { app, systemPreferences } from 'electron';

app.on('ready', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone');

    if (status === 'not-determined') {
      // Will show system dialog (signed apps only)
      const granted = await systemPreferences.askForMediaAccess('microphone');
      console.log('Microphone permission:', granted ? 'granted' : 'denied');
    }
  }
});
```

### Accessibility

```typescript
function requestAccessibilityPermission(): boolean {
  // true = prompt user if not already granted
  return systemPreferences.isTrustedAccessibilityClient(true);
}
```

---

## Renderer Process Alternative

For microphone, you can trigger the permission dialog from renderer:

```typescript
// renderer.ts
async function requestMicrophonePermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop immediately - we just wanted the permission
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
}
```

**Note**: This also requires a signed app for the dialog to appear.

---

## Guiding Users to System Settings

When permissions are denied or for unsigned apps:

```typescript
import { shell } from 'electron';

const SETTINGS_URLS = {
  microphone: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone',
  accessibility: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility',
  screenRecording: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture',
  camera: 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera',
  inputMonitoring: 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
};

function openPermissionSettings(type: keyof typeof SETTINGS_URLS): void {
  shell.openExternal(SETTINGS_URLS[type]);
}
```

---

## Info.plist Configuration

Add permission descriptions in `forge.config.ts`:

```typescript
packagerConfig: {
  extendInfo: {
    NSMicrophoneUsageDescription: "Voice input requires microphone access.",
    NSCameraUsageDescription: "Video features require camera access.",
    NSAccessibilityUsageDescription: "Text insertion requires accessibility access.",
    NSScreenCaptureUsageDescription: "Screen sharing requires screen recording access.",
  },
},
```

---

## Entitlements for Signed Apps

Create `entitlements.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Microphone access -->
    <key>com.apple.security.device.audio-input</key>
    <true/>

    <!-- Camera access -->
    <key>com.apple.security.device.camera</key>
    <true/>

    <!-- Required for Electron with native modules -->
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

---

## Development Workflow

### For Unsigned Apps (Development)

1. Run from terminal: `pnpm start`
2. Ensure terminal app has required permissions
3. Electron inherits terminal's permissions

### For Signed Apps (Production)

1. Configure code signing in `forge.config.ts`
2. Add entitlements file
3. Permission dialogs appear automatically

---

## Resetting Permissions (Testing)

```bash
# Reset microphone permission for your app
tccutil reset Microphone <bundle-id>

# Example
tccutil reset Microphone ai.mindfold.open-typeless

# Reset all permissions for your app
tccutil reset All <bundle-id>
```

---

## Common Issues

### Permission Dialog Not Showing

**Cause**: App is not signed with Apple Developer certificate.

**Solutions**:

1. Development: Run with `pnpm start` (inherits terminal permissions)
2. Production: Sign app with Developer ID certificate

### Permission Granted But Still Not Working

**Cause**: TCC database cached old state.

**Solution**: Reset permissions and restart app:

```bash
tccutil reset Microphone <bundle-id>
```

### "Operation not permitted" Error

**Cause**: Accessibility permission not granted.

**Solution**: Guide user to System Settings > Privacy & Security > Accessibility.

---

## Best Practices

1. **Check before requesting**: Always check status before calling `askForMediaAccess`
2. **Handle denial gracefully**: Provide clear instructions for manual approval
3. **Don't spam requests**: If denied, guide to settings instead of re-requesting
4. **Log permission status**: Helps debugging permission issues
5. **Test both flows**: Test with and without permissions granted

---

## Permission Check Pattern

```typescript
interface PermissionStatus {
  microphone: 'granted' | 'denied' | 'not-determined' | 'restricted';
  accessibility: boolean;
}

async function checkPermissions(): Promise<PermissionStatus> {
  return {
    microphone: systemPreferences.getMediaAccessStatus('microphone'),
    accessibility: systemPreferences.isTrustedAccessibilityClient(false)
  };
}

async function ensurePermissions(): Promise<boolean> {
  const status = await checkPermissions();

  // Check microphone
  if (status.microphone === 'not-determined') {
    const granted = await systemPreferences.askForMediaAccess('microphone');
    if (!granted) return false;
  } else if (status.microphone !== 'granted') {
    openPermissionSettings('microphone');
    return false;
  }

  // Check accessibility
  if (!status.accessibility) {
    // This will prompt if needed
    systemPreferences.isTrustedAccessibilityClient(true);
    openPermissionSettings('accessibility');
    return false;
  }

  return true;
}
```
