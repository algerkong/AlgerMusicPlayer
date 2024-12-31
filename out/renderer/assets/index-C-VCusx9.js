import { ad as request, d as defineComponent, r as ref, g as useStore, j as openBlock, c as createElementBlock, b as createBaseVNode, e as createVNode, u as unref, a7 as getImgUrl, T as createCommentVNode, t as toDisplayString, O as createBlock, i as isRef, n as normalizeClass, ae as audioService, _ as _export_sfc, G as computed, o as onMounted, E as watch, f as withCtx, af as useRoute, ag as useDateFormat, ab as resolveDirective, ac as isMobile, a3 as Fragment, a4 as renderList, s as setAnimationClass, a2 as normalizeStyle, a5 as setAnimationDelay, ah as withModifiers, k as createTextVNode, w as withDirectives } from "./index-DKaFsuse.js";
import { e as getHotSearch } from "./home-BXGE9AqN.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import { M as MusicList, g as getAlbum, a as getListDetail } from "./MusicList-s-QHu-iA.js";
import { M as MvPlayer } from "./MvPlayer-I4IDK1xL.js";
import { N as NImage } from "./Image-DXClIklC.js";
import { _ as __unplugin_components_1 } from "./Layout-CvYBg1vI.js";
import "./Ellipsis-D4R5dIX2.js";
import "./Drawer-BEJ8Ydua.js";
import "./Avatar-rQ2og-6c.js";
import "./Tag-C0oC92WF.js";
import "./Icon-DucaliTK.js";
import "./Slider-BA6NituQ.js";
import "./use-locale-DLWAOXez.js";
const getSearch = (params) => {
  return request.get("/cloudsearch", {
    params
  });
};
const _hoisted_1$1 = { class: "search-item-img" };
const _hoisted_2$1 = {
  key: 0,
  class: "play"
};
const _hoisted_3$1 = { class: "search-item-info" };
const _hoisted_4$1 = { class: "search-item-name" };
const _hoisted_5$1 = { class: "search-item-artist" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "SearchItem",
  props: {
    item: {}
  },
  setup(__props) {
    const props = __props;
    const songList = ref([]);
    const showPop = ref(false);
    const listInfo = ref(null);
    const getCurrentMv = () => {
      return {
        id: props.item.id,
        name: props.item.name
      };
    };
    const store = useStore();
    const handleClick = async () => {
      listInfo.value = null;
      if (props.item.type === "专辑") {
        showPop.value = true;
        const res = await getAlbum(props.item.id);
        songList.value = res.data.songs.map((song) => {
          song.al.picUrl = song.al.picUrl || props.item.picUrl;
          return song;
        });
        listInfo.value = {
          ...res.data.album,
          creator: {
            avatarUrl: res.data.album.artist.img1v1Url,
            nickname: `${res.data.album.artist.name} - ${res.data.album.company}`
          },
          description: res.data.album.description
        };
      }
      if (props.item.type === "playlist") {
        showPop.value = true;
        const res = await getListDetail(props.item.id);
        songList.value = res.data.playlist.tracks;
        listInfo.value = res.data.playlist;
      }
      if (props.item.type === "mv") {
        store.commit("setIsPlay", false);
        store.commit("setPlayMusic", false);
        audioService.getCurrentSound()?.pause();
        showPop.value = true;
      }
    };
    return (_ctx, _cache) => {
      const _component_n_image = NImage;
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["search-item", _ctx.item.type]),
        onClick: handleClick
      }, [
        createBaseVNode("div", _hoisted_1$1, [
          createVNode(_component_n_image, {
            src: unref(getImgUrl)(_ctx.item.picUrl, _ctx.item.type === "mv" ? "320y180" : "100y100"),
            lazy: "",
            "preview-disabled": ""
          }, null, 8, ["src"]),
          _ctx.item.type === "mv" ? (openBlock(), createElementBlock("div", _hoisted_2$1, _cache[2] || (_cache[2] = [
            createBaseVNode("i", { class: "iconfont icon icon-play" }, null, -1)
          ]))) : createCommentVNode("", true)
        ]),
        createBaseVNode("div", _hoisted_3$1, [
          createBaseVNode("p", _hoisted_4$1, toDisplayString(_ctx.item.name), 1),
          createBaseVNode("p", _hoisted_5$1, toDisplayString(_ctx.item.desc), 1)
        ]),
        ["专辑", "playlist"].includes(_ctx.item.type) ? (openBlock(), createBlock(MusicList, {
          key: 0,
          show: unref(showPop),
          "onUpdate:show": _cache[0] || (_cache[0] = ($event) => isRef(showPop) ? showPop.value = $event : null),
          name: _ctx.item.name,
          "song-list": unref(songList),
          "list-info": unref(listInfo),
          cover: false
        }, null, 8, ["show", "name", "song-list", "list-info"])) : createCommentVNode("", true),
        _ctx.item.type === "mv" ? (openBlock(), createBlock(MvPlayer, {
          key: 1,
          show: unref(showPop),
          "onUpdate:show": _cache[1] || (_cache[1] = ($event) => isRef(showPop) ? showPop.value = $event : null),
          "current-mv": getCurrentMv(),
          "no-list": ""
        }, null, 8, ["show", "current-mv"])) : createCommentVNode("", true)
      ], 2);
    };
  }
});
const SearchItem = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-3449f610"]]);
const _hoisted_1 = { class: "search-page" };
const _hoisted_2 = { class: "hot-search-list" };
const _hoisted_3 = ["onClick"];
const _hoisted_4 = { class: "title" };
const _hoisted_5 = { class: "search-list-box" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "Search"
  },
  __name: "index",
  setup(__props) {
    const route = useRoute();
    const store = useStore();
    const searchDetail = ref();
    const searchType = computed(() => store.state.searchType);
    const searchDetailLoading = ref(false);
    const hotSearchData = ref();
    const loadHotSearch = async () => {
      const { data } = await getHotSearch();
      hotSearchData.value = data;
    };
    onMounted(() => {
      loadHotSearch();
      loadSearch(route.query.keyword);
    });
    const hotKeyword = ref(route.query.keyword || "搜索列表");
    watch(
      () => store.state.searchValue,
      (value) => {
        loadSearch(value);
      }
    );
    const dateFormat = (time) => useDateFormat(time, "YYYY.MM.DD").value;
    const loadSearch = async (keywords, type = null) => {
      hotKeyword.value = keywords;
      searchDetail.value = void 0;
      if (!keywords) return;
      searchDetailLoading.value = true;
      const { data } = await getSearch({ keywords, type: type || searchType.value });
      const songs = data.result.songs || [];
      const albums = data.result.albums || [];
      const mvs = (data.result.mvs || []).map((item) => ({
        ...item,
        picUrl: item.cover,
        playCount: item.playCount,
        desc: item.artists.map((artist) => artist.name).join("/"),
        type: "mv"
      }));
      const playlists = (data.result.playlists || []).map((item) => ({
        ...item,
        picUrl: item.coverImgUrl,
        playCount: item.playCount,
        desc: item.creator.nickname,
        type: "playlist"
      }));
      songs.forEach((item) => {
        item.picUrl = item.al.picUrl;
        item.artists = item.ar;
      });
      albums.forEach((item) => {
        item.desc = `${item.artist.name} ${item.company} ${dateFormat(item.publishTime)}`;
      });
      searchDetail.value = {
        songs,
        albums,
        mvs,
        playlists
      };
      searchDetailLoading.value = false;
    };
    watch(
      () => route.path,
      async (path) => {
        if (path === "/search") {
          store.state.searchValue = route.query.keyword;
        }
      }
    );
    const handlePlay = () => {
      const tracks = searchDetail.value?.songs || [];
      store.commit("setPlayList", tracks);
    };
    return (_ctx, _cache) => {
      const _component_n_layout = __unplugin_components_1;
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        (unref(isMobile) ? !searchDetail.value : true) ? (openBlock(), createBlock(_component_n_layout, {
          key: 0,
          class: normalizeClass(["hot-search", unref(setAnimationClass)("animate__fadeInDown")]),
          "native-scrollbar": false
        }, {
          default: withCtx(() => [
            _cache[0] || (_cache[0] = createBaseVNode("div", { class: "title" }, "热搜列表", -1)),
            createBaseVNode("div", _hoisted_2, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(hotSearchData.value?.data, (item, index2) => {
                return openBlock(), createElementBlock("div", {
                  key: index2,
                  class: normalizeClass([unref(setAnimationClass)("animate__bounceInLeft"), "hot-search-item"]),
                  style: normalizeStyle(unref(setAnimationDelay)(index2, 10)),
                  onClick: withModifiers(($event) => loadSearch(item.searchWord, 1), ["stop"])
                }, [
                  createBaseVNode("span", {
                    class: normalizeClass(["hot-search-item-count", { "hot-search-item-count-3": index2 < 3 }])
                  }, toDisplayString(index2 + 1), 3),
                  createTextVNode(" " + toDisplayString(item.searchWord), 1)
                ], 14, _hoisted_3);
              }), 128))
            ])
          ]),
          _: 1
        }, 8, ["class"])) : createCommentVNode("", true),
        (unref(isMobile) ? searchDetail.value : true) ? (openBlock(), createBlock(_component_n_layout, {
          key: 1,
          class: normalizeClass(["search-list", unref(setAnimationClass)("animate__fadeInUp")]),
          "native-scrollbar": false
        }, {
          default: withCtx(() => [
            createBaseVNode("div", _hoisted_4, toDisplayString(hotKeyword.value), 1),
            withDirectives((openBlock(), createElementBlock("div", _hoisted_5, [
              searchDetail.value ? (openBlock(), createElementBlock(Fragment, { key: 0 }, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(searchDetail.value?.songs, (item, index2) => {
                  return openBlock(), createElementBlock("div", {
                    key: item.id,
                    class: normalizeClass(unref(setAnimationClass)("animate__bounceInRight")),
                    style: normalizeStyle(unref(setAnimationDelay)(index2, 50))
                  }, [
                    createVNode(SongItem, {
                      item,
                      onPlay: handlePlay
                    }, null, 8, ["item"])
                  ], 6);
                }), 128)),
                (openBlock(true), createElementBlock(Fragment, null, renderList(searchDetail.value, (list, key) => {
                  return openBlock(), createElementBlock(Fragment, null, [
                    key.toString() !== "songs" ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(list, (item, index2) => {
                      return openBlock(), createElementBlock("div", {
                        key: item.id,
                        class: normalizeClass(unref(setAnimationClass)("animate__bounceInRight")),
                        style: normalizeStyle(unref(setAnimationDelay)(index2, 50))
                      }, [
                        createVNode(SearchItem, { item }, null, 8, ["item"])
                      ], 6);
                    }), 128)) : createCommentVNode("", true)
                  ], 64);
                }), 256))
              ], 64)) : createCommentVNode("", true)
            ])), [
              [_directive_loading, searchDetailLoading.value]
            ])
          ]),
          _: 1
        }, 8, ["class"])) : createCommentVNode("", true)
      ]);
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-254ebbc1"]]);
export {
  index as default
};
