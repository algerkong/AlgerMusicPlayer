import { F as Favorite } from "./index-JJypdZPY.js";
import { d as defineComponent, al as useMusicHistory, r as ref, o as onMounted, c as createElementBlock, b as createBaseVNode, n as normalizeClass, u as unref, e as createVNode, f as withCtx, am as getMusicDetail, S as Scrollbar, g as useStore, j as openBlock, s as setAnimationClass, a3 as Fragment, a4 as renderList, a2 as normalizeStyle, a5 as setAnimationDelay, t as toDisplayString, T as createCommentVNode, aj as __unplugin_components_0, _ as _export_sfc } from "./index-DKaFsuse.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import "./use-locale-DLWAOXez.js";
import "./Image-DXClIklC.js";
import "./Ellipsis-D4R5dIX2.js";
const _hoisted_1$1 = { class: "history-page" };
const _hoisted_2 = { class: "history-item-count min-w-[60px]" };
const _hoisted_3 = { class: "history-item-delete" };
const _hoisted_4 = ["onClick"];
const _hoisted_5 = {
  key: 0,
  class: "loading-wrapper"
};
const _hoisted_6 = {
  key: 1,
  class: "no-more-tip"
};
const pageSize = 20;
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  ...{
    name: "History"
  },
  __name: "index",
  setup(__props) {
    const store = useStore();
    const { delMusic, musicList } = useMusicHistory();
    const scrollbarRef = ref();
    const loading = ref(false);
    const noMore = ref(false);
    const displayList = ref([]);
    const currentPage = ref(1);
    const getHistorySongs = async () => {
      if (musicList.value.length === 0) {
        displayList.value = [];
        return;
      }
      loading.value = true;
      try {
        const startIndex = (currentPage.value - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const currentPageItems = musicList.value.slice(startIndex, endIndex);
        const currentIds = currentPageItems.map((item) => item.id);
        const res = await getMusicDetail(currentIds);
        if (res.data.songs) {
          const newSongs = res.data.songs.map((song) => {
            const historyItem = currentPageItems.find((item) => item.id === song.id);
            return {
              ...song,
              picUrl: song.al?.picUrl || "",
              count: historyItem?.count || 0
            };
          });
          if (currentPage.value === 1) {
            displayList.value = newSongs;
          } else {
            displayList.value = [...displayList.value, ...newSongs];
          }
          noMore.value = displayList.value.length >= musicList.value.length;
        }
      } catch (error) {
        console.error("获取历史记录失败:", error);
      } finally {
        loading.value = false;
      }
    };
    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, offsetHeight } = e.target;
      const threshold = 100;
      if (!loading.value && !noMore.value && scrollHeight - (scrollTop + offsetHeight) < threshold) {
        currentPage.value++;
        getHistorySongs();
      }
    };
    const handlePlay = () => {
      store.commit("setPlayList", displayList.value);
    };
    onMounted(() => {
      getHistorySongs();
    });
    const handleDelMusic = async (item) => {
      delMusic(item);
      musicList.value = musicList.value.filter((music) => music.id !== item.id);
      displayList.value = displayList.value.filter((music) => music.id !== item.id);
    };
    return (_ctx, _cache) => {
      const _component_n_spin = __unplugin_components_0;
      const _component_n_scrollbar = Scrollbar;
      return openBlock(), createElementBlock("div", _hoisted_1$1, [
        createBaseVNode("div", {
          class: normalizeClass(["title", unref(setAnimationClass)("animate__fadeInRight")])
        }, "播放历史", 2),
        createVNode(_component_n_scrollbar, {
          ref_key: "scrollbarRef",
          ref: scrollbarRef,
          size: 100,
          onScroll: handleScroll
        }, {
          default: withCtx(() => [
            createBaseVNode("div", {
              class: normalizeClass(["history-list-content", unref(setAnimationClass)("animate__bounceInLeft")])
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(displayList.value, (item, index2) => {
                return openBlock(), createElementBlock("div", {
                  key: item.id,
                  class: normalizeClass(["history-item", unref(setAnimationClass)("animate__bounceInRight")]),
                  style: normalizeStyle(unref(setAnimationDelay)(index2, 30))
                }, [
                  createVNode(SongItem, {
                    class: "history-item-content",
                    item,
                    onPlay: handlePlay
                  }, null, 8, ["item"]),
                  createBaseVNode("div", _hoisted_2, toDisplayString(item.count), 1),
                  createBaseVNode("div", _hoisted_3, [
                    createBaseVNode("i", {
                      class: "iconfont icon-close",
                      onClick: ($event) => handleDelMusic(item)
                    }, null, 8, _hoisted_4)
                  ])
                ], 6);
              }), 128)),
              loading.value ? (openBlock(), createElementBlock("div", _hoisted_5, [
                createVNode(_component_n_spin, { size: "large" })
              ])) : createCommentVNode("", true),
              noMore.value ? (openBlock(), createElementBlock("div", _hoisted_6, "没有更多了")) : createCommentVNode("", true)
            ], 2)
          ]),
          _: 1
        }, 512)
      ]);
    };
  }
});
const History = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-7e434221"]]);
const _hoisted_1 = { class: "flex gap-4 h-full pb-4" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createVNode(Favorite, { class: "flex-item" }),
        createVNode(History, { class: "flex-item" })
      ]);
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-36d023b3"]]);
export {
  index as default
};
