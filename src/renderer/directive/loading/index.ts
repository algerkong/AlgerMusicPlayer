import { createVNode, render, VNode } from 'vue';

import Loading from './index.vue';

// 每个使用 v-loading 的元素独立持有一个 Loading 实例，
// 避免此前"模块级单例 vnode"导致的多个 v-loading 争用同一实例、
// spinner 只出现在最后挂载元素上的问题。
const instanceMap = new WeakMap<HTMLElement, VNode>();

const setLoading = (el: HTMLElement, visible: boolean) => {
  const vnode = instanceMap.get(el);
  if (visible) {
    vnode?.component?.exposed?.show();
  } else {
    vnode?.component?.exposed?.hide();
  }
};

export const vLoading = {
  // 在绑定元素的父组件及他自己的所有子节点都挂载完成后调用
  mounted: (el: HTMLElement, binding: any) => {
    const vnode = createVNode(Loading);
    render(vnode, el);
    instanceMap.set(el, vnode);
    setLoading(el, !!binding.value);
    formatterClass(el, binding);
  },
  // 在绑定元素的父组件及他自己的所有子节点都更新后调用
  updated: (el: HTMLElement, binding: any) => {
    setLoading(el, !!binding.value);
    // 动态添加删除自定义class: loading-parent
    formatterClass(el, binding);
  },
  // 绑定元素的父组件卸载后调用：真正卸载组件实例，释放资源
  unmounted: (el: HTMLElement) => {
    render(null, el);
    instanceMap.delete(el);
  }
};

function formatterClass(el: HTMLElement, binding: any) {
  if (binding.value) {
    el.classList.add('loading-parent');
  } else {
    el.classList.remove('loading-parent');
  }
}
