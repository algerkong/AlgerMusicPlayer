import { createStore } from "vuex";
import { SongResult } from "@/type/music";
import { getMusicUrl } from "@/api/music";

let state = {
  menus: [
    {
      href: "/",
      icon: "icon-homefill",
      text: "hello",
    },
    {
      href: "/main",
      icon: "icon-peoplefill",
      text: "hello",
    },
    {
      href: "/",
      icon: "icon-videofill",
      text: "hello",
    },
  ],
  isPlay: false,
  playMusic: {} as SongResult,
  playMusicUrl: "",
};

let mutations = {
  setMenus(state: any, menus: any[]) {
    state.menus = menus;
  },
  setPlay(state: any, playMusic: SongResult) {
    state.playMusic = playMusic;
    state.playMusicUrl = getSongUrl(playMusic.id);
  },
  setIsPlay(state: any, isPlay: boolean) {
    state.isPlay = isPlay;
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
