import { useDateFormat } from '@vueuse/core';
import axios from 'axios';

import config from '../../../package.json';

interface GithubReleaseInfo {
  tag_name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    browser_download_url: string;
    name: string;
    size: number;
  }>;
}

export interface UpdateResult {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseInfo: {
    tag_name: string;
    body: string;
    html_url: string;
    assets: Array<{
      browser_download_url: string;
      name: string;
    }>;
  } | null;
}

/**
 * 获取 GitHub 最新发布版本信息
 */
export const getLatestReleaseInfo = async (): Promise<GithubReleaseInfo | null> => {
  try {
    const token = import.meta.env.VITE_GITHUB_TOKEN;
    const headers = {};

    const apiUrls = [
      // 原始地址
      'https://api.github.com/repos/algerkong/AlgerMusicPlayer/releases/latest',

      // 使用 ghproxy.com 代理
      'https://www.ghproxy.cn/https://raw.githubusercontent.com/algerkong/AlgerMusicPlayer/dev_electron/package.json'

      // 使用 gitee 镜像（如果有的话）
      // 'https://gitee.com/api/v5/repos/[用户名]/AlgerMusicPlayer/releases/latest'
    ];
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    for (const url of apiUrls) {
      try {
        const response = await axios.get(url, { headers });

        if (url.includes('package.json')) {
          // 如果是 package.json，直接读取版本号
          return {
            tag_name: response.data.version,
            body: (
              await axios.get(
                'https://www.ghproxy.cn/https://raw.githubusercontent.com/algerkong/AlgerMusicPlayer/dev_electron/CHANGELOG.md'
              )
            ).data,
            html_url: 'https://github.com/algerkong/AlgerMusicPlayer/releases/latest',
            assets: []
          } as unknown as GithubReleaseInfo;
        }
        return response.data;
      } catch (err) {
        console.warn(`尝试访问 ${url} 失败:`, err);
        continue;
      }
    }
    throw new Error('所有 API 地址均无法访问');
  } catch (error) {
    console.error('获取 GitHub Release 信息失败:', error);
    return null;
  }
};

/**
 * 格式化时间
 */
export const formatDate = (dateStr: string): string => {
  return useDateFormat(new Date(dateStr), 'YYYY-MM-DD HH:mm').value;
};

/**
 * 检查更新
 */
export const checkUpdate = async (
  currentVersion: string = config.version
): Promise<UpdateResult | null> => {
  try {
    const releaseInfo = await getLatestReleaseInfo();
    console.log('releaseInfo', releaseInfo);
    if (!releaseInfo) {
      return null;
    }

    const latestVersion = releaseInfo.tag_name.replace('v', '');
    if (latestVersion === currentVersion) {
      return null;
    }
    console.log('latestVersion', latestVersion);
    console.log('currentVersion', currentVersion);

    return {
      hasUpdate: true,
      latestVersion,
      currentVersion,
      releaseInfo: {
        tag_name: latestVersion,
        body: `## 更新内容\n\n- 版本: ${latestVersion}\n${releaseInfo.body}`,
        html_url: releaseInfo.html_url,
        assets: releaseInfo.assets.map((asset) => ({
          browser_download_url: asset.browser_download_url,
          name: asset.name
        }))
      }
    };
  } catch (error) {
    console.error('检查更新失败:', error);
    return null;
  }
};
