/**
 * 登录状态管理工具（展示层缓存）。
 *
 * 凭据不得进入 localStorage：
 * - 音源 cookie/session 仅主进程 + safeStorage
 * - 历史 localStorage.token 启动时清除，不再作为权限依据
 *
 * 在组件内部，建议直接使用 userStore / msGetAuthState。
 */

import { isElectron } from '@/utils';

export interface LoginInfo {
  isLoggedIn: boolean;
  loginType: 'token' | 'cookie' | 'qr' | 'uid' | null;
  hasToken: boolean;
  hasUser: boolean;
  user: any;
}

/** 清除敏感凭据字段（可重复调用） */
export function purgeCredentialStorage(): void {
  try {
    localStorage.removeItem('token');
  } catch {
    // ignore
  }
}

/**
 * 检查登录状态（仅 UI 恢复用；hasToken 恒为 false）
 */
export function checkLoginStatus(): LoginInfo {
  purgeCredentialStorage();

  const userData = localStorage.getItem('user');
  const loginType = localStorage.getItem('loginType') as LoginInfo['loginType'];
  const uidLogin = localStorage.getItem('uidLogin');

  const hasUser = !!userData;
  let user = null;

  if (hasUser) {
    try {
      user = JSON.parse(userData!);
    } catch (error) {
      console.error('解析用户数据失败:', error);
    }
  }

  // 不再用 localStorage token 判定登录；仅根据非敏感的 user 缓存做 UI 恢复
  const isLoggedIn = hasUser && !!user;

  return {
    isLoggedIn,
    loginType: loginType || (uidLogin === 'true' ? 'uid' : null),
    hasToken: false,
    hasUser,
    user
  };
}

/**
 * 检查是否有访问权限
 * @param requireAuth 是否需要真实登录权限（Electron 下应走音源 auth-state，此处恒严格）
 */
export function hasPermission(requireAuth: boolean = false): boolean {
  const loginInfo = checkLoginStatus();

  if (!loginInfo.isLoggedIn) {
    return false;
  }

  // 真实权限不能依赖 localStorage token；requireAuth 时要求调用方改查主进程 auth
  if (requireAuth) {
    return false;
  }

  if (loginInfo.loginType === 'uid') {
    return true;
  }

  return true;
}

/**
 * 清除登录状态
 */
export function clearLoginStatus(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('loginType');
  localStorage.removeItem('uidLogin');
}

/**
 * 设置登录状态（仅 loginType / 用户侧标记；永不写入 token）
 */
export function setLoginStatus(loginType: LoginInfo['loginType'], _token?: string): void {
  // token 参数忽略，防止调用方误把凭据写入 localStorage
  if (_token && isElectron) {
    console.warn('[auth] token is not stored in renderer; kept only in main process if applicable');
  }

  localStorage.setItem('loginType', loginType || '');
  localStorage.removeItem('token');

  if (loginType === 'uid') {
    localStorage.setItem('uidLogin', 'true');
  } else {
    localStorage.removeItem('uidLogin');
  }
}

/**
 * 获取登录错误信息
 */
export function getLoginErrorMessage(requireAuth: boolean = false): string {
  const loginInfo = checkLoginStatus();

  if (!loginInfo.isLoggedIn) {
    return '请先登录';
  }

  if (requireAuth) {
    return '请使用音源 Cookie 登录（设置中导入会话）';
  }

  if (loginInfo.loginType === 'uid') {
    return 'UID登录无法访问此功能，请使用Cookie登录';
  }

  return '';
}
