# 共享约定（部分模板 · 慎用）

> 原为通用 Electron 模板。**与本仓库冲突时以实码与前端权威指南为准。**

## 可参考

| 文件                                       | 说明                                        |
| ------------------------------------------ | ------------------------------------------- |
| [git-conventions.md](./git-conventions.md) | 提交类型；分支习惯另见 `DEV.md` 小改线      |
| [typescript.md](./typescript.md)           | 通用 TS 习惯；严格度以本仓库 tsconfig 为准  |
| [code-quality.md](./code-quality.md)       | 通用质量条目；组件/注释规范以 frontend 为准 |

## 勿照抄

| 文件                                               | 原因                                                 |
| -------------------------------------------------- | ---------------------------------------------------- |
| [timestamp.md](./timestamp.md)                     | 面向 Drizzle `timestamp_ms`，本项目无该 ORM 层       |
| [pnpm-electron-setup.md](./pnpm-electron-setup.md) | 本仓库用 npm + electron-vite，以 `package.json` 为准 |

## 项目规范入口

- [../frontend/index.md](../frontend/index.md)
- [DEV.md](../../../DEV.md)
- [../README.md](../README.md)
