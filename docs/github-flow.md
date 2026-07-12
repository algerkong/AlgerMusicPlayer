# GitHub Flow 操作速查

完整原则与禁止项见根目录 [AGENTS.md](../AGENTS.md)。本文只放日常命令清单。

## 一天标准路径

```bash
# 0. 同步主分支
git checkout main
git pull origin main

# 1. 为当前任务新开分支（可同时存在多个本地分支）
git checkout -b feat/my-feature

# 2. 开发 + 小步提交
git add -A
git commit -m "feat(scope): describe the change"

# 3. 推送并开 PR（越早越好，可用 Draft）
git push -u origin HEAD
# gh pr create --fill   # 若已安装 GitHub CLI

# 4. CI 绿、自测过、审查通过后合并
# 在 GitHub 上 Merge / Squash merge

# 5. 收尾
git checkout main
git pull origin main
git branch -d feat/my-feature
git push origin --delete feat/my-feature   # 若远程未自动删
```

## 并行多任务

```bash
git checkout main && git pull
git checkout -b fix/player-pause
# ... 修 bug 的提交 ...

git checkout main
git checkout -b docs/update-agents
# ... 只改文档 ...

# 两个分支互不影响；各自开 PR，各自合并
```

## 长时间分支对齐 main

```bash
git fetch origin
git rebase origin/main
# 解决冲突后：
git push --force-with-lease
```

仅对**你自己的、无人基于其上继续开发的**功能分支使用 force-with-lease。不要 force-push `main`。

## 分支名前缀

`feat/` · `fix/` · `refactor/` · `chore/` · `docs/` · `ci/` · `perf/` · `style/`

## 合并前自检

```bash
npm run lint
npm run build          # 生成 auto-import d.ts 后再 typecheck 更稳
npm run typecheck
```

PR 标题示例：`feat(search): default songs on empty query`
