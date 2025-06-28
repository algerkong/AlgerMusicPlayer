import type { BrowserWindow } from 'electron';
import express from 'express';
import cors from 'cors';
import type { Server } from 'http';

// MCP工具定义
const TOOLS = [
  {
    name: 'search_music',
    description: '搜索音乐',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'play_music',
    description: '播放音乐',
    inputSchema: {
      type: 'object',
      properties: {
        songId: {
          type: 'string',
          description: '歌曲ID'
        },
        songName: {
          type: 'string',
          description: '歌曲名称'
        }
      },
      required: ['songId']
    }
  },
  {
    name: 'add_to_playlist',
    description: '添加到播放列表',
    inputSchema: {
      type: 'object',
      properties: {
        songId: {
          type: 'string',
          description: '歌曲ID'
        }
      },
      required: ['songId']
    }
  },
  {
    name: 'like_music',
    description: '喜欢音乐',
    inputSchema: {
      type: 'object',
      properties: {
        songId: {
          type: 'string',
          description: '歌曲ID'
        }
      },
      required: ['songId']
    }
  }
];

// 存储SSE连接的响应对象
const clients: express.Response[] = [];

export class MCPServer {
  private app: express.Express;
  private server: Server | null = null;
  private mainWindow: BrowserWindow;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.app = express();
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.app.use(express.json());

    this.setupRoutes();
  }

  private setupRoutes() {
    // SSE连接端点
    this.app.get('/sse', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
      res.flushHeaders();

      clients.push(res);
      console.log('MCP客户端已连接');

      // 发送初始化成功消息
      res.write(`data: ${JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      })}\n\n`);

      req.on('close', () => {
        const index = clients.indexOf(res);
        if (index > -1) {
          clients.splice(index, 1);
        }
        console.log('MCP客户端已断开');
      });

      req.on('error', (error) => {
        console.error('SSE连接错误:', error);
        const index = clients.indexOf(res);
        if (index > -1) {
          clients.splice(index, 1);
        }
      });
    });

    // MCP协议消息处理端点
    this.app.post('/sse', (req, res) => {
      try {
        const request = req.body;
        console.log('收到MCP指令:', request);

        // 验证JSON-RPC格式
        if (!request.jsonrpc || request.jsonrpc !== '2.0') {
          return res.status(400).json({
            jsonrpc: '2.0',
            id: request.id || null,
            error: {
              code: -32600,
              message: 'Invalid Request',
              data: 'Missing or invalid jsonrpc field'
            }
          });
        }

        if (!request.method) {
          return res.status(400).json({
            jsonrpc: '2.0',
            id: request.id || null,
            error: {
              code: -32600,
              message: 'Invalid Request',
              data: 'Missing method field'
            }
          });
        }

        // 处理不同的MCP方法
        const response = this.handleMCPMethod(request);
        res.json(response);

      } catch (error) {
        console.error('处理MCP请求失败:', error);
        res.status(500).json({
          jsonrpc: '2.0',
          id: req.body?.id || null,
          error: {
            code: -32603,
            message: 'Internal error',
            data: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    });

    // 健康检查端点
    this.app.get('/health', (_, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private handleMCPMethod(request: any): any {
    const { method, id } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-03-26',
            capabilities: {
              tools: {},
              resources: {},
              prompts: {},
              logging: {}
            },
            serverInfo: {
              name: 'AlgerMusicPlayer',
              version: '1.0.0'
            }
          }
        };

      case 'tools/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: TOOLS
          }
        };

      case 'tools/call':
        return this.handleToolCall(request);

      case 'resources/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            resources: []
          }
        };

      case 'prompts/list':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            prompts: []
          }
        };

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found',
            data: `Unknown method: ${method}`
          }
        };
    }
  }

  private handleToolCall(request: any): any {
    const { params, id } = request;
    
    // 避免使用arguments关键字，直接访问属性
    const name = params.name;
    const args = params.arguments;

    console.log('主进程接收到工具调用:', { name, args, id });

    try {
      // 构建要发送的数据
      const toolCallData = {
        name,
        args: args,
        id
      };
      
      console.log('主进程准备发送MCP工具调用数据:', JSON.stringify(toolCallData, null, 2));
      
      // 检查mainWindow是否有效
      if (!this.mainWindow || this.mainWindow.isDestroyed()) {
        console.error('主窗口无效或已销毁，无法发送MCP事件');
      } else {
        // 将工具调用转发到渲染进程
        this.mainWindow.webContents.send('mcp-tool-call', toolCallData);
        console.log('主进程已发送mcp-tool-call事件到渲染进程');
      }

      // 根据工具名称执行相应操作
      let result: any;

      switch (name) {
        case 'search_music':
          result = {
            success: true,
            message: `正在搜索音乐: ${args.query}`,
            data: {
              query: args.query,
              timestamp: new Date().toISOString()
            }
          };
          break;

        case 'play_music':
          result = {
            success: true,
            message: `正在播放音乐: ${args.songName || args.songId}`,
            data: {
              songId: args.songId,
              songName: args.songName,
              timestamp: new Date().toISOString()
            }
          };
          break;

        case 'add_to_playlist':
          result = {
            success: true,
            message: `已添加到播放列表: ${args.songId}`,
            data: {
              songId: args.songId,
              timestamp: new Date().toISOString()
            }
          };
          break;

        case 'like_music':
          result = {
            success: true,
            message: `已喜欢音乐: ${args.songId}`,
            data: {
              songId: args.songId,
              timestamp: new Date().toISOString()
            }
          };
          break;

        default:
          throw new Error(`未知的工具: ${name}`);
      }

      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };

    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Tool execution failed',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  public start(port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        console.log('MCP服务器已经在运行中');
        resolve();
        return;
      }
      try {
        this.server = this.app.listen(port, host, () => {
          console.log(`MCP服务器已启动，监听地址 http://${host}:${port}`);
          resolve();
        });

        this.server?.on('error', (error) => {
          console.error('MCP服务器错误:', error);
          reject(error);
        });

      } catch (error) {
        console.error('启动MCP服务器失败:', error);
        reject(error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        console.log('MCP服务器未运行');
        resolve();
        return;
      }

      // 关闭所有SSE连接
      clients.forEach(client => {
        try {
          client.end();
        } catch (error) {
          console.error('关闭SSE连接失败:', error);
        }
      });
      clients.length = 0;

      this.server.close((err) => {
        if (err) {
          console.error('关闭MCP服务器失败:', err);
          reject(err);
          return;
        }
        this.server = null;
        console.log('MCP服务器已关闭');
        resolve();
      });
    });
  }
} 