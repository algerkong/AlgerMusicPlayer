# AlgerMusicPlayer MCP集成说明

## 🎵 概述

AlgerMusicPlayer现已集成MCP（Model Context Protocol）服务器功能，支持通过Cursor等AI客户端进行语音控制和智能交互。您可以通过自然语言指令控制音乐播放、搜索歌曲、管理播放列表等操作。

## ✨ 主要功能

### 🛠️ MCP工具

1. **search_music** - 搜索音乐
   - 功能：根据关键词搜索相关歌曲
   - 参数：`query` (搜索关键词)

2. **play_music** - 播放音乐
   - 功能：播放指定歌曲，自动搜索并播放第一个结果
   - 参数：`songId` (歌曲ID), `songName` (歌曲名称)

3. **add_to_playlist** - 添加到播放列表
   - 功能：将歌曲添加到当前播放列表
   - 参数：`songId` (歌曲ID)

4. **like_music** - 喜欢音乐
   - 功能：将当前播放的歌曲添加到喜欢列表
   - 参数：`songId` (歌曲ID)

### 🎯 使用示例

通过Cursor AI助手，您可以使用以下自然语言指令：

- "播放江南这首歌"
- "搜索周杰伦的歌曲"
- "把这首歌加到播放列表"
- "我喜欢这首歌"

## 🚀 快速开始

### 1. 启动音乐播放器

```bash
npm run start
```

### 2. 开启MCP服务

1. 打开音乐播放器应用
2. 进入 **设置** 页面
3. 找到 **MCP服务** 开关并开启
4. 确认服务在 `http://localhost:3001` 启动

### 3. 配置Cursor客户端

创建MCP配置文件 `cursor_mcp_config.json`：

```json
{
  "name": "AlgerMusicPlayer",
  "protocol": "sse",
  "url": "http://localhost:3001/sse"
}
```

### 4. 开始使用

在Cursor中发送指令，例如：
```
播放江南这首歌
```

应用程序将自动：
- 跳转到搜索页面
- 搜索"江南"相关歌曲
- 自动播放第一首搜索结果

## 🏗️ 技术架构

### 核心组件

```
┌─────────────────────┐    HTTP/SSE     ┌─────────────────────┐
│   Cursor客户端      │ ──────────────→ │   MCP服务器         │
│                     │                 │ (localhost:3001)    │
└─────────────────────┘                 └─────────────────────┘
                                                   │ IPC
                                                   ▼
┌─────────────────────┐                 ┌─────────────────────┐
│   渲染进程          │ ←─────────────── │   主进程            │
│ (Vue.js界面)        │      事件        │ (Electron主进程)    │
└─────────────────────┘                 └─────────────────────┘
```

### 文件结构

```
src/
├── main/
│   ├── mcp.ts              # MCP服务器实现
│   └── index.ts            # 主进程集成
├── renderer/
│   └── views/
│       ├── home/index.vue  # MCP事件处理
│       ├── set/index.vue   # MCP服务控制
│       └── search/index.vue # 搜索页面自动播放
└── preload/
    └── index.ts            # IPC桥接
```

## 📋 API文档

### MCP工具接口

#### search_music
```typescript
{
  name: "search_music",
  description: "搜索音乐",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "搜索关键词"
      }
    },
    required: ["query"]
  }
}
```

#### play_music
```typescript
{
  name: "play_music", 
  description: "播放音乐",
  inputSchema: {
    type: "object",
    properties: {
      songId: {
        type: "string",
        description: "歌曲ID"
      },
      songName: {
        type: "string", 
        description: "歌曲名称"
      }
    },
    required: ["songId"]
  }
}
```

#### add_to_playlist
```typescript
{
  name: "add_to_playlist",
  description: "添加到播放列表", 
  inputSchema: {
    type: "object",
    properties: {
      songId: {
        type: "string",
        description: "歌曲ID"
      }
    },
    required: ["songId"]
  }
}
```

#### like_music
```typescript
{
  name: "like_music",
  description: "喜欢音乐",
  inputSchema: {
    type: "object", 
    properties: {
      songId: {
        type: "string",
        description: "歌曲ID"
      }
    },
    required: ["songId"]
  }
}
```

## 🔧 开发指南

### 添加新的MCP工具

1. **在MCP服务器中定义工具**（`src/main/mcp.ts`）：
```typescript
{
  name: "your_new_tool",
  description: "工具描述",
  inputSchema: {
    // 定义输入参数
  }
}
```

2. **在主进程中处理工具调用**（`src/main/index.ts`）：
```typescript
case 'your_new_tool':
  // 处理工具逻辑
  break;
```

3. **在渲染进程中实现业务逻辑**（`src/renderer/views/home/index.vue`）：
```typescript
case 'your_new_tool':
  // 实现具体功能
  break;
```

### 调试技巧

1. **查看MCP服务器日志**：
   - 终端输出包含所有MCP请求和响应
   - 查找"收到MCP指令"相关日志

2. **查看浏览器控制台**：
   - 按F12打开开发者工具
   - 查看preload和渲染进程的调试信息

3. **健康检查**：
   - 访问 `http://localhost:3001/health` 检查服务状态

## 🐛 故障排除

### 常见问题

**Q: MCP服务无法启动**
- 检查端口3001是否被占用
- 确保在设置页面开启了MCP服务开关

**Q: Cursor无法连接**
- 确认MCP服务器正在运行
- 检查配置文件中的URL是否正确
- 尝试访问 `http://localhost:3001/health` 验证服务

**Q: 指令无响应**
- 查看终端日志确认收到MCP请求
- 检查浏览器控制台是否有错误
- 确认应用程序处于主页面

**Q: 自动播放不工作**
- 确认搜索页面URL包含autoplay=true参数
- 检查搜索结果是否为空

## 📄 许可证

本项目遵循原AlgerMusicPlayer的许可证协议。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进MCP集成功能。

## 📞 支持

如果您在使用过程中遇到问题，请：
1. 查看本文档的故障排除部分
2. 检查终端和浏览器控制台的错误信息
3. 在GitHub上提交Issue

---

*享受通过AI助手控制音乐播放的全新体验！* 🎵✨ 