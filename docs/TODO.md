# 待办 / 技术债

> 审查 10 条已全部落地或具备可执行闭环。以下仅保留**仍依赖外部条件**的发布项。

## 需外部条件

### mac 正式签名与公证

- **配置已就绪：** `hardenedRuntime: true`；CI 在存在 `CSC_LINK` 等 secrets 时开启签名环境变量。
- **仍需你方提供：** Apple 开发者证书（`CSC_LINK` / `CSC_KEY_PASSWORD`）、`APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`，并将 `package.json` → `build.mac.notarize` 在具备证书后改为 `true`（或接 afterSign 钩子）。
- **无证书时：** 保持当前 CI `CSC_IDENTITY_AUTO_DISCOVERY` 条件关闭即可本地/CI 出包。
