import { d as defineComponent, l as h, p as cB, Y as cE, m as c, q as useTheme, x as useConfig, an as emptyLight, G as computed, ao as createKey, ap as useThemeClass, N as NBaseIcon, r as ref, o as onMounted, E as watch, c as createElementBlock, b as createBaseVNode, t as toDisplayString, n as normalizeClass, u as unref, e as createVNode, f as withCtx, T as createCommentVNode, am as getMusicDetail, S as Scrollbar, g as useStore, h as useRouter, j as openBlock, s as setAnimationClass, a3 as Fragment, a4 as renderList, O as createBlock, a2 as normalizeStyle, k as createTextVNode, a5 as setAnimationDelay, B as Button, aj as __unplugin_components_0$1, _ as _export_sfc } from "./index-DKaFsuse.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import { u as useLocale } from "./use-locale-DLWAOXez.js";
const EmptyIcon = defineComponent({
  name: "Empty",
  render() {
    return h("svg", {
      viewBox: "0 0 28 28",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, h("path", {
      d: "M26 7.5C26 11.0899 23.0899 14 19.5 14C15.9101 14 13 11.0899 13 7.5C13 3.91015 15.9101 1 19.5 1C23.0899 1 26 3.91015 26 7.5ZM16.8536 4.14645C16.6583 3.95118 16.3417 3.95118 16.1464 4.14645C15.9512 4.34171 15.9512 4.65829 16.1464 4.85355L18.7929 7.5L16.1464 10.1464C15.9512 10.3417 15.9512 10.6583 16.1464 10.8536C16.3417 11.0488 16.6583 11.0488 16.8536 10.8536L19.5 8.20711L22.1464 10.8536C22.3417 11.0488 22.6583 11.0488 22.8536 10.8536C23.0488 10.6583 23.0488 10.3417 22.8536 10.1464L20.2071 7.5L22.8536 4.85355C23.0488 4.65829 23.0488 4.34171 22.8536 4.14645C22.6583 3.95118 22.3417 3.95118 22.1464 4.14645L19.5 6.79289L16.8536 4.14645Z",
      fill: "currentColor"
    }), h("path", {
      d: "M25 22.75V12.5991C24.5572 13.0765 24.053 13.4961 23.5 13.8454V16H17.5L17.3982 16.0068C17.0322 16.0565 16.75 16.3703 16.75 16.75C16.75 18.2688 15.5188 19.5 14 19.5C12.4812 19.5 11.25 18.2688 11.25 16.75L11.2432 16.6482C11.1935 16.2822 10.8797 16 10.5 16H4.5V7.25C4.5 6.2835 5.2835 5.5 6.25 5.5H12.2696C12.4146 4.97463 12.6153 4.47237 12.865 4H6.25C4.45507 4 3 5.45507 3 7.25V22.75C3 24.5449 4.45507 26 6.25 26H21.75C23.5449 26 25 24.5449 25 22.75ZM4.5 22.75V17.5H9.81597L9.85751 17.7041C10.2905 19.5919 11.9808 21 14 21L14.215 20.9947C16.2095 20.8953 17.842 19.4209 18.184 17.5H23.5V22.75C23.5 23.7165 22.7165 24.5 21.75 24.5H6.25C5.2835 24.5 4.5 23.7165 4.5 22.75Z",
      fill: "currentColor"
    }));
  }
});
const style = cB("empty", `
 display: flex;
 flex-direction: column;
 align-items: center;
 font-size: var(--n-font-size);
`, [cE("icon", `
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 font-size: var(--n-icon-size);
 line-height: var(--n-icon-size);
 color: var(--n-icon-color);
 transition:
 color .3s var(--n-bezier);
 `, [c("+", [cE("description", `
 margin-top: 8px;
 `)])]), cE("description", `
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `), cE("extra", `
 text-align: center;
 transition: color .3s var(--n-bezier);
 margin-top: 12px;
 color: var(--n-extra-text-color);
 `)]);
const emptyProps = Object.assign(Object.assign({}, useTheme.props), {
  description: String,
  showDescription: {
    type: Boolean,
    default: true
  },
  showIcon: {
    type: Boolean,
    default: true
  },
  size: {
    type: String,
    default: "medium"
  },
  renderIcon: Function
});
const __unplugin_components_0 = defineComponent({
  name: "Empty",
  props: emptyProps,
  setup(props) {
    const {
      mergedClsPrefixRef,
      inlineThemeDisabled,
      mergedComponentPropsRef
    } = useConfig(props);
    const themeRef = useTheme("Empty", "-empty", style, emptyLight, props, mergedClsPrefixRef);
    const {
      localeRef
    } = useLocale("Empty");
    const mergedDescriptionRef = computed(() => {
      var _a, _b, _c;
      return (_a = props.description) !== null && _a !== void 0 ? _a : (_c = (_b = mergedComponentPropsRef === null || mergedComponentPropsRef === void 0 ? void 0 : mergedComponentPropsRef.value) === null || _b === void 0 ? void 0 : _b.Empty) === null || _c === void 0 ? void 0 : _c.description;
    });
    const mergedRenderIconRef = computed(() => {
      var _a, _b;
      return ((_b = (_a = mergedComponentPropsRef === null || mergedComponentPropsRef === void 0 ? void 0 : mergedComponentPropsRef.value) === null || _a === void 0 ? void 0 : _a.Empty) === null || _b === void 0 ? void 0 : _b.renderIcon) || (() => h(EmptyIcon, null));
    });
    const cssVarsRef = computed(() => {
      const {
        size
      } = props;
      const {
        common: {
          cubicBezierEaseInOut
        },
        self: {
          [createKey("iconSize", size)]: iconSize,
          [createKey("fontSize", size)]: fontSize,
          textColor,
          iconColor,
          extraTextColor
        }
      } = themeRef.value;
      return {
        "--n-icon-size": iconSize,
        "--n-font-size": fontSize,
        "--n-bezier": cubicBezierEaseInOut,
        "--n-text-color": textColor,
        "--n-icon-color": iconColor,
        "--n-extra-text-color": extraTextColor
      };
    });
    const themeClassHandle = inlineThemeDisabled ? useThemeClass("empty", computed(() => {
      let hash = "";
      const {
        size
      } = props;
      hash += size[0];
      return hash;
    }), cssVarsRef, props) : void 0;
    return {
      mergedClsPrefix: mergedClsPrefixRef,
      mergedRenderIcon: mergedRenderIconRef,
      localizedDescription: computed(() => {
        return mergedDescriptionRef.value || localeRef.value.description;
      }),
      cssVars: inlineThemeDisabled ? void 0 : cssVarsRef,
      themeClass: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass,
      onRender: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.onRender
    };
  },
  render() {
    const {
      $slots,
      mergedClsPrefix,
      onRender
    } = this;
    onRender === null || onRender === void 0 ? void 0 : onRender();
    return h("div", {
      class: [`${mergedClsPrefix}-empty`, this.themeClass],
      style: this.cssVars
    }, this.showIcon ? h("div", {
      class: `${mergedClsPrefix}-empty__icon`
    }, $slots.icon ? $slots.icon() : h(NBaseIcon, {
      clsPrefix: mergedClsPrefix
    }, {
      default: this.mergedRenderIcon
    })) : null, this.showDescription ? h("div", {
      class: `${mergedClsPrefix}-empty__description`
    }, $slots.default ? $slots.default() : this.localizedDescription) : null, $slots.extra ? h("div", {
      class: `${mergedClsPrefix}-empty__extra`
    }, $slots.extra()) : null);
  }
});
const _hoisted_1 = {
  key: 0,
  class: "favorite-page"
};
const _hoisted_2 = { class: "favorite-count" };
const _hoisted_3 = {
  key: 0,
  class: "empty-tip"
};
const _hoisted_4 = {
  key: 1,
  class: "favorite-list"
};
const _hoisted_5 = {
  key: 0,
  class: "favorite-list-more text-center"
};
const _hoisted_6 = {
  key: 1,
  class: "loading-wrapper"
};
const _hoisted_7 = {
  key: 2,
  class: "no-more-tip"
};
const pageSize = 16;
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  props: {
    isComponent: {
      type: Boolean,
      default: false
    }
  },
  setup(__props) {
    const store = useStore();
    const favoriteList = computed(() => store.state.favoriteList);
    const favoriteSongs = ref([]);
    const loading = ref(false);
    const noMore = ref(false);
    const scrollbarRef = ref();
    const currentPage = ref(1);
    const props = __props;
    const getCurrentPageIds = () => {
      const reversedList = [...favoriteList.value];
      const startIndex = (currentPage.value - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      return reversedList.slice(startIndex, endIndex);
    };
    const getFavoriteSongs = async () => {
      if (favoriteList.value.length === 0) {
        favoriteSongs.value = [];
        return;
      }
      if (props.isComponent && favoriteSongs.value.length >= 16) {
        return;
      }
      loading.value = true;
      try {
        const currentIds = getCurrentPageIds();
        const res = await getMusicDetail(currentIds);
        if (res.data.songs) {
          const newSongs = res.data.songs.map((song) => ({
            ...song,
            picUrl: song.al?.picUrl || ""
          }));
          if (currentPage.value === 1) {
            favoriteSongs.value = newSongs;
          } else {
            favoriteSongs.value = [...favoriteSongs.value, ...newSongs];
          }
          noMore.value = favoriteSongs.value.length >= favoriteList.value.length;
        }
      } catch (error) {
        console.error("获取收藏歌曲失败:", error);
      } finally {
        loading.value = false;
      }
    };
    const handleScroll = (e) => {
      const { scrollTop, scrollHeight, offsetHeight } = e.target;
      const threshold = 100;
      if (!loading.value && !noMore.value && scrollHeight - (scrollTop + offsetHeight) < threshold) {
        currentPage.value++;
        getFavoriteSongs();
      }
    };
    onMounted(() => {
      getFavoriteSongs();
    });
    watch(
      favoriteList,
      () => {
        currentPage.value = 1;
        noMore.value = false;
        getFavoriteSongs();
      },
      { deep: true, immediate: true }
    );
    const handlePlay = () => {
      store.commit("setPlayList", favoriteSongs.value);
    };
    const getItemAnimationDelay = (index) => {
      return setAnimationDelay(index, 30);
    };
    const router = useRouter();
    const handleMore = () => {
      router.push("/favorite");
    };
    return (_ctx, _cache) => {
      const _component_n_empty = __unplugin_components_0;
      const _component_n_button = Button;
      const _component_n_spin = __unplugin_components_0$1;
      const _component_n_scrollbar = Scrollbar;
      return (__props.isComponent ? favoriteSongs.value.length : true) ? (openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", {
          class: normalizeClass(["favorite-header", unref(setAnimationClass)("animate__fadeInLeft")])
        }, [
          _cache[0] || (_cache[0] = createBaseVNode("h2", null, "我的收藏", -1)),
          createBaseVNode("div", _hoisted_2, "共 " + toDisplayString(favoriteList.value.length) + " 首", 1)
        ], 2),
        createBaseVNode("div", {
          class: normalizeClass(["favorite-main", unref(setAnimationClass)("animate__bounceInRight")])
        }, [
          createVNode(_component_n_scrollbar, {
            ref_key: "scrollbarRef",
            ref: scrollbarRef,
            class: "favorite-content",
            onScroll: handleScroll
          }, {
            default: withCtx(() => [
              favoriteList.value.length === 0 ? (openBlock(), createElementBlock("div", _hoisted_3, [
                createVNode(_component_n_empty, { description: "还没有收藏歌曲" })
              ])) : (openBlock(), createElementBlock("div", _hoisted_4, [
                (openBlock(true), createElementBlock(Fragment, null, renderList(favoriteSongs.value, (song, index) => {
                  return openBlock(), createBlock(SongItem, {
                    key: song.id,
                    item: song,
                    favorite: !__props.isComponent,
                    class: normalizeClass(unref(setAnimationClass)("animate__bounceInLeft")),
                    style: normalizeStyle(getItemAnimationDelay(index)),
                    onPlay: handlePlay
                  }, null, 8, ["item", "favorite", "class", "style"]);
                }), 128)),
                __props.isComponent ? (openBlock(), createElementBlock("div", _hoisted_5, [
                  createVNode(_component_n_button, {
                    text: "",
                    type: "primary",
                    onClick: handleMore
                  }, {
                    default: withCtx(() => _cache[1] || (_cache[1] = [
                      createTextVNode("查看更多")
                    ])),
                    _: 1
                  })
                ])) : createCommentVNode("", true),
                loading.value ? (openBlock(), createElementBlock("div", _hoisted_6, [
                  createVNode(_component_n_spin, { size: "large" })
                ])) : createCommentVNode("", true),
                noMore.value ? (openBlock(), createElementBlock("div", _hoisted_7, "没有更多了")) : createCommentVNode("", true)
              ]))
            ]),
            _: 1
          }, 512)
        ], 2)
      ])) : createCommentVNode("", true);
    };
  }
});
const Favorite = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-2d1a7423"]]);
export {
  Favorite as F
};
