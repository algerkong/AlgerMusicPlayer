const axios = require('axios');

async function testMCPServer() {
  const baseURL = 'http://localhost:3001';
  
  console.log('测试MCP服务器端点...\n');
  
  try {
    // 测试健康检查端点
    console.log('1. 测试健康检查端点 /health');
    try {
      const healthResponse = await axios.get(`${baseURL}/health`);
      console.log('✅ 健康检查成功:', healthResponse.data);
    } catch (error) {
      console.log('❌ 健康检查失败:', error.response?.status, error.response?.statusText);
    }
    
    console.log('\n2. 测试MCP初始化请求');
    try {
      const initResponse = await axios.post(`${baseURL}/sse`, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {
            tools: true,
            resources: true,
            prompts: true,
            logging: true
          },
          clientInfo: {
            name: 'test-client',
            version: '1.0.0'
          }
        }
      });
      console.log('✅ 初始化成功:', JSON.stringify(initResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 初始化失败:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('错误详情:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n3. 测试工具列表请求');
    try {
      const toolsResponse = await axios.post(`${baseURL}/sse`, {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      });
      console.log('✅ 工具列表获取成功:', JSON.stringify(toolsResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 获取工具列表失败:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('错误详情:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n4. 测试搜索音乐工具调用');
    try {
      const searchResponse = await axios.post(`${baseURL}/sse`, {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'search_music',
          arguments: {
            query: '测试歌曲'
          }
        }
      });
      console.log('✅ 搜索音乐工具调用成功:', JSON.stringify(searchResponse.data, null, 2));
    } catch (error) {
      console.log('❌ 搜索音乐工具调用失败:', error.response?.status, error.response?.statusText);
      if (error.response?.data) {
        console.log('错误详情:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('连接MCP服务器失败:', error.message);
  }
}

testMCPServer(); 