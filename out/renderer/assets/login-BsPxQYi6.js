import { as as inject, bi as throwError, bj as messageApiInjectionKey, ad as request } from "./index-DKaFsuse.js";
function useMessage() {
  const api = inject(messageApiInjectionKey, null);
  if (api === null) {
    throwError("use-message", "No outer <n-message-provider /> founded. See prerequisite in https://www.naiveui.com/en-US/os-theme/components/message for more details. If you want to use `useMessage` outside setup, please check https://www.naiveui.com/zh-CN/os-theme/components/message#Q-&-A.");
  }
  return api;
}
function getQrKey() {
  return request.get("/login/qr/key");
}
function createQr(key) {
  return request.get("/login/qr/create", { params: { key, qrimg: true } });
}
function checkQr(key) {
  return request.get("/login/qr/check", { params: { key } });
}
function getUserDetail() {
  return request.get("/user/account");
}
function logout() {
  return request.get("/logout");
}
function loginByCellphone(phone, password) {
  return request.post("/login/cellphone", {
    phone,
    password
  });
}
export {
  checkQr as a,
  getUserDetail as b,
  createQr as c,
  logout as d,
  getQrKey as g,
  loginByCellphone as l,
  useMessage as u
};
