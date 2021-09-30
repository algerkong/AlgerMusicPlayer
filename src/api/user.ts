import request from "@/utils/request";

// /user/detail
export function getUserDetail(uid: number) {
  return request.get("/user/detail", { params: { uid } });
}

// /user/playlist
export function getUserPlaylist(uid: number) {
  return request.get("/user/playlist", { params: { uid } });
}
