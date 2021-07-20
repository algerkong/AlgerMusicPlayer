import { createStore } from "vuex";

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
};

let mutations = {};

const store = createStore({
  state: state,
  mutations: mutations,
});

export default store;
