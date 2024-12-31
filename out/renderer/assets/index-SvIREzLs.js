import { d as defineComponent, r as ref, E as watch, o as onMounted, G as computed, c as createElementBlock, b as createBaseVNode, e as createVNode, f as withCtx, S as Scrollbar, g as useStore, ae as audioService, ab as resolveDirective, j as openBlock, a3 as Fragment, a4 as renderList, n as normalizeClass, u as unref, s as setAnimationClass, a2 as normalizeStyle, t as toDisplayString, w as withDirectives, a7 as getImgUrl, ai as formatNumber, T as createCommentVNode, a5 as setAnimationDelay, _ as _export_sfc } from "./index-DKaFsuse.js";
import { g as getTopMv, a as getAllMv, M as MvPlayer } from "./MvPlayer-I4IDK1xL.js";
import { N as NImage } from "./Image-DXClIklC.js";
import "./Icon-DucaliTK.js";
import "./Slider-BA6NituQ.js";
import "./use-locale-DLWAOXez.js";
import "./Drawer-BEJ8Ydua.js";
import "./Ellipsis-D4R5dIX2.js";
const _hoisted_1 = { class: "mv-list" };
const _hoisted_2 = { class: "play-list-type" };
const _hoisted_3 = { class: "categories-wrapper" };
const _hoisted_4 = ["onClick"];
const _hoisted_5 = ["onClick"];
const _hoisted_6 = { class: "top" };
const _hoisted_7 = { class: "play-count" };
const _hoisted_8 = { class: "mv-item-title" };
const _hoisted_9 = {
  key: 0,
  class: "loading-more"
};
const _hoisted_10 = {
  key: 1,
  class: "no-more"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "Mv"
  },
  __name: "index",
  setup(__props) {
    const showMv = ref(false);
    const mvList = ref([]);
    const playMvItem = ref();
    const store = useStore();
    const initLoading = ref(false);
    const loadingMore = ref(false);
    const currentIndex = ref(0);
    const offset = ref(0);
    const limit = ref(42);
    const hasMore = ref(true);
    const categories = [
      { label: "全部", value: "全部" },
      { label: "内地", value: "内地" },
      { label: "港台", value: "港台" },
      { label: "欧美", value: "欧美" },
      { label: "日本", value: "日本" },
      { label: "韩国", value: "韩国" }
    ];
    const selectedCategory = ref("全部");
    watch(selectedCategory, async () => {
      offset.value = 0;
      mvList.value = [];
      hasMore.value = true;
      await loadMvList();
    });
    const getAnimationDelay = (index2) => {
      const currentPageIndex = index2 % limit.value;
      return setAnimationDelay(currentPageIndex, 30);
    };
    onMounted(async () => {
      await loadMvList();
    });
    const handleShowMv = async (item, index2) => {
      store.commit("setIsPlay", false);
      store.commit("setPlayMusic", false);
      audioService.getCurrentSound()?.pause();
      showMv.value = true;
      currentIndex.value = index2;
      playMvItem.value = item;
    };
    const playPrevMv = async (setLoading) => {
      try {
        if (currentIndex.value > 0) {
          const prevItem = mvList.value[currentIndex.value - 1];
          await handleShowMv(prevItem, currentIndex.value - 1);
        }
      } finally {
        setLoading(false);
      }
    };
    const playNextMv = async (setLoading) => {
      try {
        if (currentIndex.value < mvList.value.length - 1) {
          const nextItem = mvList.value[currentIndex.value + 1];
          await handleShowMv(nextItem, currentIndex.value + 1);
        } else if (hasMore.value) {
          await loadMvList();
          if (mvList.value.length > currentIndex.value + 1) {
            const nextItem = mvList.value[currentIndex.value + 1];
            await handleShowMv(nextItem, currentIndex.value + 1);
          } else {
            showMv.value = false;
          }
        } else {
          showMv.value = false;
        }
      } catch (error) {
        console.error("加载更多MV失败:", error);
        showMv.value = false;
      } finally {
        setLoading(false);
      }
    };
    const loadMvList = async () => {
      try {
        if (!hasMore.value || loadingMore.value) return;
        if (offset.value === 0) {
          initLoading.value = true;
        } else {
          loadingMore.value = true;
        }
        const params = {
          limit: limit.value,
          offset: offset.value,
          area: selectedCategory.value === "全部" ? "" : selectedCategory.value
        };
        const res = selectedCategory.value === "全部" ? await getTopMv(params) : await getAllMv(params);
        const { data } = res.data;
        mvList.value.push(...data);
        hasMore.value = data.length === limit.value;
        offset.value += limit.value;
      } finally {
        initLoading.value = false;
        loadingMore.value = false;
      }
    };
    const handleScroll = (e) => {
      const target = e.target;
      const { scrollTop, clientHeight, scrollHeight } = target;
      const threshold = 100;
      if (scrollHeight - (scrollTop + clientHeight) < threshold) {
        loadMvList();
      }
    };
    const isPrevDisabled = computed(() => currentIndex.value === 0);
    return (_ctx, _cache) => {
      const _component_n_scrollbar = Scrollbar;
      const _component_n_image = NImage;
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          createVNode(_component_n_scrollbar, { "x-scrollable": "" }, {
            default: withCtx(() => [
              createBaseVNode("div", _hoisted_3, [
                (openBlock(), createElementBlock(Fragment, null, renderList(categories, (category, index2) => {
                  return createBaseVNode("span", {
                    key: category.value,
                    class: normalizeClass(["play-list-type-item", [
                      unref(setAnimationClass)("animate__bounceIn"),
                      { active: selectedCategory.value === category.value }
                    ]]),
                    style: normalizeStyle(getAnimationDelay(index2)),
                    onClick: ($event) => selectedCategory.value = category.value
                  }, toDisplayString(category.label), 15, _hoisted_4);
                }), 64))
              ])
            ]),
            _: 1
          })
        ]),
        createVNode(_component_n_scrollbar, {
          size: 100,
          onScroll: handleScroll
        }, {
          default: withCtx(() => [
            withDirectives((openBlock(), createElementBlock("div", {
              class: normalizeClass(["mv-list-content", unref(setAnimationClass)("animate__bounceInLeft")])
            }, [
              (openBlock(true), createElementBlock(Fragment, null, renderList(mvList.value, (item, index2) => {
                return openBlock(), createElementBlock("div", {
                  key: item.id,
                  class: normalizeClass(["mv-item", unref(setAnimationClass)("animate__bounceIn")]),
                  style: normalizeStyle(getAnimationDelay(index2))
                }, [
                  createBaseVNode("div", {
                    class: "mv-item-img",
                    onClick: ($event) => handleShowMv(item, index2)
                  }, [
                    createVNode(_component_n_image, {
                      class: "mv-item-img-img",
                      src: unref(getImgUrl)(item.cover, "320y180"),
                      lazy: "",
                      "preview-disabled": ""
                    }, null, 8, ["src"]),
                    createBaseVNode("div", _hoisted_6, [
                      createBaseVNode("div", _hoisted_7, toDisplayString(unref(formatNumber)(item.playCount)), 1),
                      _cache[1] || (_cache[1] = createBaseVNode("i", { class: "iconfont icon-videofill" }, null, -1))
                    ])
                  ], 8, _hoisted_5),
                  createBaseVNode("div", _hoisted_8, toDisplayString(item.name), 1)
                ], 6);
              }), 128)),
              loadingMore.value ? (openBlock(), createElementBlock("div", _hoisted_9, "加载中...")) : createCommentVNode("", true),
              !hasMore.value && !initLoading.value ? (openBlock(), createElementBlock("div", _hoisted_10, "没有更多了")) : createCommentVNode("", true)
            ], 2)), [
              [_directive_loading, initLoading.value]
            ])
          ]),
          _: 1
        }),
        createVNode(MvPlayer, {
          show: showMv.value,
          "onUpdate:show": _cache[0] || (_cache[0] = ($event) => showMv.value = $event),
          "current-mv": playMvItem.value,
          "is-prev-disabled": isPrevDisabled.value,
          onNext: playNextMv,
          onPrev: playPrevMv
        }, null, 8, ["show", "current-mv", "is-prev-disabled"])
      ]);
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-7366dc5a"]]);
export {
  index as default
};
