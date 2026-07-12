import axios from 'axios';
import { get } from 'lodash';

import { useSettingsStore } from '@/store';

import type { ParsedMusicResult } from './gdmusic';

/**
 * 定义自定义API JSON插件的结构
 */
interface CustomApiPlugin {
  name: string;
  apiUrl: string;
  method?: 'GET' | 'POST';
  params: Record<string, string>;
  qualityMapping?: Record<string, string>;
  responseUrlPath: string;
}

/**
 * 从用户导入的自定义API JSON配置中解析音乐URL
 */
export const parseFromCustomApi = async (
  id: number,
  _songData: any,
  quality: string = 'higher',
  timeout: number = 10000
): Promise<ParsedMusicResult | null> => {
  const settingsStore = useSettingsStore();
  const pluginString = settingsStore.setData.customApiPlugin;

  if (!pluginString) {
    return null;
  }

  let plugin: CustomApiPlugin;
  try {
    plugin = JSON.parse(pluginString);
    if (!plugin.apiUrl || !plugin.params || !plugin.responseUrlPath) {
      console.error('自定义API：JSON配置文件格式不正确。');
      return null;
    }
  } catch (error) {
    console.error('自定义API：解析JSON配置文件失败。', error);
    return null;
  }

  console.log(`自定义API：正在使用插件 [${plugin.name}] 进行解析...`);

  try {
    // 1. 准备请求参数，替换占位符
    const finalParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(plugin.params)) {
      if (value === '{songId}') {
        finalParams[key] = String(id);
      } else if (value === '{quality}') {
        // 使用 qualityMapping (如果存在) 进行音质翻译，否则直接使用原quality
        finalParams[key] = plugin.qualityMapping?.[quality] ?? quality;
      } else {
        // 固定值参数
        finalParams[key] = value;
      }
    }

    // 2. 判断请求方法，默认为GET
    const method = plugin.method?.toUpperCase() === 'POST' ? 'POST' : 'GET';
    let response;

    // 3. 根据方法发送不同的请求
    if (method === 'POST') {
      console.log('自定义API：发送 POST 请求到:', plugin.apiUrl, '参数:', finalParams);
      response = await axios.post(plugin.apiUrl, finalParams, { timeout });
    } else {
      // 默认为 GET
      // apiUrl 本身可能已带查询串（如 xxx/api.php?type=url），需按情况选择 ? 或 &
      const separator = plugin.apiUrl.includes('?') ? '&' : '?';
      const finalUrl = `${plugin.apiUrl}${separator}${new URLSearchParams(finalParams).toString()}`;
      console.log('自定义API：发送 GET 请求到:', finalUrl);
      response = await axios.get(finalUrl, { timeout });
    }

    // 4. 使用 lodash.get 安全地从响应数据中提取URL
    const musicUrl = get(response.data, plugin.responseUrlPath);

    if (musicUrl && typeof musicUrl === 'string') {
      console.log('自定义API：成功获取URL！');
      // 5. 组装成应用所需的标准格式并返回
      // quality 是 'standard'/'higher'/'exhigh'/'lossless'/'hires' 等字符串，
      // 直接 parseInt 会得到 NaN，这里映射为对应码率(bps)
      const QUALITY_BITRATE: Record<string, number> = {
        standard: 128000,
        higher: 192000,
        exhigh: 320000,
        lossless: 999000,
        hires: 1900000
      };
      return {
        data: {
          data: {
            url: musicUrl,
            br: QUALITY_BITRATE[quality] ?? 320000,
            size: 0,
            md5: '',
            platform: plugin.name.toLowerCase().replace(/\s/g, ''),
            gain: 0
          },
          params: { id, type: 'song' }
        }
      };
    } else {
      console.error('自定义API：根据路径未能从响应中找到URL:', plugin.responseUrlPath);
      return null;
    }
  } catch (error) {
    console.error(`自定义API [${plugin.name}] 执行失败:`, error);
    return null;
  }
};
