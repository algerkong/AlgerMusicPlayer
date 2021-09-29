import { createStore } from "vuex";
import { SongResult } from "@/type/music";
import { getMusicUrl } from "@/api/music";
import homeRouter from "@/router/home";
let state = {
  menus: homeRouter,
  play: false,
  isPlay: false,
  playMusic: {} as SongResult,
  playMusicUrl: "",
};

let mutations = {
  setMenus(state: any, menus: any[]) {
    state.menus = menus;
  },
  async setPlay(state: any, playMusic: SongResult) {
    state.playMusic = playMusic;
    state.playMusicUrl = await getSongUrl(playMusic.id);
    state.play = true;
  },
  setIsPlay(state: any, isPlay: boolean) {
    state.isPlay = isPlay;
  },
  setPlayMusic(state: any, play: boolean) {
    state.play = play;
  },
};

const getSongUrl = async (id: number) => {
  const { data } = await getMusicUrl(id);
  console.log(data.data[0].url);

  return data.data[0].url;
};

const store = createStore({
  state: state,
  mutations: mutations,
});

export default store;
