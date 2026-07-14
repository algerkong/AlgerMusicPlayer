# 组件规范

> 模式来自 `src/renderer/components/` 与 `views/` 实码。

---

## 默认约定

1. **Composition API + `<script setup lang="ts">`**
2. **UI 方向：shadcn-vue 优先**。新组件、控件、对话框用 `components/ui/` + Tailwind + `cn()`
3. **naive-ui 为遗留**。旧页仍有 `n-*`（ConfigProvider、Message、Empty、Drawer 等）。大改时优先迁到 shadcn；禁止新增 naive 入口
4. 样式：优先 Tailwind；scoped SCSS 补工具类难表达的局部规则
5. 图标：新界面 Lucide；旧界面常见 Remix（`ri-*`）
6. 文案：`useI18n()` + `t('…')`（产品固定 zh-CN）
7. 注释：中文、专业、不复述代码（见 [quality-guidelines.md](./quality-guidelines.md)）

---

## 典型 SFC 结构

```vue
<template>
  <!-- 结构 -->
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import SongItem from '@/components/common/SongItem.vue';

defineOptions({ name: 'History' });

// props / emits / store / 处理函数
</script>

<style lang="scss" scoped>
/* 可选 */
</style>
```

参考：`views/history/index.vue`。

---

## Props / Emits

### 优先类型化

```ts
const props = defineProps<{
  item: SongResult;
  selectable?: boolean;
  selected?: boolean;
}>();

const emits = defineEmits(['play', 'select', 'remove-song']);
```

### 默认值

```ts
const props = withDefaults(
  defineProps<{
    item: SongResult;
    mini?: boolean;
  }>(),
  { mini: false }
);
```

旧文件可能用 options 式 `defineProps({ size: { type: String, default: '26px' } })`；新代码用类型化 props。

---

## 组合优于巨型 SFC

| 模式             | 做法                                                           |
| ---------------- | -------------------------------------------------------------- |
| 列表行共享行为   | `hooks/useSongItem.ts`                                         |
| 同 API、不同外观 | 门面 `SongItem.vue` 选 Mini / List / Compact / Home / Standard |
| 插槽基座         | `BaseSongItem.vue` + `defineExpose`                            |

强调色 / hover：用 `text-primary`、`var(--primary-color)` 或封面 token，勿写死 `green-500`。

---

## UI 库选择

| 场景                               | 选择                                               |
| ---------------------------------- | -------------------------------------------------- |
| 新表单控件、对话框、开关、滚动区域 | shadcn-vue（如 `ScrollArea`）                      |
| 已有 naive 页小改                  | 可暂留 `n-*`，避免再引入新 naive 组件类型          |
| 全局 Message / Dialog              | 现状仍常走 naive provider；新系统级 UI 评估 shadcn |

大屏抽屉：`MusicFull` 仍用 `n-drawer`（业务未迁完）；动画 class `music-full-drawer` 在 `index.css`。

---

## 布局与壳层

- 桌面壳：`layout/AppLayout.vue`（TitleBar、搜索、侧栏、PlayBar）
- 封面 chrome：`coverChrome` 写到 `html`，teleport 弹层可继承
- 底栏 z-index 高于大屏抽屉，便于展开时底栏先压在上面再下滑

---

## IPC

渲染进程 **禁止** 直接 `ipcRenderer.invoke(任意 channel)`。只通过 `window.api`（preload 白名单）。

---

## 自检

- [ ] 新 UI 未新增 naive 依赖面
- [ ] 列表行复用 SongItem / useSongItem
- [ ] 用户可见字符串走 i18n
- [ ] 样式未硬编码品牌绿（用 primary / 封面色）
- [ ] 注释符合 quality-guidelines

**文档语言**：中文。
