import { d as defineComponent, r as ref, G as computed, a5 as setAnimationDelay, E as watch, h as useRouter, o as onMounted, j as openBlock, c as createElementBlock, b as createBaseVNode, n as normalizeClass, u as unref, s as setAnimationClass, a3 as Fragment, a4 as renderList, w as withDirectives, a6 as vShow, a2 as normalizeStyle, t as toDisplayString, _ as _export_sfc, e as createVNode, a7 as getImgUrl, T as createCommentVNode, g as useStore, a8 as watchEffect, O as createBlock, f as withCtx, a9 as setBackgroundImg, k as createTextVNode, aa as router, S as Scrollbar, ab as resolveDirective, ac as isMobile } from "./index-DKaFsuse.js";
import { g as getPlaylistCategory, a as getNewAlbum, b as getHotSinger, c as getDayRecommend, d as getRecommendMusic } from "./home-BXGE9AqN.js";
import { M as MusicList, g as getAlbum } from "./MusicList-s-QHu-iA.js";
import { N as NImage } from "./Image-DXClIklC.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import { F as Favorite } from "./index-JJypdZPY.js";
import "./Drawer-BEJ8Ydua.js";
import "./Avatar-rQ2og-6c.js";
import "./Tag-C0oC92WF.js";
import "./Ellipsis-D4R5dIX2.js";
import "./use-locale-DLWAOXez.js";
const _hoisted_1$4 = { class: "play-list-type" };
const _hoisted_2$3 = ["onClick"];
const DELAY_TIME = 40;
const _sfc_main$4 = /* @__PURE__ */ defineComponent({
  __name: "PlaylistType",
  setup(__props) {
    const playlistCategory = ref();
    const isShowAllPlaylistCategory = ref(false);
    const getAnimationDelay = computed(() => {
      return (index2) => {
        if (index2 <= 19) {
          return setAnimationDelay(index2, DELAY_TIME);
        }
        if (!isShowAllPlaylistCategory.value) {
          const nowIndex = (playlistCategory.value?.sub.length || 0) - index2;
          return setAnimationDelay(nowIndex, DELAY_TIME);
        }
        return setAnimationDelay(index2 - 19, DELAY_TIME);
      };
    });
    watch(isShowAllPlaylistCategory, (newVal) => {
      if (!newVal) {
        const elements = playlistCategory.value?.sub.map(
          (_, index2) => document.querySelector(`.type-item-${index2}`)
        );
        elements.slice(20).reverse().forEach((element, index2) => {
          if (element) {
            setTimeout(
              () => {
                element.style.position = "absolute";
              },
              index2 * DELAY_TIME + 400
            );
          }
        });
        setTimeout(
          () => {
            isHiding.value = false;
            document.querySelectorAll(".play-list-type-item").forEach((element) => {
              if (element) {
                console.log("element", element);
                element.style.position = "none";
              }
            });
          },
          (playlistCategory.value?.sub.length || 0 - 19) * DELAY_TIME
        );
      } else {
        document.querySelectorAll(".play-list-type-item").forEach((element) => {
          if (element) {
            element.style.position = "none";
          }
        });
      }
    });
    const loadPlaylistCategory = async () => {
      const { data } = await getPlaylistCategory();
      playlistCategory.value = data;
    };
    const router2 = useRouter();
    const handleClickPlaylistType = (type) => {
      router2.push({
        path: "/list",
        query: {
          type
        }
      });
    };
    const isHiding = ref(false);
    const handleToggleShowAllPlaylistCategory = () => {
      isShowAllPlaylistCategory.value = !isShowAllPlaylistCategory.value;
      if (!isShowAllPlaylistCategory.value) {
        isHiding.value = true;
      }
    };
    onMounted(() => {
      loadPlaylistCategory();
    });
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1$4, [
        createBaseVNode("div", {
          class: normalizeClass(["title", unref(setAnimationClass)("animate__fadeInLeft")])
        }, "歌单分类", 2),
        createBaseVNode("div", null, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(playlistCategory.value?.sub, (item, index2) => {
            return withDirectives((openBlock(), createElementBlock("span", {
              key: item.name,
              class: normalizeClass([
                "play-list-type-item",
                unref(setAnimationClass)(
                  index2 <= 19 ? "animate__bounceIn" : !isShowAllPlaylistCategory.value ? "animate__backOutLeft" : "animate__bounceIn"
                ) + " type-item-" + index2
              ]),
              style: normalizeStyle(getAnimationDelay.value(index2)),
              onClick: ($event) => handleClickPlaylistType(item.name)
            }, toDisplayString(item.name), 15, _hoisted_2$3)), [
              [vShow, isShowAllPlaylistCategory.value || index2 <= 19 || isHiding.value]
            ]);
          }), 128)),
          createBaseVNode("div", {
            class: normalizeClass(["play-list-type-showall", unref(setAnimationClass)("animate__bounceIn")]),
            style: normalizeStyle(
              unref(setAnimationDelay)(
                !isShowAllPlaylistCategory.value ? 25 : playlistCategory.value?.sub.length || 100 + 30
              )
            ),
            onClick: handleToggleShowAllPlaylistCategory
          }, toDisplayString(!isShowAllPlaylistCategory.value ? "显示全部" : "隐藏一些"), 7)
        ])
      ]);
    };
  }
});
const PlaylistType = /* @__PURE__ */ _export_sfc(_sfc_main$4, [["__scopeId", "data-v-686a7f41"]]);
const _hoisted_1$3 = { class: "recommend-album" };
const _hoisted_2$2 = { class: "recommend-album-list" };
const _hoisted_3$1 = ["onClick"];
const _hoisted_4$1 = { class: "recommend-album-list-item-content" };
const _sfc_main$3 = /* @__PURE__ */ defineComponent({
  __name: "RecommendAlbum",
  setup(__props) {
    const albumData = ref();
    const loadAlbumList = async () => {
      const { data } = await getNewAlbum();
      albumData.value = data;
    };
    const showMusic = ref(false);
    const songList = ref([]);
    const albumName = ref("");
    const loadingList = ref(false);
    const albumInfo = ref({});
    const handleClick = async (item) => {
      songList.value = [];
      albumInfo.value = {};
      albumName.value = item.name;
      loadingList.value = true;
      showMusic.value = true;
      const res = await getAlbum(item.id);
      songList.value = res.data.songs.map((song) => {
        song.al.picUrl = song.al.picUrl || item.picUrl;
        return song;
      });
      albumInfo.value = {
        ...res.data.album,
        creator: {
          avatarUrl: res.data.album.artist.img1v1Url,
          nickname: `${res.data.album.artist.name} - ${res.data.album.company}`
        },
        description: res.data.album.description
      };
      loadingList.value = false;
    };
    onMounted(() => {
      loadAlbumList();
    });
    return (_ctx, _cache) => {
      const _component_n_image = NImage;
      return openBlock(), createElementBlock("div", _hoisted_1$3, [
        createBaseVNode("div", {
          class: normalizeClass(["title", unref(setAnimationClass)("animate__fadeInRight")])
        }, "最新专辑", 2),
        createBaseVNode("div", _hoisted_2$2, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(albumData.value?.albums, (item, index2) => {
            return openBlock(), createElementBlock(Fragment, {
              key: item.id
            }, [
              index2 < 6 ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: normalizeClass(["recommend-album-list-item", unref(setAnimationClass)("animate__backInUp")]),
                style: normalizeStyle(unref(setAnimationDelay)(index2, 100)),
                onClick: ($event) => handleClick(item)
              }, [
                createVNode(_component_n_image, {
                  class: "recommend-album-list-item-img",
                  src: unref(getImgUrl)(item.blurPicUrl, "200y200"),
                  lazy: "",
                  "preview-disabled": ""
                }, null, 8, ["src"]),
                createBaseVNode("div", _hoisted_4$1, toDisplayString(item.name), 1)
              ], 14, _hoisted_3$1)) : createCommentVNode("", true)
            ], 64);
          }), 128))
        ]),
        createVNode(MusicList, {
          show: showMusic.value,
          "onUpdate:show": _cache[0] || (_cache[0] = ($event) => showMusic.value = $event),
          name: albumName.value,
          "song-list": songList.value,
          cover: false,
          loading: loadingList.value,
          "list-info": albumInfo.value
        }, null, 8, ["show", "name", "song-list", "loading", "list-info"])
      ]);
    };
  }
});
const RecommendAlbum = /* @__PURE__ */ _export_sfc(_sfc_main$3, [["__scopeId", "data-v-1df7dbee"]]);
const _hoisted_1$2 = { class: "recommend-singer" };
const _hoisted_2$1 = { class: "recommend-singer-list" };
const _hoisted_3 = { class: "mt-2" };
const _hoisted_4 = { class: "recommend-singer-item-count p-2 text-base text-gray-200 z-10" };
const _hoisted_5 = { class: "recommend-singer-item-info z-10" };
const _hoisted_6 = ["onClick"];
const _hoisted_7 = { class: "ml-4" };
const _hoisted_8 = { class: "recommend-singer-item-info-name text-el" };
const _hoisted_9 = { class: "recommend-singer-item-info-name text-el" };
const _sfc_main$2 = /* @__PURE__ */ defineComponent({
  __name: "RecommendSinger",
  setup(__props) {
    const store = useStore();
    const hotSingerData = ref();
    const dayRecommendData = ref();
    const showMusic = ref(false);
    onMounted(async () => {
      await loadData();
    });
    const loadData = async () => {
      try {
        const { data: singerData } = await getHotSinger({ offset: 0, limit: 5 });
        try {
          const {
            data: { data: dayRecommend }
          } = await getDayRecommend();
          if (dayRecommend) {
            singerData.artists = singerData.artists.slice(0, 4);
          }
          dayRecommendData.value = dayRecommend;
        } catch (error) {
          console.error("error", error);
        }
        hotSingerData.value = singerData;
      } catch (error) {
        console.error("error", error);
      }
    };
    const toSearchSinger = (keyword) => {
      router.push({
        path: "/search",
        query: {
          keyword
        }
      });
    };
    watchEffect(() => {
      if (store.state.user) {
        loadData();
      }
    });
    return (_ctx, _cache) => {
      const _component_n_scrollbar = Scrollbar;
      return openBlock(), createBlock(_component_n_scrollbar, {
        size: 100,
        "x-scrollable": true
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$2, [
            createBaseVNode("div", _hoisted_2$1, [
              dayRecommendData.value ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: normalizeClass(["recommend-singer-item relative", unref(setAnimationClass)("animate__backInRight")]),
                style: normalizeStyle(unref(setAnimationDelay)(0, 100))
              }, [
                createBaseVNode("div", {
                  style: normalizeStyle(
                    unref(setBackgroundImg)(unref(getImgUrl)(dayRecommendData.value?.dailySongs[0].al.picUrl, "500y500"))
                  ),
                  class: "recommend-singer-item-bg"
                }, null, 4),
                createBaseVNode("div", {
                  class: "recommend-singer-item-count p-2 text-base text-gray-200 z-10 cursor-pointer",
                  onClick: _cache[0] || (_cache[0] = ($event) => showMusic.value = true)
                }, [
                  _cache[3] || (_cache[3] = createBaseVNode("div", { class: "font-bold text-xl" }, "每日推荐", -1)),
                  createBaseVNode("div", _hoisted_3, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(dayRecommendData.value?.dailySongs.slice(0, 5), (item) => {
                      return openBlock(), createElementBlock("p", {
                        key: item.id,
                        class: "text-el"
                      }, [
                        createTextVNode(toDisplayString(item.name) + " ", 1),
                        _cache[2] || (_cache[2] = createBaseVNode("br", null, null, -1))
                      ]);
                    }), 128))
                  ])
                ])
              ], 6)) : createCommentVNode("", true),
              (openBlock(true), createElementBlock(Fragment, null, renderList(hotSingerData.value?.artists, (item, index2) => {
                return openBlock(), createElementBlock("div", {
                  key: item.id,
                  class: normalizeClass(["recommend-singer-item relative", unref(setAnimationClass)("animate__backInRight")]),
                  style: normalizeStyle(unref(setAnimationDelay)(index2 + 1, 100))
                }, [
                  createBaseVNode("div", {
                    style: normalizeStyle(unref(setBackgroundImg)(unref(getImgUrl)(item.picUrl, "500y500"))),
                    class: "recommend-singer-item-bg"
                  }, null, 4),
                  createBaseVNode("div", _hoisted_4, toDisplayString(item.musicSize) + "首 ", 1),
                  createBaseVNode("div", _hoisted_5, [
                    createBaseVNode("div", {
                      class: "recommend-singer-item-info-play",
                      onClick: ($event) => toSearchSinger(item.name)
                    }, _cache[4] || (_cache[4] = [
                      createBaseVNode("i", { class: "iconfont icon-playfill text-xl" }, null, -1)
                    ]), 8, _hoisted_6),
                    createBaseVNode("div", _hoisted_7, [
                      createBaseVNode("div", _hoisted_8, toDisplayString(item.name), 1),
                      createBaseVNode("div", _hoisted_9, toDisplayString(item.name), 1)
                    ])
                  ])
                ], 6);
              }), 128))
            ]),
            dayRecommendData.value?.dailySongs.length ? (openBlock(), createBlock(MusicList, {
              key: 0,
              show: showMusic.value,
              "onUpdate:show": _cache[1] || (_cache[1] = ($event) => showMusic.value = $event),
              name: "每日推荐列表",
              "song-list": dayRecommendData.value?.dailySongs,
              cover: false
            }, null, 8, ["show", "song-list"])) : createCommentVNode("", true)
          ])
        ]),
        _: 1
      });
    };
  }
});
const RecommendSinger = /* @__PURE__ */ _export_sfc(_sfc_main$2, [["__scopeId", "data-v-f8da161d"]]);
const _hoisted_1$1 = { class: "recommend-music" };
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "RecommendSonglist",
  setup(__props) {
    const store = useStore();
    const recommendMusic = ref();
    const loading = ref(false);
    const loadRecommendMusic = async () => {
      loading.value = true;
      const { data } = await getRecommendMusic({ limit: 10 });
      recommendMusic.value = data;
      loading.value = false;
    };
    onMounted(() => {
      loadRecommendMusic();
    });
    const handlePlay = () => {
      store.commit("setPlayList", recommendMusic.value?.result);
    };
    return (_ctx, _cache) => {
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", {
          class: normalizeClass(["title", unref(setAnimationClass)("animate__fadeInLeft")])
        }, "本周最热音乐", 2),
        withDirectives((openBlock(), createElementBlock("div", {
          class: normalizeClass(["recommend-music-list", unref(setAnimationClass)("animate__bounceInUp")])
        }, [
          (openBlock(true), createElementBlock(Fragment, null, renderList(unref(recommendMusic)?.result, (item, index2) => {
            return openBlock(), createElementBlock("div", {
              key: item.id,
              class: normalizeClass(unref(setAnimationClass)("animate__bounceInUp")),
              style: normalizeStyle(unref(setAnimationDelay)(index2, 100))
            }, [
              createVNode(SongItem, {
                item,
                onPlay: handlePlay
              }, null, 8, ["item"])
            ], 6);
          }), 128))
        ], 2)), [
          [vShow, unref(recommendMusic)?.result],
          [_directive_loading, unref(loading)]
        ])
      ]);
    };
  }
});
const RecommendSonglist = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-ae2da107"]]);
const _hoisted_1 = { class: "main-page" };
const _hoisted_2 = { class: "main-content" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "Home"
  },
  __name: "index",
  setup(__props) {
    return (_ctx, _cache) => {
      const _component_n_scrollbar = Scrollbar;
      return openBlock(), createBlock(_component_n_scrollbar, {
        size: 100,
        "x-scrollable": false
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createVNode(RecommendSinger),
            createBaseVNode("div", _hoisted_2, [
              !unref(isMobile) ? (openBlock(), createBlock(PlaylistType, { key: 0 })) : createCommentVNode("", true),
              createVNode(RecommendSonglist),
              createBaseVNode("div", null, [
                createVNode(Favorite, { "is-component": "" }),
                createVNode(RecommendAlbum)
              ])
            ])
          ])
        ]),
        _: 1
      });
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-b0ca1b97"]]);
export {
  index as default
};
