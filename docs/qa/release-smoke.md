# Windows 安装版交付回归

## 目标

在发布前，用最终用户视角确认 Windows 安装版的关键链路可用，而不是只依赖单元测试或构建成功。

当前安装版回归关注：

1. 主题切换
2. 搜索后直接播放
3. 下载后的常见后续动作
4. 本地音乐维护
5. 本地音乐健康修复
6. 游客态账号 / 登录 / 设置链
7. 自动获取 Cookie 窗口状态可观测性

---

## 本轮交付说明入口

如果你要查看 **2026-07-10 这轮已经实际跑通的安装版交付结论**，请直接看：

- `docs/qa/release-delivery.md`

这份文档用于沉淀：

- 本轮交付范围
- 已通过的验证命令
- 关键证据文件路径
- 自动获取 Cookie 等待态结论
- 真实登录闭环结论

本文件 `release-smoke.md` 继续作为“如何运行 / 如何验收 / 通过标准是什么”的说明。

---

## 运行前置

先准备安装版运行体，默认路径为：

`./.tmp/installer-smoke-x64-latest/AMPL Music.exe`

如果没有这个安装版运行体，先完成以下任一动作：

1. 先构建并生成安装包 / 解包产物
2. 将安装包静默安装到 `./.tmp/installer-smoke-x64-latest`
3. 或手动指定环境变量 `AMPL_EXE_PATH`

---

## 一键运行

```bash
npm run qa:release:installed
```

如需指定 exe：

```bash
set AMPL_EXE_PATH=D:\path\to\AMPL Music.exe
npm run qa:release:installed
```

---

## 输出物

主汇总：

- `./.tmp/installed-release-smoke-suite.json`

子项产物：

- `./.tmp/suite-installed-theme-preset.json`
- `./.tmp/suite-installed-search-playback.json`
- `./.tmp/suite-installed-download-postactions.json`
- `./.tmp/suite-installed-local-music-maintenance.json`
- `./.tmp/suite-installed-local-music-health-repair.json`
- `./.tmp/suite-installed-account-journey.json`
- `./.tmp/suite-installed-auto-cookie-window.json`

每项都会生成对应 PNG，用于交付前视觉抽查。

---

## 当前验收标准

### 1. 主题切换

- 能从 `Dark Cinema` 切到 `Galaxy Dream`
- 强调色同步切到目标主题值

### 2. 搜索播放

- 搜索结果页正常打开
- 点击首条歌曲后，底部播放栏标题切到该歌曲
- 播放主按钮进入暂停态
- 首条歌曲的行内播放按钮也切到暂停态

### 3. 下载后续动作

- 可发起下载
- 下载完成后能在下载管理中看到记录
- 可播放已下载内容
- 可清空记录
- 可再次下载并删除单条记录

### 4. 本地音乐维护

- 可扫描样例目录
- 新增文件后重扫结果刷新
- 文件夹管理抽屉可打开
- 删除目录后持久化 `folderPaths` 归零

### 5. 本地音乐健康修复

- 缺失目录可触发健康修复
- 修复后歌曲数归零
- 缺失目录可被移除

### 6. 账号链

- 游客态访问 `/user` 会跳到 `/login`
- `Cookie 登录` tab 可打开
- `先不登录，直接体验` 可回首页
- 设置页可打开
- 设置页顶部 `登录` CTA 可回登录页
- 设置页 `设置Cookie` 弹窗可打开

### 7. 自动获取 Cookie 窗口状态

- `自动获取 Cookie` 按钮点击后，页面会出现可见状态提示
- 状态提示至少能推进到 `打开中 / 已打开 / 已聚焦已有窗口`
- 若停留在 `已打开 / 已聚焦已有窗口`，状态文案应继续显示等待秒数，证明流程仍在活跃推进
- 允许同时采集外部登录窗口 target 作为辅助证据，但 **不再把“第二个 target 必须出现”作为唯一通过条件**
- 该条默认只验证“窗口状态可观测”，**不等同于真实登录成功**

---

## 单独账号链运行

```bash
npm run qa:installed:account
```

输出：

- `./.tmp/smoke-installed-account-journey.json`

---

## 单独运行自动获取 Cookie 窗口状态 smoke

```bash
npm run qa:installed:auto-cookie
```

输出：

- `./.tmp/smoke-installed-auto-cookie-window.json`

用途：

- 验证 `自动获取 Cookie` 按钮点击后，渲染层能收到主进程回传的窗口状态
- 若登录仍在等待，额外验证状态文案会持续显示等待秒数，降低“假死”感
- 允许同时采集外部登录窗口 target 作为辅助证据，但 **不再把“第二个 target 必须出现”作为唯一主断言**
- 更适合排查“假死 / 没反应 / 不知道窗口到底有没有拉起”的问题

---

## 人工辅助运行真实登录成功闭环 smoke

```bash
npm run qa:installed:real-login
```

可选超时（默认 180 秒）：

```powershell
$env:AMPL_REAL_LOGIN_TIMEOUT_MS = '240000'
npm run qa:installed:real-login
```

```cmd
set AMPL_REAL_LOGIN_TIMEOUT_MS=240000
npm run qa:installed:real-login
```

输出：

- `./.tmp/smoke-installed-real-login-closure.json`
- `./.tmp/smoke-installed-real-login-closure-progress.json`
- `./.tmp/smoke-installed-real-login-closure-window-opened.png`
- 成功时：`./.tmp/smoke-installed-real-login-closure-user-page.png`
- 成功时：`./.tmp/smoke-installed-real-login-closure-settings.png`
- 超时 / 失败时：`./.tmp/smoke-installed-real-login-closure-final-state.png`

用途：

- 复用 `自动获取 Cookie` 路径，拉起外部网易云登录窗口
- 由人工在外部窗口完成一次真实登录（建议扫码）
- 自动采集登录前置状态、认证成功时间线；成功时采集 `/user` 与设置页截图，失败时保留最终停留画面
- 等待期间会持续刷新 `*-progress.json` 并输出阶段日志，便于判断是“还在等扫码”还是“真的卡住”
- 用于补齐“真实登录成功闭环”和“非游客态能力状态”的交付证据

---

## 说明

当前这套回归可以证明：

- 安装版主路径可用
- 游客态体验和设置维护入口完整

但它**还不能替代一次真实登录成功闭环**。  
如果发布前要把“登录能力”也作为最终交付门槛，仍需额外完成一次真实账号验证。
