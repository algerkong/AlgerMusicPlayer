import { ad as request } from "./index-DKaFsuse.js";
const getHotSinger = (params) => {
  return request.get("/top/artists", { params });
};
const getSearchKeyword = () => {
  return request.get("/search/default");
};
const getHotSearch = () => {
  return request.get("/search/hot/detail");
};
const getPlaylistCategory = () => {
  return request.get("/playlist/catlist");
};
const getRecommendMusic = (params) => {
  return request.get("/personalized/newsong", { params });
};
const getDayRecommend = () => {
  return request.get("/recommend/songs");
};
const getNewAlbum = () => {
  return request.get("/album/newest");
};
export {
  getNewAlbum as a,
  getHotSinger as b,
  getDayRecommend as c,
  getRecommendMusic as d,
  getHotSearch as e,
  getSearchKeyword as f,
  getPlaylistCategory as g
};
