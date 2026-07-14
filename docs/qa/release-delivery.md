# Windows 安装版交付说明（2026-07-10）

## 1. 交付目标

本次交付的目标不是只证明“能构建”，而是证明 **Windows 安装版** 的关键使用链路已经在最终运行体上完成验证，包括：

1. 主题切换可用
2. 搜索后可直接播放
3. 下载后的常见后续动作可用
4. 本地音乐维护可用
5. 本地音乐健康修复可用
6. 游客态 → 登录页 → 设置页链路可用
7. “自动获取 Cookie” 的等待状态可观测，不再表现为假死
8. 真实扫码登录闭环已成功完成，并能进入 `/user` 与设置页

---

## 2. 本次最终验收结论

### 总体结论

- 安装版整套回归：**通过**
- 自动获取 Cookie 等待态可观测：**通过**
- 真实登录闭环：**通过**

### 最终判定

截至 **2026-07-10**，本次 Windows 安装版已具备交付所需的关键闭环证据：

- 安装版关键主链路可用
- 自动 Cookie 登录过程不再表现为“点了没反应/假死”
- 真实 Cookie 登录成功后，应用能进入用户态并继续打开设置页

---

## 3. 本次使用的安装版运行体

- EXE 路径：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\installer-smoke-x64-latest\AMPL Music.exe
```

---

## 4. 已执行并通过的验证命令

在工作树：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system
```

下，已完成以下验证：

### 静态检查

```bash
npx eslint src/renderer/components/login/CookieLogin.vue
npm run typecheck
node --check scripts/qa/smoke-installed-real-login-closure.mjs
npx eslint scripts/qa/smoke-installed-real-login-closure.mjs
node --check scripts/qa/smoke-installed-auto-cookie-window.mjs
npx eslint scripts/qa/smoke-installed-auto-cookie-window.mjs
```

### 构建与安装版同步

```bash
npm run build:unpack
robocopy dist\win-unpacked .tmp\installer-smoke-x64-latest /MIR
```

### 安装版 smoke

```bash
npm run qa:installed:auto-cookie
npm run qa:release:installed
npm run qa:installed:real-login
```

---

## 5. 核心验收产物

### 5.1 安装版整套回归

产物：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\installed-release-smoke-suite.json
```

核心结论：

- `pass = true`
- 共 7 项，全部 `ok = true`

通过项：

1. `theme-preset`
2. `search-playback`
3. `download-postactions`
4. `local-music-maintenance`
5. `local-music-health-repair`
6. `account-journey`
7. `auto-cookie-window`

说明：

- 这份汇总 JSON 的顶层键是 `results`，不是 `summary`

---

### 5.2 自动获取 Cookie 等待态验收

产物：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-auto-cookie-window.json
```

关键字段：

- `pass = true`
- `loginReady = true`
- `cookieTabClicked = true`
- `cookieTabOpened = true`
- `autoButtonClicked = true`
- `status.state = "opened"`
- `waitIndicator.observed = true`

关键含义：

1. 点击“自动获取 Cookie”后，登录窗口确实被拉起
2. 页面内状态文案能持续显示等待态
3. 当前等待态文案已包含递增秒数，例如：

```text
登录窗口已打开，请在新窗口完成登录。 · 1s
```

这说明流程仍在推进，用户不再只能看到静止状态，从体验上显著降低“假死/卡死”的误判概率。

---

### 5.3 真实登录闭环验收

主产物：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure.json
```

进度产物：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure-progress.json
```

截图产物：

```text
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure-user-page.png
D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure-settings.png
```

关键字段：

- `pass = true`
- `reason = "authenticated"`
- `loginReady = true`
- `cookieTabClicked = true`
- `cookieTabOpened = true`
- `autoButtonClicked = true`
- `settingsOpened = true`

认证成功后的关键状态：

- `authenticated.state.hash = "#/user"`
- `authenticated.state.storedLogin.isLoggedIn = true`
- `authenticated.state.storedLogin.loginType = "cookie"`
- `authenticated.state.storedLogin.userId = 8712111343`
- `authenticated.state.currentMenu = ["用户"]`

时间线中的关键跃迁：

1. 登录窗口已打开，等待用户完成真实扫码
2. 检测到 Cookie
3. 登录状态切换为 `success`
4. 路由进入 `#/user`
5. 设置页继续可打开

这已经构成“真实登录成功闭环”的交付证据。

---

## 6. 本次交付覆盖的用户可见问题

### 6.1 自动获取 Cookie 的“假死感”

本次已验证：

- 点击按钮后有明确状态反馈
- 状态会进入 `opening` / `opened`
- 在等待用户外部扫码时，状态文案继续显示秒数

因此当前行为不再是“点击后无反馈”，而是“有持续等待反馈的外部登录流程”。

### 6.2 真实登录后是否真的进入用户态

本次已验证：

- 登录成功后 `storedLogin.isLoggedIn = true`
- `loginType = cookie`
- `userId` 已写入
- 路由进入 `#/user`
- 左侧菜单已落在“用户”
- 设置页可继续打开

因此不是“只拿到 Cookie 但应用内没切态”，而是完整进入了用户态。

---

## 7. 注意事项

1. `user-page.png` 中用户页视觉上仍可能处于骨架态或资料未完全展开，但这 **不影响登录闭环成立**。当前闭环判定依据是：
   - 登录状态已落库
   - 路由已进入 `#/user`
   - 用户态菜单已切换
   - 设置页可继续访问

2. 若后续还要增强“视觉完成度”，可以再补一轮：
   - 等待用户页核心资料加载完成后再截图
   - 但这属于增强项，不是当前交付门槛

3. 当前仓库存在大量既有未清理改动；本次文档仅用于交付收尾与验收沉淀，**不代表已整理 commit**。

---

## 8. 建议的交付使用方式

对内验收时，优先查看以下文件：

1. 总回归结果  
   `D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\installed-release-smoke-suite.json`

2. 自动 Cookie 等待态结果  
   `D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-auto-cookie-window.json`

3. 真实登录闭环结果  
   `D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure.json`

4. 真实登录后的页面截图  
   `D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure-user-page.png`  
   `D:\guany\Documents\My_CodeHub\AMPL\.worktrees\ampl-immersive-theme-system\.tmp\smoke-installed-real-login-closure-settings.png`

---

## 9. 当前收尾状态

本轮已完成：

- 安装版主链路验收沉淀
- 自动 Cookie 等待态验收沉淀
- 真实登录闭环验收沉淀
- 交付说明文档补齐

本轮未做：

- 未整理 commit
- 未 push
- 未清理仓库中与本轮无关的历史脏改动

