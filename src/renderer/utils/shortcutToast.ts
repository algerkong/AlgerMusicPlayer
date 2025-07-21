import { createVNode, render } from 'vue';

import ShortcutToast from '@/components/ShortcutToast.vue';

let container: HTMLDivElement | null = null;
let toastInstance: any = null;

interface ToastOptions {
  position?: 'top' | 'center' | 'bottom';
  showIcon?: boolean;
}

export function showShortcutToast(message: string, iconName = '', options: ToastOptions = {}) {
  // 如果容器不存在，创建一个新的容器
  if (!container) {
    container = document.createElement('div');
    document.body.appendChild(container);
  }

  // 如果已经有实例，先销毁它
  if (toastInstance) {
    render(null, container);
    toastInstance = null;
  }

  // 创建新的 toast 实例
  const vnode = createVNode(ShortcutToast, {
    position: options.position || 'center',
    showIcon: options.showIcon !== undefined ? options.showIcon : true,
    onDestroy: () => {
      if (container) {
        render(null, container);
        document.body.removeChild(container);
        container = null;
      }
    }
  });

  // 渲染 toast
  render(vnode, container);
  toastInstance = vnode.component?.exposed;

  // 显示 toast
  if (toastInstance) {
    toastInstance.show(message, iconName, { showIcon: options.showIcon });
  }
}

// 新增便捷方法 - 底部无图标 toast
export function showBottomToast(message: string) {
  showShortcutToast(message, '', { position: 'bottom', showIcon: false });
}
