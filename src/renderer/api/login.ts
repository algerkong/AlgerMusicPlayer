import request from '@/utils/request';

// 创建二维码key
//  /login/qr/key
export function getQrKey() {
  return request.get('/login/qr/key');
}

// 创建二维码
// /login/qr/create
export function createQr(key: any) {
  return request.get('/login/qr/create', { params: { key, qrimg: true } });
}

// 获取二维码状态
//  /login/qr/check
export function checkQr(key: any) {
  return request.get('/login/qr/check', { params: { key, noCookie: true } });
}

// 获取登录状态
// /login/status
export function getLoginStatus() {
  return request.get('/login/status');
}

// 获取用户信息
// /user/account
export function getUserDetail() {
  return request.get('/user/account');
}

// 退出登录
// /logout
export function logout() {
  return request.get('/logout');
}

// 手机号登录
// /login/cellphone
export function loginByCellphone(phone: string, password: string) {
  return request.post('/login/cellphone', {
    phone,
    password
  });
}

// UID登录 - 通过用户ID获取用户信息
// /user/detail
export function loginByUid(uid: string | number) {
  return request.get('/user/detail', {
    params: { uid }
  });
}
