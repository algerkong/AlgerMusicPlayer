# 一个基于 electron typescript vue3 的桌面音乐播放器 适配 web端 桌面端 web移动端
主要功能如下

- 音乐推荐
- 音乐播放
- 网易云登录
- 播放历史
- 桌面歌词
- 歌单 mv 搜索 专辑等功能

## 预览地址
[http://mc.alger.fun/](http://mc.alger.fun/)

## 软件截图
![首页](./docs/img/image-7.png)
![歌词](./docs/img/image-6.png)
![歌单](./docs/img/image-1.png)
![搜索](./docs/img/image-8.png)
![mv](./docs/img/image-3.png)
![历史](./docs/img/image-4.png)
![我的](./docs/img/image-5.png)

## 项目运行
```bash
  # 安装依赖
  npm install

  # 运行项目 web
  npm run dev

  # 运行项目 electron
  npm run start

  # 打包项目 web
  npm run build

  # 打包项目 electron
  npm run win ... 
  # 具体看 package.json
```
#### 注意
- 本地运行需要配置 .env.development 文件
- 打包需要配置 .env.production 文件

```bash
  # .env.development
  # 你的接口地址 (必填)
  VITE_API = ***
  # 音乐破解接口地址
  VITE_API_MUSIC = ***
  # 代理地址
  VITE_API_PROXY = ***


  # 本地运行代理地址
  VITE_API_PROXY = /api
  VITE_API_MUSIC_PROXY = /music
  VITE_API_PROXY_MUSIC = /music_proxy

  # .env.production
  # 你的接口地址 (必填)
  VITE_API = ***
  # 音乐破解接口地址
  VITE_API_MUSIC = ***
  # 代理地址
  VITE_API_PROXY = ***
```

## 欢迎提Issues

## 免责声明
本软件仅用于学习交流，禁止用于商业用途，否则后果自负。
