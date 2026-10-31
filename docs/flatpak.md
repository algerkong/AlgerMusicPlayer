# Flatpak

## 安装和更新

GitHub Releases 提供 `x86_64`（Intel/AMD 64 位）和 `aarch64`（ARM 64 位）安装包。此方式不代表应用已上架 Flathub；Flathub 仅提供运行时。

先根据 [Flatpak 安装指南](https://flatpak.org/setup/) 安装 Flatpak，再添加用户级 Flathub：

```bash
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
```

下载对应架构的 `.flatpak` 文件，将下面的路径替换为下载文件的实际路径：

```bash
flatpak install --user ./AlgerMusicPlayer-版本-linux-架构.flatpak
flatpak run com.alger.music
```

Flatpak 会从 Flathub 获取缺少的运行时。后续更新需下载新版安装包并再次执行 `flatpak install --user`；此安装方式没有应用更新仓库，`flatpak update` 只负责其运行时等已配置仓库中的组件，应用内自动更新也不可用。

应用配置和缓存位于 `~/.var/app/com.alger.music/`，与其他安装方式隔离。卸载应用但保留数据：

```bash
flatpak uninstall --user com.alger.music
```

## 沙箱权限

- 网络：访问音乐服务、本地 API 和远程控制服务。
- X11、共享内存和 GPU：显示主窗口、桌面歌词等窗口；启动器通过 `--ozone-platform=x11` 显式使用 X11。Wayland 会话通过 XWayland 运行，需安装桌面环境的 XWayland 支持。
- PulseAudio：音频播放。
- 音乐目录只读、下载目录读写：扫描本地音乐和保存下载，不直接开放整个主目录。
- D-Bus：系统通知、托盘、文件管理器定位、MPRIS 媒体控制和 GNOME TrayLyric 扩展。

文件选择器使用桌面环境的文件访问门户。若选择自定义目录或移动磁盘后无法扫描其中的音乐，可以只为应用开放该目录（将示例路径替换为实际路径）：

```bash
flatpak override --user --filesystem=/path/to/music:ro com.alger.music
```

若将下载或缓存目录设置在默认可写目录以外，需授予对应目录的读写权限：

```bash
flatpak override --user --filesystem=/path/to/downloads com.alger.music
```

## 本地构建

在目标架构的 Linux 主机上安装 Node.js、npm、`flatpak` 和 `flatpak-builder`。构建沿用项目的 electron-builder 配置，不需要维护单独的二进制下载清单。项目要求 electron-builder 26.18.0 或更新的 26.x 版本，以确保 Flatpak 启动器会传递 `executableArgs`；执行 `npm install` 会安装满足要求的版本。

```bash
flatpak remote-add --user --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo
flatpak install --user --noninteractive -y flathub \
  org.freedesktop.Platform//25.08 \
  org.freedesktop.Sdk//25.08 \
  org.electronjs.Electron2.BaseApp//25.08
npm install
npm run build:flatpak
```

构建结果位于 `dist/`。可显式指定当前主机架构：

```bash
npm run build:flatpak -- --x64
# 在 ARM64 主机上：
npm run build:flatpak -- --arm64
```

Flatpak 构建需要执行目标架构的 SDK，因此不要直接在 x86_64 主机上交叉构建 ARM64 安装包。发布工作流使用独立的原生 x86_64 和 ARM64 runner 构建，并将 `.flatpak` 文件上传到同一 GitHub Release。

`package.json` 的 `build.flatpak.runtimeVersion`、`baseVersion` 和发布工作流中的安装分支应保持一致。升级运行时后，需要重新构建并验证安装、启动、音频播放、本地文件访问、托盘和 MPRIS。Electron 的子进程沙箱由 Electron BaseApp 的 Zypak 启动器处理，不需要添加 `--no-sandbox`。
