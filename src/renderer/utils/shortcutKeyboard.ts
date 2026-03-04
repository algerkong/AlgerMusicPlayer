import { normalizeShortcutAccelerator } from '../../shared/shortcuts';

const modifierOnlyKeys = new Set(['Control', 'Meta', 'Alt', 'Shift']);

const keyAliases: Record<string, string> = {
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  Escape: 'Escape',
  Enter: 'Enter',
  Tab: 'Tab',
  Backspace: 'Backspace',
  Delete: 'Delete',
  Insert: 'Insert',
  Home: 'Home',
  End: 'End',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  ' ': 'Space',
  Spacebar: 'Space',
  MediaPlayPause: 'MediaPlayPause',
  MediaNextTrack: 'MediaNextTrack',
  MediaPreviousTrack: 'MediaPreviousTrack',
  MediaStop: 'MediaStop'
};

function resolveMainKey(event: KeyboardEvent): string | null {
  if (event.isComposing || modifierOnlyKeys.has(event.key)) {
    return null;
  }

  const { code, key } = event;

  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }

  if (/^Digit[0-9]$/.test(code)) {
    return code.slice(5);
  }

  if (/^Numpad[0-9]$/.test(code)) {
    return code.slice(6);
  }

  if (/^F([1-9]|1\d|2[0-4])$/.test(code)) {
    return code;
  }

  if (code === 'NumpadAdd') {
    return 'Plus';
  }

  if (code === 'NumpadSubtract' || code === 'Minus') {
    return 'Minus';
  }

  if (code === 'Equal' && event.shiftKey) {
    return 'Plus';
  }

  if (key === '+' || key === '=') {
    return 'Plus';
  }

  if (key === '-' || key === '_') {
    return 'Minus';
  }

  if (keyAliases[key]) {
    return keyAliases[key];
  }

  if (/^[A-Za-z0-9]$/.test(key)) {
    return key.toUpperCase();
  }

  return null;
}

export function keyboardEventToAccelerator(event: KeyboardEvent): string | null {
  const mainKey = resolveMainKey(event);
  if (!mainKey) {
    return null;
  }

  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('CommandOrControl');
  }
  if (event.altKey) {
    parts.push('Alt');
  }
  if (event.shiftKey) {
    parts.push('Shift');
  }

  return normalizeShortcutAccelerator([...parts, mainKey].join('+'));
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }

  return Boolean(target.closest('[contenteditable="true"]'));
}
