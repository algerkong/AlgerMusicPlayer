/**
 * 登录状态管理工具
 *
 * 注意：这个工具主要用于在组件外部或 store 初始化之前检查登录状态。
 * 在组件内部，建议直接使用 userStore 中的状态。
 */

export interface LoginInfo {
  isLoggedIn: boolean;
  loginType: 'token' | 'cookie' | 'qr' | 'uid' | null;
  hasToken: boolean;
  hasUser: boolean;
  user: any;
}

/**
 * 检查登录状态
 * @returns 登录信息对象
 */
export function checkLoginStatus(): LoginInfo {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');
  const loginType = localStorage.getItem('loginType') as LoginInfo['loginType'];
  const uidLogin = localStorage.getItem('uidLogin');

  const hasToken = !!token;
  const hasUser = !!userData;
  let user = null;

  if (hasUser) {
    try {
      user = JSON.parse(userData);
    } catch (error) {
      console.error('解析用户数据失败:', error);
    }
  }

  // 判断是否已登录
  let isLoggedIn = false;

  if (loginType === 'uid' || uidLogin === 'true') {
    // UID登录：只需要有用户数据即可
    isLoggedIn = hasUser && !!user;
  } else {
    // 其他登录方式：需要token和用户数据
    isLoggedIn = hasToken && hasUser && !!user;
  }

  return {
    isLoggedIn,
    loginType,
    hasToken,
    hasUser,
    user
  };
}

/**
 * 检查是否有访问权限
 * @param requireAuth 是否需要真实登录权限（token）
 * @returns 是否有权限
 */
export function hasPermission(requireAuth: boolean = false): boolean {
  const loginInfo = checkLoginStatus();

  if (!loginInfo.isLoggedIn) {
    return false;
  }

  // 如果需要真实登录权限，UID登录无法满足
  if (requireAuth && loginInfo.loginType === 'uid') {
    return false;
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
 * 设置登录状态（不包括用户数据，用户数据应通过 userStore.setUser 设置）
 * @param loginType 登录类型
 * @param token 登录token（可选）
 */
export function setLoginStatus(loginType: LoginInfo['loginType'], token?: string): void {
  localStorage.setItem('loginType', loginType || '');

  if (token) {
    localStorage.setItem('token', token);
  }

  if (loginType === 'uid') {
    localStorage.setItem('uidLogin', 'true');
  }
}

/**
 * 获取登录错误信息
 * @param requireAuth 是否需要真实登录权限
 * @returns 错误信息
 */
export function getLoginErrorMessage(requireAuth: boolean = false): string {
  const loginInfo = checkLoginStatus();

  if (!loginInfo.isLoggedIn) {
    return '请先登录';
  }

  if (requireAuth && loginInfo.loginType === 'uid') {
    return 'UID登录无法访问此功能，请使用Cookie或二维码登录';
  }

  return '';
}
