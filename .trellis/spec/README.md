# 开发规范索引

> **本仓库真相源**：`DEV.md` + 下方「前端权威指南」。  
> 其它目录若标为过时，**勿当作 LYMusicPlayer 实现依据**。

## 前端（权威）

入口：[frontend/index.md](./frontend/index.md)

| 文档                                                          | 内容             |
| ------------------------------------------------------------- | ---------------- |
| [directory-structure.md](./frontend/directory-structure.md)   | 目录与命名       |
| [component-guidelines.md](./frontend/component-guidelines.md) | 组件 / UI 库     |
| [hook-guidelines.md](./frontend/hook-guidelines.md)           | 组合式函数       |
| [state-management.md](./frontend/state-management.md)         | Pinia / services |
| [type-safety.md](./frontend/type-safety.md)                   | 类型与 Track     |
| [quality-guidelines.md](./frontend/quality-guidelines.md)     | lint、注释、提交 |

人读总览：[DEV.md](../../DEV.md)

## 本仓库实际技术栈

- **渲染**：Vue 3、TypeScript、Pinia、Tailwind、shadcn-vue（naive-ui 遗留）
- **主进程**：Electron、electron-store、本地下载 / 缓存 / 音源 IPC（`ly-music-source`）
- **本地数据**：electron-store、localStorage、IndexedDB（**不是** Drizzle / SQLite 应用层）
- **构建**：electron-vite、electron-builder

## 过时 / 模板区（勿照抄）

| 目录                             | 说明                                                 |
| -------------------------------- | ---------------------------------------------------- |
| [backend/](./backend/)           | Trellis 通用 Electron+Drizzle 模板，**非本项目结构** |
| [big-question/](./big-question/) | 通用踩坑文，含 React/Drizzle 示例，仅作参考          |
| [guides/](./guides/)             | 通用思考清单模板，未按本仓库重写                     |
| [shared/](./shared/)             | 部分条目仍为模板约定，与代码冲突时以代码为准         |

前端旧脚手架 md（`components.md`、`hooks.md`、`react-pitfalls.md` 等）**已删除**，勿再引用。

## 用法

1. 写前端 / 壳层 UI → 只看 **前端权威六份 + DEV.md**
2. 主进程改动 → 以 `src/main/` 实码为准，不要跟 backend 模板目录结构走
3. 代码评审 → quality-guidelines 检查清单

**文档语言**：中文。
