import { createVNode, render, VNode } from 'vue';

import Loading from './index.vue';

const vnode: VNode = createVNode(Loading) as VNode;

export const vLoading = {
  // 在绑定元素的父组件 及他自己的所有子节点都挂载完成后调用
  mounted: (el: HTMLElement) => {
    render(vnode, el);
  },
  // 在绑定元素的父组件 及他自己的所有子节点都更新后调用
  updated: (el: HTMLElement, binding: any) => {
    if (binding.value) {
      vnode?.component?.exposed?.show();
    } else {
      vnode?.component?.exposed?.hide();
    }
    // 动态添加删除自定义class: loading-parent
    formatterClass(el, binding);
  },
  // 绑定元素的父组件卸载后调用
  unmounted: () => {
    vnode?.component?.exposed?.hide();
  }
};

function formatterClass(el: HTMLElement, binding: any) {
  const classStr = el.getAttribute('class');
  const tagetClass: number = classStr?.indexOf('loading-parent') as number;
  if (binding.value) {
    if (tagetClass === -1) {
      el.setAttribute('class', `${classStr} loading-parent`);
    }
  } else if (tagetClass > -1) {
    const classArray: Array<string> = classStr?.split('') as string[];
    classArray.splice(tagetClass - 1, tagetClass + 15);
    el.setAttribute('class', classArray?.join(''));
  }
}
