import request from "@/utils/request";

//  /login/qr/key
export function getQrKey() {
  return request.get("/login/qr/key");
}

// /login/qr/create
export function createQr(key: any) {
  return request.get("/login/qr/create", { params: { key: key, qrimg: true } });
}

//  /login/qr/check
export function checkQr(key: any) {
  return request.get("/login/qr/check", { params: { key: key } });
}

// /login/status
export function getLoginStatus() {
  return request.get("/login/status");
}

// /user/account
export function getUserDetail() {
  return request.get("/user/account");
}
