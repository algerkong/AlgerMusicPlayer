export const shortcutActionOrder = [
  'togglePlay',
  'prevPlay',
  'nextPlay',
  'volumeUp',
  'volumeDown',
  'toggleFavorite',
  'toggleWindow'
] as const;

export type ShortcutAction = (typeof shortcutActionOrder)[number];
export type ShortcutScope = 'global' | 'app';

export type ShortcutConfig = {
  key: string;
  enabled: boolean;
  scope: ShortcutScope;
};

export type ShortcutsConfig = Record<ShortcutAction, ShortcutConfig>;

export type ShortcutPlatform = 'darwin' | 'win32' | 'linux' | 'web';

export type ShortcutConflict = {
  key: string;
  scope: ShortcutScope;
  actions: ShortcutAction[];
};

type ShortcutModifier = 'CommandOrControl' | 'Alt' | 'Shift';

const shortcutModifierOrder: ShortcutModifier[] = ['CommandOrControl', 'Alt', 'Shift'];

const shortcutScopeDefaults: Record<ShortcutAction, ShortcutScope> = {
  togglePlay: 'global',
  prevPlay: 'global',
  nextPlay: 'global',
  volumeUp: 'app',
  volumeDown: 'app',
  toggleFavorite: 'app',
  toggleWindow: 'global'
};

const shortcutKeyDefaults: Record<ShortcutAction, string> = {
  togglePlay: 'CommandOrControl+Alt+P',
  prevPlay: 'CommandOrControl+Alt+Left',
  nextPlay: 'CommandOrControl+Alt+Right',
  volumeUp: 'CommandOrControl+Alt+Up',
  volumeDown: 'CommandOrControl+Alt+Down',
  toggleFavorite: 'CommandOrControl+Alt+L',
  toggleWindow: 'CommandOrControl+Alt+Shift+M'
};

const modifierAliases: Record<string, ShortcutModifier> = {
  commandorcontrol: 'CommandOrControl',
  cmdorctrl: 'CommandOrControl',
  cmd: 'CommandOrControl',
  command: 'CommandOrControl',
  control: 'CommandOrControl',
  ctrl: 'CommandOrControl',
  meta: 'CommandOrControl',
  super: 'CommandOrControl',
  win: 'CommandOrControl',
  windows: 'CommandOrControl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift'
};

const namedKeyAliases: Record<string, string> = {
  left: 'Left',
  arrowleft: 'Left',
  right: 'Right',
  arrowright: 'Right',
  up: 'Up',
  arrowup: 'Up',
  down: 'Down',
  arrowdown: 'Down',
  esc: 'Escape',
  escape: 'Escape',
  enter: 'Enter',
  return: 'Enter',
  tab: 'Tab',
  space: 'Space',
  spacebar: 'Space',
  ' ': 'Space',
  backspace: 'Backspace',
  delete: 'Delete',
  del: 'Delete',
  insert: 'Insert',
  ins: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  plus: 'Plus',
  '+': 'Plus',
  equal: 'Plus',
  '=': 'Plus',
  minus: 'Minus',
  '-': 'Minus',
  mediaplaypause: 'MediaPlayPause',
  mediaplay: 'MediaPlayPause',
  medianexttrack: 'MediaNextTrack',
  mediaprevioustrack: 'MediaPreviousTrack',
  mediastop: 'MediaStop'
};

const allowedNamedKeys = new Set([
  'Left',
  'Right',
  'Up',
  'Down',
  'Escape',
  'Enter',
  'Tab',
  'Space',
  'Backspace',
  'Delete',
  'Insert',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Plus',
  'Minus',
  'MediaPlayPause',
  'MediaNextTrack',
  'MediaPreviousTrack',
  'MediaStop'
]);

const functionKeyRegExp = /^F([1-9]|1\d|2[0-4])$/i;

const shortcutActionGroups: Record<'playback' | 'sound' | 'window', ShortcutAction[]> = {
  playback: ['togglePlay', 'prevPlay', 'nextPlay'],
  sound: ['volumeUp', 'volumeDown', 'toggleFavorite'],
  window: ['toggleWindow']
};

export const shortcutGroups = shortcutActionGroups;

const sharedReservedAccelerators = ['CommandOrControl+Shift+I', 'F5'];

const platformReservedAccelerators: Record<Exclude<ShortcutPlatform, 'web'>, string[]> = {
  darwin: ['CommandOrControl+Q', 'CommandOrControl+W', 'CommandOrControl+H'],
  win32: ['Alt+F4'],
  linux: ['Alt+F4']
};

function normalizeModifierToken(token: string): ShortcutModifier | null {
  return modifierAliases[token.trim().toLowerCase()] ?? null;
}

function normalizeKeyToken(token: string): string | null {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    return null;
  }

  if (normalizedToken.length === 1 && /[A-Za-z0-9]/.test(normalizedToken)) {
    return normalizedToken.toUpperCase();
  }

  const functionKeyMatch = normalizedToken.match(functionKeyRegExp);
  if (functionKeyMatch) {
    return `F${functionKeyMatch[1]}`;
  }

  const aliasKey = namedKeyAliases[normalizedToken.toLowerCase()];
  if (aliasKey) {
    return aliasKey;
  }

  if (allowedNamedKeys.has(normalizedToken)) {
    return normalizedToken;
  }

  return null;
}

function createDefaultShortcutConfig(action: ShortcutAction): ShortcutConfig {
  return {
    key: shortcutKeyDefaults[action],
    enabled: true,
    scope: shortcutScopeDefaults[action]
  };
}

export function createDefaultShortcuts(): ShortcutsConfig {
  return shortcutActionOrder.reduce((result, action) => {
    result[action] = createDefaultShortcutConfig(action);
    return result;
  }, {} as ShortcutsConfig);
}

export const defaultShortcuts = createDefaultShortcuts();

export function normalizeShortcutAccelerator(raw: string): string | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }

  const segments = raw
    .split('+')
    .map((item) => item.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const modifiers = new Set<ShortcutModifier>();
  let mainKey: string | null = null;

  for (const segment of segments) {
    const modifier = normalizeModifierToken(segment);
    if (modifier) {
      modifiers.add(modifier);
      continue;
    }

    const normalizedKey = normalizeKeyToken(segment);
    if (!normalizedKey || mainKey) {
      return null;
    }
    mainKey = normalizedKey;
  }

  if (!mainKey) {
    return null;
  }

  const orderedModifiers = shortcutModifierOrder.filter((modifier) => modifiers.has(modifier));
  return [...orderedModifiers, mainKey].join('+');
}

function normalizeShortcutScope(scope: unknown, action: ShortcutAction): ShortcutScope {
  return scope === 'global' || scope === 'app' ? scope : shortcutScopeDefaults[action];
}

function normalizeShortcutConfig(action: ShortcutAction, value: unknown): ShortcutConfig {
  if (typeof value === 'string') {
    const normalizedKey = normalizeShortcutAccelerator(value);
    return {
      key: normalizedKey ?? shortcutKeyDefaults[action],
      enabled: true,
      scope: shortcutScopeDefaults[action]
    };
  }

  if (!value || typeof value !== 'object') {
    return createDefaultShortcutConfig(action);
  }

  const config = value as Partial<ShortcutConfig>;
  const normalizedKey = normalizeShortcutAccelerator(config.key ?? '');

  return {
    key: normalizedKey ?? shortcutKeyDefaults[action],
    enabled: config.enabled !== false,
    scope: normalizeShortcutScope(config.scope, action)
  };
}

export function normalizeShortcutsConfig(input: unknown): ShortcutsConfig {
  const result = createDefaultShortcuts();

  if (!input || typeof input !== 'object') {
    return result;
  }

  const rawConfig = input as Record<string, unknown>;

  shortcutActionOrder.forEach((action) => {
    result[action] = normalizeShortcutConfig(action, rawConfig[action]);
  });

  return result;
}

export function getShortcutConflicts(shortcuts: ShortcutsConfig): ShortcutConflict[] {
  const shortcutBuckets = new Map<string, ShortcutAction[]>();

  shortcutActionOrder.forEach((action) => {
    const config = shortcuts[action];
    if (!config.enabled) {
      return;
    }

    const normalizedKey = normalizeShortcutAccelerator(config.key);
    if (!normalizedKey) {
      return;
    }

    const bucketKey = `${config.scope}::${normalizedKey}`;
    const actions = shortcutBuckets.get(bucketKey) ?? [];
    actions.push(action);
    shortcutBuckets.set(bucketKey, actions);
  });

  const conflicts: ShortcutConflict[] = [];

  shortcutBuckets.forEach((actions, key) => {
    if (actions.length < 2) {
      return;
    }

    const [scope, accelerator] = key.split('::') as [ShortcutScope, string];
    conflicts.push({
      key: accelerator,
      scope,
      actions
    });
  });

  return conflicts;
}

export function getReservedAccelerators(platform: ShortcutPlatform): string[] {
  if (platform === 'web') {
    return [...sharedReservedAccelerators];
  }

  return [...sharedReservedAccelerators, ...platformReservedAccelerators[platform]];
}

export function formatShortcutForDisplay(shortcut: string, platform: ShortcutPlatform): string {
  const accelerator = normalizeShortcutAccelerator(shortcut) ?? shortcut;
  const isMac = platform === 'darwin';

  return accelerator
    .split('+')
    .map((segment) => {
      if (segment === 'CommandOrControl') {
        return isMac ? 'Cmd' : 'Ctrl';
      }
      if (segment === 'Alt') {
        return isMac ? 'Option' : 'Alt';
      }
      if (segment === 'Shift') {
        return 'Shift';
      }
      if (segment === 'Plus') {
        return '+';
      }
      if (segment === 'Minus') {
        return '-';
      }
      return segment;
    })
    .join(' + ');
}

export function hasShortcutAction(action: string): action is ShortcutAction {
  return shortcutActionOrder.includes(action as ShortcutAction);
}

export function isModifierOnlyShortcut(shortcut: string): boolean {
  const normalized = normalizeShortcutAccelerator(shortcut);
  if (!normalized) {
    return true;
  }

  const segments = normalized.split('+');
  const mainKey = segments[segments.length - 1];
  return shortcutModifierOrder.includes(mainKey as ShortcutModifier);
}
