import { r as ref, G as computed, D as useMemo, $ as provide, d as defineComponent, as as inject, at as useSsrAdapter, o as onMounted, aq as onActivated, au as onDeactivated, A as toRef, av as depx, aw as pxfy, l as h, ax as mergeProps, ay as VResizeObserver, az as XScrollbar, aA as store, ae as audioService, aB as getTextColors, E as watch, M as nextTick, R as isElectron, a1 as onUnmounted, aC as getHoverBackgroundColor, aD as animateGradient, a as onBeforeUnmount, j as openBlock, O as createBlock, f as withCtx, b as createBaseVNode, a2 as normalizeStyle, u as unref, e as createVNode, a7 as getImgUrl, t as toDisplayString, c as createElementBlock, a3 as Fragment, a4 as renderList, n as normalizeClass, T as createCommentVNode, aE as useDebounceFn, _ as _export_sfc, g as useStore, aF as useThrottleFn, aG as useTemplateRef, i as isRef, k as createTextVNode, ac as isMobile, s as setAnimationClass, aH as secondToMinute } from "./index-DKaFsuse.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import { N as NImage, _ as __unplugin_components_3, a as __unplugin_components_5 } from "./Image-DXClIklC.js";
import { _ as __unplugin_components_1 } from "./Layout-CvYBg1vI.js";
import { _ as __unplugin_components_2 } from "./Drawer-BEJ8Ydua.js";
import { c as cssrAnchorMetaName, a as c, b as beforeNextFrameOnce } from "./use-locale-DLWAOXez.js";
import { _ as __unplugin_components_0 } from "./Slider-BA6NituQ.js";
import { _ as __unplugin_components_2$1 } from "./Ellipsis-D4R5dIX2.js";
function lowBit(n) {
  return n & -n;
}
class FinweckTree {
  /**
   * @param l length of the array
   * @param min min value of the array
   */
  constructor(l, min) {
    this.l = l;
    this.min = min;
    const ft = new Array(l + 1);
    for (let i = 0; i < l + 1; ++i) {
      ft[i] = 0;
    }
    this.ft = ft;
  }
  /**
   * Add arr[i] by n, start from 0
   * @param i the index of the element to be added
   * @param n the value to be added
   */
  add(i, n) {
    if (n === 0)
      return;
    const { l, ft } = this;
    i += 1;
    while (i <= l) {
      ft[i] += n;
      i += lowBit(i);
    }
  }
  /**
   * Get the value of index i
   * @param i index
   * @returns value of the index
   */
  get(i) {
    return this.sum(i + 1) - this.sum(i);
  }
  /**
   * Get the sum of first i elements
   * @param i count of head elements to be added
   * @returns the sum of first i elements
   */
  sum(i) {
    if (i === void 0)
      i = this.l;
    if (i <= 0)
      return 0;
    const { ft, min, l } = this;
    if (i > l)
      throw new Error("[FinweckTree.sum]: `i` is larger than length.");
    let ret = i * min;
    while (i > 0) {
      ret += ft[i];
      i -= lowBit(i);
    }
    return ret;
  }
  /**
   * Get the largest count of head elements whose sum are <= threshold
   * @param threshold
   * @returns the largest count of head elements whose sum are <= threshold
   */
  getBound(threshold) {
    let l = 0;
    let r = this.l;
    while (r > l) {
      const m = Math.floor((l + r) / 2);
      const sumM = this.sum(m);
      if (sumM > threshold) {
        r = m;
        continue;
      } else if (sumM < threshold) {
        if (l === m) {
          if (this.sum(l + 1) <= threshold)
            return l + 1;
          return m;
        }
        l = m;
      } else {
        return m;
      }
    }
    return l;
  }
}
let maybeTouch;
function ensureMaybeTouch() {
  if (typeof document === "undefined")
    return false;
  if (maybeTouch === void 0) {
    if ("matchMedia" in window) {
      maybeTouch = window.matchMedia("(pointer:coarse)").matches;
    } else {
      maybeTouch = false;
    }
  }
  return maybeTouch;
}
let wheelScale;
function ensureWheelScale() {
  if (typeof document === "undefined")
    return 1;
  if (wheelScale === void 0) {
    wheelScale = "chrome" in window ? window.devicePixelRatio : 1;
  }
  return wheelScale;
}
const xScrollInjextionKey = "VVirtualListXScroll";
function setupXScroll({ columnsRef, renderColRef, renderItemWithColsRef }) {
  const listWidthRef = ref(0);
  const scrollLeftRef = ref(0);
  const xFinweckTreeRef = computed(() => {
    const columns = columnsRef.value;
    if (columns.length === 0) {
      return null;
    }
    const ft = new FinweckTree(columns.length, 0);
    columns.forEach((column, index) => {
      ft.add(index, column.width);
    });
    return ft;
  });
  const startIndexRef = useMemo(() => {
    const xFinweckTree = xFinweckTreeRef.value;
    if (xFinweckTree !== null) {
      return Math.max(xFinweckTree.getBound(scrollLeftRef.value) - 1, 0);
    } else {
      return 0;
    }
  });
  const getLeft = (index) => {
    const xFinweckTree = xFinweckTreeRef.value;
    if (xFinweckTree !== null) {
      return xFinweckTree.sum(index);
    } else {
      return 0;
    }
  };
  const endIndexRef = useMemo(() => {
    const xFinweckTree = xFinweckTreeRef.value;
    if (xFinweckTree !== null) {
      return Math.min(xFinweckTree.getBound(scrollLeftRef.value + listWidthRef.value) + 1, columnsRef.value.length - 1);
    } else {
      return 0;
    }
  });
  provide(xScrollInjextionKey, {
    startIndexRef,
    endIndexRef,
    columnsRef,
    renderColRef,
    renderItemWithColsRef,
    getLeft
  });
  return {
    listWidthRef,
    scrollLeftRef
  };
}
const VirtualListRow = defineComponent({
  name: "VirtualListRow",
  props: {
    index: { type: Number, required: true },
    item: {
      type: Object,
      required: true
    }
  },
  setup() {
    const { startIndexRef, endIndexRef, columnsRef, getLeft, renderColRef, renderItemWithColsRef } = (
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      inject(xScrollInjextionKey)
    );
    return {
      startIndex: startIndexRef,
      endIndex: endIndexRef,
      columns: columnsRef,
      renderCol: renderColRef,
      renderItemWithCols: renderItemWithColsRef,
      getLeft
    };
  },
  render() {
    const { startIndex, endIndex, columns, renderCol, renderItemWithCols, getLeft, item } = this;
    if (renderItemWithCols != null) {
      return renderItemWithCols({
        itemIndex: this.index,
        startColIndex: startIndex,
        endColIndex: endIndex,
        allColumns: columns,
        item,
        getLeft
      });
    }
    if (renderCol != null) {
      const items = [];
      for (let i = startIndex; i <= endIndex; ++i) {
        const column = columns[i];
        items.push(renderCol({ column, left: getLeft(i), item }));
      }
      return items;
    }
    return null;
  }
});
const styles = c(".v-vl", {
  maxHeight: "inherit",
  height: "100%",
  overflow: "auto",
  minWidth: "1px"
  // a zero width container won't be scrollable
}, [
  c("&:not(.v-vl--show-scrollbar)", {
    scrollbarWidth: "none"
  }, [
    c("&::-webkit-scrollbar, &::-webkit-scrollbar-track-piece, &::-webkit-scrollbar-thumb", {
      width: 0,
      height: 0,
      display: "none"
    })
  ])
]);
const VVirtualList = defineComponent({
  name: "VirtualList",
  inheritAttrs: false,
  props: {
    showScrollbar: {
      type: Boolean,
      default: true
    },
    columns: {
      type: Array,
      default: () => []
    },
    renderCol: Function,
    renderItemWithCols: Function,
    items: {
      type: Array,
      default: () => []
    },
    // it is suppose to be the min height
    itemSize: {
      type: Number,
      required: true
    },
    itemResizable: Boolean,
    itemsStyle: [String, Object],
    visibleItemsTag: {
      type: [String, Object],
      default: "div"
    },
    visibleItemsProps: Object,
    ignoreItemResize: Boolean,
    onScroll: Function,
    onWheel: Function,
    onResize: Function,
    defaultScrollKey: [Number, String],
    defaultScrollIndex: Number,
    keyField: {
      type: String,
      default: "key"
    },
    // Whether it is a good API?
    // ResizeObserver + footer & header is not enough.
    // Too complex for simple case
    paddingTop: {
      type: [Number, String],
      default: 0
    },
    paddingBottom: {
      type: [Number, String],
      default: 0
    }
  },
  setup(props) {
    const ssrAdapter = useSsrAdapter();
    styles.mount({
      id: "vueuc/virtual-list",
      head: true,
      anchorMetaName: cssrAnchorMetaName,
      ssr: ssrAdapter
    });
    onMounted(() => {
      const { defaultScrollIndex, defaultScrollKey } = props;
      if (defaultScrollIndex !== void 0 && defaultScrollIndex !== null) {
        scrollTo({ index: defaultScrollIndex });
      } else if (defaultScrollKey !== void 0 && defaultScrollKey !== null) {
        scrollTo({ key: defaultScrollKey });
      }
    });
    let isDeactivated = false;
    let activateStateInitialized = false;
    onActivated(() => {
      isDeactivated = false;
      if (!activateStateInitialized) {
        activateStateInitialized = true;
        return;
      }
      scrollTo({ top: scrollTopRef.value, left: scrollLeftRef.value });
    });
    onDeactivated(() => {
      isDeactivated = true;
      if (!activateStateInitialized) {
        activateStateInitialized = true;
      }
    });
    const totalWidthRef = useMemo(() => {
      if (props.renderCol == null && props.renderItemWithCols == null) {
        return void 0;
      }
      if (props.columns.length === 0)
        return void 0;
      let width = 0;
      props.columns.forEach((column) => {
        width += column.width;
      });
      return width;
    });
    const keyIndexMapRef = computed(() => {
      const map = /* @__PURE__ */ new Map();
      const { keyField } = props;
      props.items.forEach((item, index) => {
        map.set(item[keyField], index);
      });
      return map;
    });
    const { scrollLeftRef, listWidthRef } = setupXScroll({
      columnsRef: toRef(props, "columns"),
      renderColRef: toRef(props, "renderCol"),
      renderItemWithColsRef: toRef(props, "renderItemWithCols")
    });
    const listElRef = ref(null);
    const listHeightRef = ref(void 0);
    const keyToHeightOffset = /* @__PURE__ */ new Map();
    const finweckTreeRef = computed(() => {
      const { items, itemSize, keyField } = props;
      const ft = new FinweckTree(items.length, itemSize);
      items.forEach((item, index) => {
        const key = item[keyField];
        const heightOffset = keyToHeightOffset.get(key);
        if (heightOffset !== void 0) {
          ft.add(index, heightOffset);
        }
      });
      return ft;
    });
    const finweckTreeUpdateTrigger = ref(0);
    const scrollTopRef = ref(0);
    const startIndexRef = useMemo(() => {
      return Math.max(finweckTreeRef.value.getBound(scrollTopRef.value - depx(props.paddingTop)) - 1, 0);
    });
    const viewportItemsRef = computed(() => {
      const { value: listHeight } = listHeightRef;
      if (listHeight === void 0)
        return [];
      const { items, itemSize } = props;
      const startIndex = startIndexRef.value;
      const endIndex = Math.min(startIndex + Math.ceil(listHeight / itemSize + 1), items.length - 1);
      const viewportItems = [];
      for (let i = startIndex; i <= endIndex; ++i) {
        viewportItems.push(items[i]);
      }
      return viewportItems;
    });
    const scrollTo = (options, y) => {
      if (typeof options === "number") {
        scrollToPosition(options, y, "auto");
        return;
      }
      const { left, top, index, key, position, behavior, debounce = true } = options;
      if (left !== void 0 || top !== void 0) {
        scrollToPosition(left, top, behavior);
      } else if (index !== void 0) {
        scrollToIndex(index, behavior, debounce);
      } else if (key !== void 0) {
        const toIndex = keyIndexMapRef.value.get(key);
        if (toIndex !== void 0)
          scrollToIndex(toIndex, behavior, debounce);
      } else if (position === "bottom") {
        scrollToPosition(0, Number.MAX_SAFE_INTEGER, behavior);
      } else if (position === "top") {
        scrollToPosition(0, 0, behavior);
      }
    };
    let anchorIndex;
    let anchorTimerId = null;
    function scrollToIndex(index, behavior, debounce) {
      const { value: ft } = finweckTreeRef;
      const targetTop = ft.sum(index) + depx(props.paddingTop);
      if (!debounce) {
        listElRef.value.scrollTo({
          left: 0,
          top: targetTop,
          behavior
        });
      } else {
        anchorIndex = index;
        if (anchorTimerId !== null) {
          window.clearTimeout(anchorTimerId);
        }
        anchorTimerId = window.setTimeout(() => {
          anchorIndex = void 0;
          anchorTimerId = null;
        }, 16);
        const { scrollTop, offsetHeight } = listElRef.value;
        if (targetTop > scrollTop) {
          const itemSize = ft.get(index);
          if (targetTop + itemSize <= scrollTop + offsetHeight) ;
          else {
            listElRef.value.scrollTo({
              left: 0,
              top: targetTop + itemSize - offsetHeight,
              behavior
            });
          }
        } else {
          listElRef.value.scrollTo({
            left: 0,
            top: targetTop,
            behavior
          });
        }
      }
    }
    function scrollToPosition(left, top, behavior) {
      listElRef.value.scrollTo({
        left,
        top,
        behavior
      });
    }
    function handleItemResize(key, entry) {
      var _a, _b, _c;
      if (isDeactivated)
        return;
      if (props.ignoreItemResize)
        return;
      if (isHideByVShow(entry.target))
        return;
      const { value: ft } = finweckTreeRef;
      const index = keyIndexMapRef.value.get(key);
      const previousHeight = ft.get(index);
      const height = (_c = (_b = (_a = entry.borderBoxSize) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.blockSize) !== null && _c !== void 0 ? _c : entry.contentRect.height;
      if (height === previousHeight)
        return;
      const offset = height - props.itemSize;
      if (offset === 0) {
        keyToHeightOffset.delete(key);
      } else {
        keyToHeightOffset.set(key, height - props.itemSize);
      }
      const delta = height - previousHeight;
      if (delta === 0)
        return;
      ft.add(index, delta);
      const listEl = listElRef.value;
      if (listEl != null) {
        if (anchorIndex === void 0) {
          const previousHeightSum = ft.sum(index);
          if (listEl.scrollTop > previousHeightSum) {
            listEl.scrollBy(0, delta);
          }
        } else {
          if (index < anchorIndex) {
            listEl.scrollBy(0, delta);
          } else if (index === anchorIndex) {
            const previousHeightSum = ft.sum(index);
            if (height + previousHeightSum > // Note, listEl shouldn't have border, nor offsetHeight won't be
            // correct
            listEl.scrollTop + listEl.offsetHeight) {
              listEl.scrollBy(0, delta);
            }
          }
        }
        syncViewport();
      }
      finweckTreeUpdateTrigger.value++;
    }
    const mayUseWheel = !ensureMaybeTouch();
    let wheelCatched = false;
    function handleListScroll(e) {
      var _a;
      (_a = props.onScroll) === null || _a === void 0 ? void 0 : _a.call(props, e);
      if (!mayUseWheel || !wheelCatched) {
        syncViewport();
      }
    }
    function handleListWheel(e) {
      var _a;
      (_a = props.onWheel) === null || _a === void 0 ? void 0 : _a.call(props, e);
      if (mayUseWheel) {
        const listEl = listElRef.value;
        if (listEl != null) {
          if (e.deltaX === 0) {
            if (listEl.scrollTop === 0 && e.deltaY <= 0) {
              return;
            }
            if (listEl.scrollTop + listEl.offsetHeight >= listEl.scrollHeight && e.deltaY >= 0) {
              return;
            }
          }
          e.preventDefault();
          listEl.scrollTop += e.deltaY / ensureWheelScale();
          listEl.scrollLeft += e.deltaX / ensureWheelScale();
          syncViewport();
          wheelCatched = true;
          beforeNextFrameOnce(() => {
            wheelCatched = false;
          });
        }
      }
    }
    function handleListResize(entry) {
      if (isDeactivated)
        return;
      if (isHideByVShow(entry.target))
        return;
      if (props.renderCol == null && props.renderItemWithCols == null) {
        if (entry.contentRect.height === listHeightRef.value)
          return;
      } else {
        if (entry.contentRect.height === listHeightRef.value && entry.contentRect.width === listWidthRef.value) {
          return;
        }
      }
      listHeightRef.value = entry.contentRect.height;
      listWidthRef.value = entry.contentRect.width;
      const { onResize } = props;
      if (onResize !== void 0)
        onResize(entry);
    }
    function syncViewport() {
      const { value: listEl } = listElRef;
      if (listEl == null)
        return;
      scrollTopRef.value = listEl.scrollTop;
      scrollLeftRef.value = listEl.scrollLeft;
    }
    function isHideByVShow(el) {
      let cursor = el;
      while (cursor !== null) {
        if (cursor.style.display === "none")
          return true;
        cursor = cursor.parentElement;
      }
      return false;
    }
    return {
      listHeight: listHeightRef,
      listStyle: {
        overflow: "auto"
      },
      keyToIndex: keyIndexMapRef,
      itemsStyle: computed(() => {
        const { itemResizable } = props;
        const height = pxfy(finweckTreeRef.value.sum());
        finweckTreeUpdateTrigger.value;
        return [
          props.itemsStyle,
          {
            boxSizing: "content-box",
            width: pxfy(totalWidthRef.value),
            height: itemResizable ? "" : height,
            minHeight: itemResizable ? height : "",
            paddingTop: pxfy(props.paddingTop),
            paddingBottom: pxfy(props.paddingBottom)
          }
        ];
      }),
      visibleItemsStyle: computed(() => {
        finweckTreeUpdateTrigger.value;
        return {
          transform: `translateY(${pxfy(finweckTreeRef.value.sum(startIndexRef.value))})`
        };
      }),
      viewportItems: viewportItemsRef,
      listElRef,
      itemsElRef: ref(null),
      scrollTo,
      handleListResize,
      handleListScroll,
      handleListWheel,
      handleItemResize
    };
  },
  render() {
    const { itemResizable, keyField, keyToIndex, visibleItemsTag } = this;
    return h(VResizeObserver, {
      onResize: this.handleListResize
    }, {
      default: () => {
        var _a, _b;
        return h("div", mergeProps(this.$attrs, {
          class: ["v-vl", this.showScrollbar && "v-vl--show-scrollbar"],
          onScroll: this.handleListScroll,
          onWheel: this.handleListWheel,
          ref: "listElRef"
        }), [
          this.items.length !== 0 ? h("div", {
            ref: "itemsElRef",
            class: "v-vl-items",
            style: this.itemsStyle
          }, [
            h(visibleItemsTag, Object.assign({
              class: "v-vl-visible-items",
              style: this.visibleItemsStyle
            }, this.visibleItemsProps), {
              default: () => {
                const { renderCol, renderItemWithCols } = this;
                return this.viewportItems.map((item) => {
                  const key = item[keyField];
                  const index = keyToIndex.get(key);
                  const renderedCols = renderCol != null ? h(VirtualListRow, {
                    index,
                    item
                  }) : void 0;
                  const renderedItemWithCols = renderItemWithCols != null ? h(VirtualListRow, {
                    index,
                    item
                  }) : void 0;
                  const itemVNode = this.$slots.default({
                    item,
                    renderedCols,
                    renderedItemWithCols,
                    index
                  })[0];
                  if (itemResizable) {
                    return h(VResizeObserver, {
                      key,
                      onResize: (entry) => this.handleItemResize(key, entry)
                    }, {
                      default: () => itemVNode
                    });
                  }
                  itemVNode.key = key;
                  return itemVNode;
                });
              }
            })
          ]) : (_b = (_a = this.$slots).empty) === null || _b === void 0 ? void 0 : _b.call(_a)
        ]);
      }
    });
  }
});
const virtualListProps = {
  scrollbarProps: Object,
  items: {
    type: Array,
    default: () => []
  },
  itemSize: {
    type: Number,
    required: true
  },
  itemResizable: Boolean,
  itemsStyle: [String, Object],
  visibleItemsTag: {
    type: [String, Object],
    default: "div"
  },
  visibleItemsProps: Object,
  ignoreItemResize: Boolean,
  onScroll: Function,
  onWheel: Function,
  onResize: Function,
  defaultScrollKey: [Number, String],
  defaultScrollIndex: Number,
  keyField: {
    type: String,
    default: "key"
  },
  paddingTop: {
    type: [Number, String],
    default: 0
  },
  paddingBottom: {
    type: [Number, String],
    default: 0
  }
};
const __unplugin_components_4 = defineComponent({
  name: "VirtualList",
  props: virtualListProps,
  setup(props) {
    const scrollbarInstRef = ref(null);
    const virtualListInstRef = ref(null);
    function syncScrollbar() {
      const {
        value: scrollbarInst
      } = scrollbarInstRef;
      if (scrollbarInst) scrollbarInst.sync();
    }
    function handleScroll(e) {
      var _a;
      syncScrollbar();
      (_a = props.onScroll) === null || _a === void 0 ? void 0 : _a.call(props, e);
    }
    function handleResize(e) {
      var _a;
      syncScrollbar();
      (_a = props.onResize) === null || _a === void 0 ? void 0 : _a.call(props, e);
    }
    function handleWheel(e) {
      var _a;
      (_a = props.onWheel) === null || _a === void 0 ? void 0 : _a.call(props, e);
    }
    function scrollTo(options, y) {
      var _a, _b;
      if (typeof options === "number") {
        (_a = virtualListInstRef.value) === null || _a === void 0 ? void 0 : _a.scrollTo(options, y !== null && y !== void 0 ? y : 0);
      } else {
        (_b = virtualListInstRef.value) === null || _b === void 0 ? void 0 : _b.scrollTo(options);
      }
    }
    function getScrollContainer() {
      var _a;
      return (_a = virtualListInstRef.value) === null || _a === void 0 ? void 0 : _a.listElRef;
    }
    function getScrollContent() {
      var _a;
      return (_a = virtualListInstRef.value) === null || _a === void 0 ? void 0 : _a.itemsElRef;
    }
    return {
      scrollTo,
      scrollbarInstRef,
      virtualListInstRef,
      getScrollContainer,
      getScrollContent,
      handleScroll,
      handleResize,
      handleWheel
    };
  },
  render() {
    return h(XScrollbar, Object.assign({}, this.scrollbarProps, {
      ref: "scrollbarInstRef",
      container: this.getScrollContainer,
      content: this.getScrollContent
    }), {
      default: () => {
        return h(VVirtualList, {
          ref: "virtualListInstRef",
          showScrollbar: false,
          items: this.items,
          itemSize: this.itemSize,
          itemResizable: this.itemResizable,
          itemsStyle: this.itemsStyle,
          visibleItemsTag: this.visibleItemsTag,
          visibleItemsProps: this.visibleItemsProps,
          ignoreItemResize: this.ignoreItemResize,
          keyField: this.keyField,
          defaultScrollKey: this.defaultScrollKey,
          defaultScrollIndex: this.defaultScrollIndex,
          paddingTop: this.paddingTop,
          paddingBottom: this.paddingBottom,
          onScroll: this.handleScroll,
          onResize: this.handleResize,
          onWheel: this.handleWheel
        }, {
          default: ({
            item,
            index
          }) => {
            var _a, _b;
            return (_b = (_a = this.$slots).default) === null || _b === void 0 ? void 0 : _b.call(_a, {
              item,
              index
            });
          }
        });
      }
    });
  }
});
const windowData = window;
const lrcArray = ref([]);
const lrcTimeArray = ref([]);
const nowTime = ref(0);
const allTime = ref(0);
const nowIndex = ref(0);
const correctionTime = ref(0.4);
const currentLrcProgress = ref(0);
const playMusic = computed(() => store.state.playMusic);
const sound = ref(audioService.getCurrentSound());
const isLyricWindowOpen = ref(false);
const textColors = ref(getTextColors());
document.onkeyup = (e) => {
  const target = e.target;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
    return;
  }
  switch (e.code) {
    case "Space":
      if (store.state.play) {
        store.commit("setPlayMusic", false);
        audioService.getCurrentSound()?.pause();
      } else {
        store.commit("setPlayMusic", true);
        audioService.getCurrentSound()?.play();
      }
      break;
  }
};
watch(
  () => store.state.playMusicUrl,
  (newVal) => {
    if (newVal) {
      audioService.play(newVal);
      sound.value = audioService.getCurrentSound();
      audioServiceOn(audioService);
    }
  }
);
watch(
  () => store.state.playMusic,
  () => {
    nextTick(async () => {
      lrcArray.value = playMusic.value.lyric?.lrcArray || [];
      lrcTimeArray.value = playMusic.value.lyric?.lrcTimeArray || [];
      if (isElectron && isLyricWindowOpen.value && lrcArray.value.length > 0) {
        sendLyricToWin();
      }
    });
  },
  {
    deep: true,
    immediate: true
  }
);
const audioServiceOn = (audio) => {
  let interval = null;
  audio.onPlay(() => {
    store.commit("setPlayMusic", true);
    interval = setInterval(() => {
      nowTime.value = sound.value?.seek();
      allTime.value = sound.value?.duration();
      const newIndex = getLrcIndex(nowTime.value);
      if (newIndex !== nowIndex.value) {
        nowIndex.value = newIndex;
        currentLrcProgress.value = 0;
        if (isElectron && isLyricWindowOpen.value) {
          sendLyricToWin();
        }
      }
      if (isElectron && isLyricWindowOpen.value) {
        sendLyricToWin();
      }
    }, 50);
  });
  audio.onPause(() => {
    store.commit("setPlayMusic", false);
    clearInterval(interval);
    if (isElectron && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  });
  audio.onEnd(() => {
    if (store.state.playMode === 1) {
      audio.getCurrentSound()?.play();
    } else if (store.state.playMode === 2) {
      const { playList } = store.state;
      if (playList.length <= 1) {
        audio.getCurrentSound()?.play();
      } else {
        let randomIndex;
        do {
          randomIndex = Math.floor(Math.random() * playList.length);
        } while (randomIndex === store.state.playListIndex && playList.length > 1);
        store.state.playListIndex = randomIndex;
        store.commit("setPlay", playList[randomIndex]);
      }
    } else {
      store.commit("nextPlay");
    }
  });
};
const isPlaying = computed(() => store.state.play);
const isCurrentLrc = (index, time) => {
  const currentTime = lrcTimeArray.value[index];
  const nextTime = lrcTimeArray.value[index + 1];
  const nowTime2 = time + correctionTime.value;
  const isTrue = nowTime2 > currentTime && nowTime2 < nextTime;
  return isTrue;
};
const getLrcIndex = (time) => {
  for (let i = 0; i < lrcTimeArray.value.length; i++) {
    if (isCurrentLrc(i, time)) {
      nowIndex.value = i;
      return i;
    }
  }
  return nowIndex.value;
};
const currentLrcTiming = computed(() => {
  const start = lrcTimeArray.value[nowIndex.value] || 0;
  const end = lrcTimeArray.value[nowIndex.value + 1] || start + 1;
  return { start, end };
});
const getLrcStyle = (index) => {
  if (index === nowIndex.value) {
    return {
      backgroundImage: `linear-gradient(to right, #ffffff ${currentLrcProgress.value}%, #ffffff8a ${currentLrcProgress.value}%)`,
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      transition: "background-image 0.1s linear"
    };
  }
  return {};
};
const useLyricProgress = () => {
  let animationFrameId = null;
  const updateProgress = () => {
    if (!isPlaying.value) return;
    const currentSound = sound.value;
    if (!currentSound) return;
    const { start, end } = currentLrcTiming.value;
    const duration = end - start;
    const elapsed = currentSound.seek() - start;
    currentLrcProgress.value = Math.min(Math.max(elapsed / duration * 100, 0), 100);
    animationFrameId = requestAnimationFrame(updateProgress);
  };
  const startProgressAnimation = () => {
    if (!animationFrameId && isPlaying.value) {
      updateProgress();
    }
  };
  const stopProgressAnimation = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };
  watch(isPlaying, (newIsPlaying) => {
    if (newIsPlaying) {
      startProgressAnimation();
    } else {
      stopProgressAnimation();
    }
  });
  onMounted(() => {
    if (isPlaying.value) {
      startProgressAnimation();
    }
  });
  onUnmounted(() => {
    stopProgressAnimation();
  });
  return {
    currentLrcProgress,
    getLrcStyle
  };
};
const setAudioTime = (index) => {
  const currentSound = sound.value;
  if (!currentSound) return;
  currentSound.seek(lrcTimeArray.value[index]);
  currentSound.play();
};
watch(
  () => lrcArray.value,
  (newLrcArray) => {
    if (newLrcArray.length > 0 && isElectron && isLyricWindowOpen.value) {
      sendLyricToWin();
    }
  }
);
const sendLyricToWin = () => {
  if (!isElectron || !isLyricWindowOpen.value) {
    console.log("Cannot send lyric: electron or lyric window not available");
    return;
  }
  try {
    if (lrcArray.value.length > 0) {
      const nowIndex2 = getLrcIndex(nowTime.value);
      const updateData = {
        type: "full",
        nowIndex: nowIndex2,
        nowTime: nowTime.value,
        startCurrentTime: lrcTimeArray.value[nowIndex2],
        nextTime: lrcTimeArray.value[nowIndex2 + 1],
        isPlay: isPlaying.value,
        lrcArray: lrcArray.value,
        lrcTimeArray: lrcTimeArray.value,
        allTime: allTime.value,
        playMusic: playMusic.value
      };
      window.api.sendLyric(JSON.stringify(updateData));
    }
  } catch (error) {
    console.error("Error sending lyric update:", error);
  }
};
const openLyric = () => {
  if (!isElectron) return;
  console.log("Opening lyric window with current song:", playMusic.value?.name);
  isLyricWindowOpen.value = !isLyricWindowOpen.value;
  if (isLyricWindowOpen.value) {
    setTimeout(() => {
      window.api.openLyric();
      sendLyricToWin();
    }, 500);
    sendLyricToWin();
  } else {
    closeLyric();
  }
};
const closeLyric = () => {
  if (!isElectron) return;
  windowData.electron.ipcRenderer.send("close-lyric");
};
if (isElectron) {
  windowData.electron.ipcRenderer.on("lyric-control-back", (_, command) => {
    switch (command) {
      case "playpause":
        if (store.state.play) {
          store.commit("setPlayMusic", false);
          audioService.getCurrentSound()?.pause();
        } else {
          store.commit("setPlayMusic", true);
          audioService.getCurrentSound()?.play();
        }
        break;
      case "prev":
        store.commit("prevPlay");
        break;
      case "next":
        store.commit("nextPlay");
        break;
      case "close":
        closeLyric();
        break;
      default:
        console.log("Unknown command:", command);
        break;
    }
  });
}
const _hoisted_1$1 = { id: "drawer-target" };
const _hoisted_2$1 = { class: "music-content-name" };
const _hoisted_3$1 = { class: "music-content-singer" };
const _hoisted_4$1 = { class: "music-content" };
const _hoisted_5$1 = ["id", "onClick"];
const _hoisted_6$1 = { class: "music-lrc-text-tr" };
const _hoisted_7$1 = {
  key: 0,
  class: "music-lrc-text mt-40"
};
const _sfc_main$1 = /* @__PURE__ */ defineComponent({
  __name: "MusicFull",
  props: {
    musicFull: {
      type: Boolean,
      default: false
    },
    background: {
      type: String,
      default: ""
    }
  },
  setup(__props, { expose: __expose }) {
    const lrcSider = ref(null);
    const isMouse = ref(false);
    const lrcContainer = ref(null);
    const currentBackground = ref("");
    const animationFrame = ref(null);
    const isDark = ref(false);
    const props = __props;
    const lrcScroll = (behavior = "smooth") => {
      const nowEl = document.querySelector(`#music-lrc-text-${nowIndex.value}`);
      if (props.musicFull && !isMouse.value && nowEl && lrcContainer.value) {
        const containerRect = lrcContainer.value.getBoundingClientRect();
        const nowElRect = nowEl.getBoundingClientRect();
        const relativeTop = nowElRect.top - containerRect.top;
        const scrollTop = relativeTop - lrcSider.value.$el.getBoundingClientRect().height / 2;
        lrcSider.value.scrollTo({ top: scrollTop, behavior });
      }
    };
    const debouncedLrcScroll = useDebounceFn(lrcScroll, 200);
    const mouseOverLayout = () => {
      isMouse.value = true;
    };
    const mouseLeaveLayout = () => {
      setTimeout(() => {
        isMouse.value = false;
        lrcScroll();
      }, 2e3);
    };
    watch(nowIndex, () => {
      debouncedLrcScroll();
    });
    watch(
      () => props.musicFull,
      () => {
        if (props.musicFull) {
          nextTick(() => {
            lrcScroll("instant");
          });
        }
      }
    );
    watch(
      () => props.background,
      (newBg) => {
        if (!newBg) {
          textColors.value = getTextColors();
          document.documentElement.style.setProperty(
            "--hover-bg-color",
            getHoverBackgroundColor(false)
          );
          document.documentElement.style.setProperty("--text-color-primary", textColors.value.primary);
          document.documentElement.style.setProperty("--text-color-active", textColors.value.active);
          return;
        }
        if (currentBackground.value) {
          if (animationFrame.value) {
            cancelAnimationFrame(animationFrame.value);
          }
          animationFrame.value = animateGradient(currentBackground.value, newBg, (gradient) => {
            currentBackground.value = gradient;
          });
        } else {
          currentBackground.value = newBg;
        }
        textColors.value = getTextColors(newBg);
        isDark.value = textColors.value.active === "#000000";
        document.documentElement.style.setProperty(
          "--hover-bg-color",
          getHoverBackgroundColor(isDark.value)
        );
        document.documentElement.style.setProperty("--text-color-primary", textColors.value.primary);
        document.documentElement.style.setProperty("--text-color-active", textColors.value.active);
      },
      { immediate: true }
    );
    const { getLrcStyle: originalLrcStyle } = useLyricProgress();
    const getLrcStyle2 = (index) => {
      const colors = textColors.value || getTextColors;
      const originalStyle = originalLrcStyle(index);
      if (index === nowIndex.value) {
        return {
          ...originalStyle,
          backgroundImage: originalStyle.backgroundImage?.replace(/#ffffff/g, colors.active).replace(/#ffffff8a/g, `${colors.primary}`),
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent"
        };
      }
      return {
        color: colors.primary
      };
    };
    onBeforeUnmount(() => {
      if (animationFrame.value) {
        cancelAnimationFrame(animationFrame.value);
      }
    });
    __expose({
      lrcScroll
    });
    return (_ctx, _cache) => {
      const _component_n_image = NImage;
      const _component_n_layout = __unplugin_components_1;
      const _component_n_drawer = __unplugin_components_2;
      return openBlock(), createBlock(_component_n_drawer, {
        show: __props.musicFull,
        height: "100%",
        placement: "bottom",
        style: normalizeStyle({ background: currentBackground.value || __props.background }),
        to: `#layout-main`
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1$1, [
            _cache[1] || (_cache[1] = createBaseVNode("div", { class: "drawer-back" }, null, -1)),
            createBaseVNode("div", {
              class: "music-img",
              style: normalizeStyle({ color: unref(textColors).theme === "dark" ? "#000000" : "#ffffff" })
            }, [
              createVNode(_component_n_image, {
                ref: "PicImgRef",
                src: unref(getImgUrl)(unref(playMusic)?.picUrl, "500y500"),
                class: "img",
                lazy: "",
                "preview-disabled": ""
              }, null, 8, ["src"]),
              createBaseVNode("div", null, [
                createBaseVNode("div", _hoisted_2$1, toDisplayString(unref(playMusic).name), 1),
                createBaseVNode("div", _hoisted_3$1, [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(playMusic).ar || unref(playMusic).song.artists, (item, index) => {
                    return openBlock(), createElementBlock("span", { key: index }, toDisplayString(item.name) + toDisplayString(index < (unref(playMusic).ar || unref(playMusic).song.artists).length - 1 ? " / " : ""), 1);
                  }), 128))
                ])
              ])
            ], 4),
            createBaseVNode("div", _hoisted_4$1, [
              createVNode(_component_n_layout, {
                ref_key: "lrcSider",
                ref: lrcSider,
                class: "music-lrc",
                style: { "height": "60vh" },
                "native-scrollbar": false,
                onMouseover: mouseOverLayout,
                onMouseleave: mouseLeaveLayout
              }, {
                default: withCtx(() => [
                  createBaseVNode("div", {
                    ref_key: "lrcContainer",
                    ref: lrcContainer
                  }, [
                    (openBlock(true), createElementBlock(Fragment, null, renderList(unref(lrcArray), (item, index) => {
                      return openBlock(), createElementBlock("div", {
                        id: `music-lrc-text-${index}`,
                        key: index,
                        class: normalizeClass(["music-lrc-text", { "now-text": index === unref(nowIndex), "hover-text": item.text }]),
                        onClick: ($event) => unref(setAudioTime)(index)
                      }, [
                        createBaseVNode("span", {
                          style: normalizeStyle(getLrcStyle2(index))
                        }, toDisplayString(item.text), 5),
                        createBaseVNode("div", _hoisted_6$1, toDisplayString(item.trText), 1)
                      ], 10, _hoisted_5$1);
                    }), 128)),
                    !unref(lrcArray).length ? (openBlock(), createElementBlock("div", _hoisted_7$1, _cache[0] || (_cache[0] = [
                      createBaseVNode("span", null, "暂无歌词, 请欣赏", -1)
                    ]))) : createCommentVNode("", true)
                  ], 512)
                ]),
                _: 1
              }, 512)
            ])
          ])
        ]),
        _: 1
      }, 8, ["show", "style"]);
    };
  }
});
const MusicFull = /* @__PURE__ */ _export_sfc(_sfc_main$1, [["__scopeId", "data-v-03432cea"]]);
const _hoisted_1 = { class: "music-time custom-slider" };
const _hoisted_2 = { class: "hover-arrow" };
const _hoisted_3 = { class: "hover-content" };
const _hoisted_4 = { class: "hover-text" };
const _hoisted_5 = { class: "music-content" };
const _hoisted_6 = { class: "music-content-title" };
const _hoisted_7 = { class: "music-content-name" };
const _hoisted_8 = { class: "music-buttons" };
const _hoisted_9 = { class: "audio-button" };
const _hoisted_10 = { class: "audio-volume custom-slider" };
const _hoisted_11 = { class: "volume-slider" };
const _hoisted_12 = { class: "music-play-list" };
const _hoisted_13 = { class: "music-play-list-content" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "PlayBar",
  setup(__props) {
    const store2 = useStore();
    const playMusic2 = computed(() => store2.state.playMusic);
    const play = computed(() => store2.state.play);
    const playList = computed(() => store2.state.playList);
    const background = ref("#000");
    watch(
      () => store2.state.playMusic,
      async () => {
        background.value = playMusic2.value.backgroundColor;
      },
      { immediate: true, deep: true }
    );
    const throttledSeek = useThrottleFn((value) => {
      if (!sound.value) return;
      sound.value.seek(value);
      nowTime.value = value;
    }, 50);
    const timeSlider = computed({
      get: () => nowTime.value,
      set: throttledSeek
    });
    const formatTooltip = (value) => {
      return `${secondToMinute(value)} / ${secondToMinute(allTime.value)}`;
    };
    const audioVolume = ref(
      localStorage.getItem("volume") ? parseFloat(localStorage.getItem("volume")) : 1
    );
    const getVolumeIcon = computed(() => {
      if (audioVolume.value === 0) {
        return "ri-volume-mute-line";
      }
      if (audioVolume.value <= 0.5) {
        return "ri-volume-down-line";
      }
      return "ri-volume-up-line";
    });
    const volumeSlider = computed({
      get: () => audioVolume.value * 100,
      set: (value) => {
        if (!sound.value) return;
        localStorage.setItem("volume", (value / 100).toString());
        sound.value.volume(value / 100);
        audioVolume.value = value / 100;
      }
    });
    const mute = () => {
      if (volumeSlider.value === 0) {
        volumeSlider.value = 30;
      } else {
        volumeSlider.value = 0;
      }
    };
    const playMode = computed(() => store2.state.playMode);
    const playModeIcon = computed(() => {
      switch (playMode.value) {
        case 0:
          return "ri-repeat-2-line";
        case 1:
          return "ri-repeat-one-line";
        case 2:
          return "ri-shuffle-line";
        default:
          return "ri-repeat-2-line";
      }
    });
    const playModeText = computed(() => {
      switch (playMode.value) {
        case 0:
          return "列表循环";
        case 1:
          return "单曲循环";
        case 2:
          return "随机播放";
        default:
          return "列表循环";
      }
    });
    const togglePlayMode = () => {
      store2.commit("togglePlayMode");
    };
    function handleNext() {
      store2.commit("nextPlay");
    }
    function handlePrev() {
      store2.commit("prevPlay");
    }
    const MusicFullRef = ref(null);
    const playMusicEvent = async () => {
      if (play.value) {
        if (sound.value) {
          sound.value.pause();
        }
        store2.commit("setPlayMusic", false);
      } else {
        if (sound.value) {
          sound.value.play();
        }
        store2.commit("setPlayMusic", true);
      }
    };
    const musicFullVisible = ref(false);
    const setMusicFull = () => {
      musicFullVisible.value = !musicFullVisible.value;
    };
    const palyListRef = useTemplateRef("palyListRef");
    const scrollToPlayList = (val) => {
      if (!val) return;
      setTimeout(() => {
        palyListRef.value?.scrollTo({ top: store2.state.playListIndex * 62 });
      }, 50);
    };
    const isFavorite = computed(() => {
      return store2.state.favoriteList.includes(playMusic2.value.id);
    });
    const toggleFavorite = async (e) => {
      e.stopPropagation();
      if (isFavorite.value) {
        store2.commit("removeFromFavorite", playMusic2.value.id);
      } else {
        store2.commit("addToFavorite", playMusic2.value.id);
      }
    };
    const openLyricWindow = () => {
      openLyric();
    };
    return (_ctx, _cache) => {
      const _component_n_slider = __unplugin_components_0;
      const _component_n_image = NImage;
      const _component_n_ellipsis = __unplugin_components_2$1;
      const _component_n_tooltip = __unplugin_components_3;
      const _component_n_virtual_list = __unplugin_components_4;
      const _component_n_popover = __unplugin_components_5;
      return openBlock(), createElementBlock(Fragment, null, [
        createVNode(MusicFull, {
          ref_key: "MusicFullRef",
          ref: MusicFullRef,
          "music-full": unref(musicFullVisible),
          "onUpdate:musicFull": _cache[0] || (_cache[0] = ($event) => isRef(musicFullVisible) ? musicFullVisible.value = $event : null),
          background: unref(background)
        }, null, 8, ["music-full", "background"]),
        createBaseVNode("div", {
          class: normalizeClass([
            "music-play-bar",
            unref(setAnimationClass)("animate__bounceInUp") + " " + (unref(musicFullVisible) ? "play-bar-opcity" : "")
          ]),
          style: normalizeStyle({
            color: unref(musicFullVisible) ? unref(textColors).theme === "dark" ? "#000000" : "#ffffff" : unref(store2).state.theme === "dark" ? "#ffffff" : "#000000"
          })
        }, [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_n_slider, {
              value: unref(timeSlider),
              "onUpdate:value": _cache[1] || (_cache[1] = ($event) => isRef(timeSlider) ? timeSlider.value = $event : null),
              step: 1,
              max: unref(allTime),
              min: 0,
              "format-tooltip": formatTooltip
            }, null, 8, ["value", "max"])
          ]),
          createBaseVNode("div", {
            class: "play-bar-img-wrapper",
            onClick: setMusicFull
          }, [
            createVNode(_component_n_image, {
              src: unref(getImgUrl)(unref(playMusic2)?.picUrl, "500y500"),
              class: "play-bar-img",
              lazy: "",
              "preview-disabled": ""
            }, null, 8, ["src"]),
            createBaseVNode("div", _hoisted_2, [
              createBaseVNode("div", _hoisted_3, [
                createBaseVNode("i", {
                  class: normalizeClass(["text-3xl", unref(musicFullVisible) ? "ri-arrow-down-s-line" : "ri-arrow-up-s-line"])
                }, null, 2),
                createBaseVNode("span", _hoisted_4, toDisplayString(unref(musicFullVisible) ? "收起" : "展开") + "歌词", 1)
              ])
            ])
          ]),
          createBaseVNode("div", _hoisted_5, [
            createBaseVNode("div", _hoisted_6, [
              createVNode(_component_n_ellipsis, {
                class: "text-ellipsis",
                "line-clamp": "1"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(unref(playMusic2).name), 1)
                ]),
                _: 1
              })
            ]),
            createBaseVNode("div", _hoisted_7, [
              createVNode(_component_n_ellipsis, {
                class: "text-ellipsis",
                "line-clamp": "1"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(unref(playMusic2).ar || unref(playMusic2).song.artists, (artists, artistsindex) => {
                    return openBlock(), createElementBlock("span", { key: artistsindex }, toDisplayString(artists.name) + toDisplayString(artistsindex < (unref(playMusic2).ar || unref(playMusic2).song.artists).length - 1 ? " / " : ""), 1);
                  }), 128))
                ]),
                _: 1
              })
            ])
          ]),
          createBaseVNode("div", _hoisted_8, [
            createBaseVNode("div", {
              class: "music-buttons-prev",
              onClick: handlePrev
            }, _cache[3] || (_cache[3] = [
              createBaseVNode("i", { class: "iconfont icon-prev" }, null, -1)
            ])),
            createBaseVNode("div", {
              class: "music-buttons-play",
              onClick: playMusicEvent
            }, [
              createBaseVNode("i", {
                class: normalizeClass(["iconfont icon", unref(play) ? "icon-stop" : "icon-play"])
              }, null, 2)
            ]),
            createBaseVNode("div", {
              class: "music-buttons-next",
              onClick: handleNext
            }, _cache[4] || (_cache[4] = [
              createBaseVNode("i", { class: "iconfont icon-next" }, null, -1)
            ]))
          ]),
          createBaseVNode("div", _hoisted_9, [
            createBaseVNode("div", _hoisted_10, [
              createBaseVNode("div", {
                class: "volume-icon",
                onClick: mute
              }, [
                createBaseVNode("i", {
                  class: normalizeClass(["iconfont", unref(getVolumeIcon)])
                }, null, 2)
              ]),
              createBaseVNode("div", _hoisted_11, [
                createVNode(_component_n_slider, {
                  value: unref(volumeSlider),
                  "onUpdate:value": _cache[2] || (_cache[2] = ($event) => isRef(volumeSlider) ? volumeSlider.value = $event : null),
                  step: 0.01,
                  tooltip: false,
                  vertical: ""
                }, null, 8, ["value"])
              ])
            ]),
            !unref(isMobile) ? (openBlock(), createBlock(_component_n_tooltip, {
              key: 0,
              trigger: "hover",
              "z-index": 9999999
            }, {
              trigger: withCtx(() => [
                createBaseVNode("i", {
                  class: normalizeClass(["iconfont", unref(playModeIcon)]),
                  onClick: togglePlayMode
                }, null, 2)
              ]),
              default: withCtx(() => [
                createTextVNode(" " + toDisplayString(unref(playModeText)), 1)
              ]),
              _: 1
            })) : createCommentVNode("", true),
            !unref(isMobile) ? (openBlock(), createBlock(_component_n_tooltip, {
              key: 1,
              trigger: "hover",
              "z-index": 9999999
            }, {
              trigger: withCtx(() => [
                createBaseVNode("i", {
                  class: normalizeClass(["iconfont icon-likefill", { "like-active": unref(isFavorite) }]),
                  onClick: toggleFavorite
                }, null, 2)
              ]),
              default: withCtx(() => [
                _cache[5] || (_cache[5] = createTextVNode(" 喜欢 "))
              ]),
              _: 1
            })) : createCommentVNode("", true),
            unref(isElectron) ? (openBlock(), createBlock(_component_n_tooltip, {
              key: 2,
              class: "music-lyric",
              trigger: "hover",
              "z-index": 9999999
            }, {
              trigger: withCtx(() => [
                createBaseVNode("i", {
                  class: normalizeClass(["iconfont ri-netease-cloud-music-line", { "text-green-500": unref(isLyricWindowOpen) }]),
                  onClick: openLyricWindow
                }, null, 2)
              ]),
              default: withCtx(() => [
                _cache[6] || (_cache[6] = createTextVNode(" 歌词 "))
              ]),
              _: 1
            })) : createCommentVNode("", true),
            createVNode(_component_n_popover, {
              trigger: "click",
              "z-index": 99999999,
              "content-class": "music-play",
              raw: "",
              "show-arrow": false,
              delay: 200,
              "arrow-wrapper-style": " border-radius:1.5rem",
              onUpdateShow: scrollToPlayList
            }, {
              trigger: withCtx(() => [
                createVNode(_component_n_tooltip, {
                  trigger: "manual",
                  "z-index": 9999999
                }, {
                  trigger: withCtx(() => _cache[7] || (_cache[7] = [
                    createBaseVNode("i", { class: "iconfont icon-list" }, null, -1)
                  ])),
                  default: withCtx(() => [
                    _cache[8] || (_cache[8] = createTextVNode(" 播放列表 "))
                  ]),
                  _: 1
                })
              ]),
              default: withCtx(() => [
                createBaseVNode("div", _hoisted_12, [
                  _cache[9] || (_cache[9] = createBaseVNode("div", { class: "music-play-list-back" }, null, -1)),
                  createVNode(_component_n_virtual_list, {
                    ref_key: "palyListRef",
                    ref: palyListRef,
                    "item-size": 62,
                    "item-resizable": "",
                    items: unref(playList)
                  }, {
                    default: withCtx(({ item }) => [
                      createBaseVNode("div", _hoisted_13, [
                        (openBlock(), createBlock(SongItem, {
                          key: item.id,
                          item,
                          mini: ""
                        }, null, 8, ["item"]))
                      ])
                    ]),
                    _: 1
                  }, 8, ["items"])
                ])
              ]),
              _: 1
            })
          ])
        ], 6)
      ], 64);
    };
  }
});
const PlayBar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-5d6cadda"]]);
export {
  PlayBar as default
};
