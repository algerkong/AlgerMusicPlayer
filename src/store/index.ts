import { createStore } from "vuex";
import { SongResult } from "@/type/music";

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
};

let mutations = {
  setMenus(state: any, menus: any[]) {
    state.menus = menus;
  },
  setPlay(state: any, playMusic: SongResult) {
    console.log(playMusic);

    state.playMusic = playMusic;
  },
  setIsPlay(state: any, isPlay: boolean) {
    console.log(isPlay);

    state.isPlay = isPlay;
  },
};

const store = createStore({
  state: state,
  mutations: mutations,
});

export default store;
