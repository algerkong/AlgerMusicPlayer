import axios from 'axios';
import config from '../../../package.json';
import { useDateFormat } from '@vueuse/core';

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
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }
    const response = await axios.get(
      'https://api.github.com/repos/algerkong/AlgerMusicPlayer/releases/latest',
      {
        headers
      }
    );
    
    if (response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('获取 GitHub Release 信息失败:', error);
    return null;
  }
};

/**
 * 格式化时间
 */
const formatDate = (dateStr: string): string => {
  return useDateFormat(new Date(dateStr), 'YYYY-MM-DD HH:mm').value;
};

/**
 * 检查更新
 */
export const checkUpdate = async (currentVersion: string = config.version): Promise<UpdateResult | null> => {
  try {
    const releaseInfo = await getLatestReleaseInfo();
    if (!releaseInfo) {
      return null;
    }

    const latestVersion = releaseInfo.tag_name.replace('v', '');
    if (latestVersion === currentVersion) {
      return null;
    }

    return {
      hasUpdate: true,
      latestVersion,
      currentVersion,
      releaseInfo: {
        tag_name: latestVersion,
        body: `## 更新内容\n\n- 版本: ${latestVersion}\n- 发布时间: ${formatDate(releaseInfo.published_at)}\n\n${releaseInfo.body}`,
        html_url: releaseInfo.html_url,
        assets: releaseInfo.assets.map(asset => ({
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