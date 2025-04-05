import { isElectron } from '.';
import { handleShortcutAction } from './appShortcuts';

export function initShortcut() {
  if (isElectron) {
    window.electron.ipcRenderer.on('global-shortcut', async (_, action: string) => {
      handleShortcutAction(action);
    });
  }
}
