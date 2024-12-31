import { ad as request, d as defineComponent, r as ref, G as computed, E as watch, O as createBlock, f as withCtx, u as unref, g as useStore, j as openBlock, b as createBaseVNode, e as createVNode, t as toDisplayString, a7 as getImgUrl, n as normalizeClass, s as setAnimationClass, c as createElementBlock, T as createCommentVNode, U as PlayBottom, a4 as renderList, a2 as normalizeStyle, a3 as Fragment, ac as isMobile, a5 as setAnimationDelay, S as Scrollbar, aj as __unplugin_components_0, am as getMusicDetail, _ as _export_sfc } from "./index-DKaFsuse.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import { _ as __unplugin_components_2 } from "./Drawer-BEJ8Ydua.js";
import { _ as __unplugin_components_2$2 } from "./Avatar-rQ2og-6c.js";
import { _ as __unplugin_components_2$1 } from "./Ellipsis-D4R5dIX2.js";
import { N as NImage } from "./Image-DXClIklC.js";
function getListByCat(params) {
  return request.get("/top/playlist", {
    params
  });
}
function getListDetail(id) {
  return request.get("/playlist/detail", { params: { id } });
}
function getAlbum(id) {
  return request.get("/album", { params: { id } });
}
const _hoisted_1 = { class: "music-page" };
const _hoisted_2 = { class: "music-header h-12 flex items-center justify-between" };
const _hoisted_3 = { class: "music-title" };
const _hoisted_4 = { class: "music-content" };
const _hoisted_5 = { class: "music-info" };
const _hoisted_6 = { class: "music-cover" };
const _hoisted_7 = {
  key: 0,
  class: "creator-info"
};
const _hoisted_8 = { class: "creator-name" };
const _hoisted_9 = {
  key: 0,
  class: "music-desc"
};
const _hoisted_10 = { class: "music-list-container" };
const _hoisted_11 = { class: "music-list" };
const _hoisted_12 = { class: "music-list-content" };
const _hoisted_13 = {
  key: 0,
  class: "loading-more"
};
const pageSize = 20;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MusicList",
  props: {
    show: { type: Boolean },
    name: {},
    songList: {},
    loading: { type: Boolean, default: false },
    listInfo: {},
    cover: { type: Boolean, default: true }
  },
  emits: ["update:show", "update:loading"],
  setup(__props, { emit: __emit }) {
    const store = useStore();
    const props = __props;
    const emit = __emit;
    const page = ref(0);
    const isLoadingMore = ref(false);
    const displayedSongs = ref([]);
    const loadingList = ref(false);
    const total = computed(() => {
      if (props.listInfo?.trackIds) {
        return props.listInfo.trackIds.length;
      }
      return props.songList.length;
    });
    const formatDetail = computed(() => (detail) => {
      const song = {
        artists: detail.ar,
        name: detail.al.name,
        id: detail.al.id
      };
      detail.song = song;
      detail.picUrl = detail.al.picUrl;
      return detail;
    });
    const handlePlay = () => {
      const tracks = props.songList || [];
      store.commit(
        "setPlayList",
        tracks.map((item) => ({
          ...item,
          picUrl: item.al.picUrl,
          song: {
            artists: item.ar
          }
        }))
      );
    };
    const close = () => {
      emit("update:show", false);
    };
    const loadMoreSongs = async () => {
      if (isLoadingMore.value || displayedSongs.value.length >= total.value) return;
      isLoadingMore.value = true;
      try {
        if (props.listInfo?.trackIds) {
          const start = page.value * pageSize;
          const end = Math.min((page.value + 1) * pageSize, total.value);
          const trackIds = props.listInfo.trackIds.slice(start, end).map((item) => item.id);
          if (trackIds.length > 0) {
            const { data } = await getMusicDetail(trackIds);
            displayedSongs.value = [...displayedSongs.value, ...data.songs];
            page.value++;
          }
        } else {
          const start = page.value * pageSize;
          const end = Math.min((page.value + 1) * pageSize, props.songList.length);
          const newSongs = props.songList.slice(start, end);
          displayedSongs.value = [...displayedSongs.value, ...newSongs];
          page.value++;
        }
      } catch (error) {
        console.error("加载歌曲失败:", error);
      } finally {
        isLoadingMore.value = false;
        loadingList.value = false;
      }
    };
    const getItemAnimationDelay = (index) => {
      const currentPageIndex = index % pageSize;
      return setAnimationDelay(currentPageIndex, 20);
    };
    const handleScroll = (e) => {
      const target = e.target;
      if (!target) return;
      const { scrollTop, scrollHeight, clientHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < 100 && !isLoadingMore.value) {
        loadMoreSongs();
      }
    };
    watch(
      () => props.show,
      (newVal) => {
        loadingList.value = newVal;
        if (!props.cover) {
          loadingList.value = false;
        }
      }
    );
    watch(
      () => props.songList,
      (newSongs) => {
        page.value = 0;
        displayedSongs.value = newSongs.slice(0, pageSize);
        if (newSongs.length > pageSize) {
          page.value = 1;
        }
        loadingList.value = false;
      },
      { immediate: true }
    );
    return (_ctx, _cache) => {
      const _component_n_ellipsis = __unplugin_components_2$1;
      const _component_n_image = NImage;
      const _component_n_avatar = __unplugin_components_2$2;
      const _component_n_scrollbar = Scrollbar;
      const _component_n_spin = __unplugin_components_0;
      const _component_n_drawer = __unplugin_components_2;
      return openBlock(), createBlock(_component_n_drawer, {
        show: _ctx.show,
        height: unref(isMobile) ? "100%" : "80%",
        placement: "bottom",
        "block-scroll": "",
        "mask-closable": "",
        style: { backgroundColor: "transparent" },
        to: `#layout-main`,
        onMaskClick: close
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              createVNode(_component_n_ellipsis, { "line-clamp": 1 }, {
                default: withCtx(() => [
                  createBaseVNode("div", _hoisted_3, toDisplayString(_ctx.name), 1)
                ]),
                _: 1
              }),
              createBaseVNode("div", { class: "music-close" }, [
                createBaseVNode("i", {
                  class: "icon iconfont icon-icon_error",
                  onClick: close
                })
              ])
            ]),
            createBaseVNode("div", _hoisted_4, [
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("div", _hoisted_6, [
                  createVNode(_component_n_image, {
                    src: unref(getImgUrl)(_ctx.cover ? _ctx.listInfo?.coverImgUrl : unref(displayedSongs)[0]?.picUrl, "500y500"),
                    class: normalizeClass(["cover-img", unref(setAnimationClass)("animate__fadeIn")]),
                    "preview-disabled": "",
                    "object-fit": "cover"
                  }, null, 8, ["src", "class"])
                ]),
                _ctx.listInfo?.creator ? (openBlock(), createElementBlock("div", _hoisted_7, [
                  createVNode(_component_n_avatar, {
                    round: "",
                    size: 24,
                    src: unref(getImgUrl)(_ctx.listInfo.creator.avatarUrl, "50y50")
                  }, null, 8, ["src"]),
                  createBaseVNode("span", _hoisted_8, toDisplayString(_ctx.listInfo.creator.nickname), 1)
                ])) : createCommentVNode("", true),
                createVNode(_component_n_scrollbar, { style: { "max-height": "200" } }, {
                  default: withCtx(() => [
                    _ctx.listInfo?.description ? (openBlock(), createElementBlock("div", _hoisted_9, toDisplayString(_ctx.listInfo.description), 1)) : createCommentVNode("", true),
                    createVNode(PlayBottom)
                  ]),
                  _: 1
                })
              ]),
              createBaseVNode("div", _hoisted_10, [
                createBaseVNode("div", _hoisted_11, [
                  createVNode(_component_n_scrollbar, { onScroll: handleScroll }, {
                    default: withCtx(() => [
                      createVNode(_component_n_spin, {
                        show: unref(loadingList) || _ctx.loading
                      }, {
                        default: withCtx(() => [
                          createBaseVNode("div", _hoisted_12, [
                            (openBlock(true), createElementBlock(Fragment, null, renderList(unref(displayedSongs), (item, index) => {
                              return openBlock(), createElementBlock("div", {
                                key: item.id,
                                class: normalizeClass(["double-item", unref(setAnimationClass)("animate__bounceInUp")]),
                                style: normalizeStyle(getItemAnimationDelay(index))
                              }, [
                                createVNode(SongItem, {
                                  item: unref(formatDetail)(item),
                                  onPlay: handlePlay
                                }, null, 8, ["item"])
                              ], 6);
                            }), 128)),
                            unref(isLoadingMore) ? (openBlock(), createElementBlock("div", _hoisted_13, "加载更多...")) : createCommentVNode("", true),
                            createVNode(PlayBottom)
                          ])
                        ]),
                        _: 1
                      }, 8, ["show"])
                    ]),
                    _: 1
                  })
                ]),
                createVNode(PlayBottom)
              ])
            ])
          ])
        ]),
        _: 1
      }, 8, ["show", "height"]);
    };
  }
});
const MusicList = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-1b137c3d"]]);
export {
  MusicList as M,
  getListDetail as a,
  getListByCat as b,
  getAlbum as g
};
