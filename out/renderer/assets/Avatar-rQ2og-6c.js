import { i as isImageSupportNativeLazy, o as observeIntersection } from "./Image-DXClIklC.js";
import { t as tagInjectionKey } from "./Tag-C0oC92WF.js";
import { aL as createInjectionKey, p as cB, aN as insideModal, m as c, aO as insidePopover, Y as cE, d as defineComponent, x as useConfig, r as ref, G as computed, q as useTheme, ap as useThemeClass, o as onMounted, a8 as watchEffect, a as onBeforeUnmount, E as watch, K as resolveSlot, I as resolveWrappedSlot, l as h, as as inject, bw as avatarLight, ao as createKey, bx as color2Class, ay as VResizeObserver } from "./index-DKaFsuse.js";
const avatarGroupInjectionKey = createInjectionKey("n-avatar-group");
const style = cB("avatar", `
 width: var(--n-merged-size);
 height: var(--n-merged-size);
 color: #FFF;
 font-size: var(--n-font-size);
 display: inline-flex;
 position: relative;
 overflow: hidden;
 text-align: center;
 border: var(--n-border);
 border-radius: var(--n-border-radius);
 --n-merged-color: var(--n-color);
 background-color: var(--n-merged-color);
 transition:
 border-color .3s var(--n-bezier),
 background-color .3s var(--n-bezier),
 color .3s var(--n-bezier);
`, [insideModal(c("&", "--n-merged-color: var(--n-color-modal);")), insidePopover(c("&", "--n-merged-color: var(--n-color-popover);")), c("img", `
 width: 100%;
 height: 100%;
 `), cE("text", `
 white-space: nowrap;
 display: inline-block;
 position: absolute;
 left: 50%;
 top: 50%;
 `), cB("icon", `
 vertical-align: bottom;
 font-size: calc(var(--n-merged-size) - 6px);
 `), cE("text", "line-height: 1.25")]);
const avatarProps = Object.assign(Object.assign({}, useTheme.props), {
  size: [String, Number],
  src: String,
  circle: {
    type: Boolean,
    default: void 0
  },
  objectFit: String,
  round: {
    type: Boolean,
    default: void 0
  },
  bordered: {
    type: Boolean,
    default: void 0
  },
  onError: Function,
  fallbackSrc: String,
  intersectionObserverOptions: Object,
  lazy: Boolean,
  onLoad: Function,
  renderPlaceholder: Function,
  renderFallback: Function,
  imgProps: Object,
  /** @deprecated */
  color: String
});
const __unplugin_components_2 = defineComponent({
  name: "Avatar",
  props: avatarProps,
  setup(props) {
    const {
      mergedClsPrefixRef,
      inlineThemeDisabled
    } = useConfig(props);
    const hasLoadErrorRef = ref(false);
    let memoedTextHtml = null;
    const textRef = ref(null);
    const selfRef = ref(null);
    const fitTextTransform = () => {
      const {
        value: textEl
      } = textRef;
      if (textEl) {
        if (memoedTextHtml === null || memoedTextHtml !== textEl.innerHTML) {
          memoedTextHtml = textEl.innerHTML;
          const {
            value: selfEl
          } = selfRef;
          if (selfEl) {
            const {
              offsetWidth: elWidth,
              offsetHeight: elHeight
            } = selfEl;
            const {
              offsetWidth: textWidth,
              offsetHeight: textHeight
            } = textEl;
            const radix = 0.9;
            const ratio = Math.min(elWidth / textWidth * radix, elHeight / textHeight * radix, 1);
            textEl.style.transform = `translateX(-50%) translateY(-50%) scale(${ratio})`;
          }
        }
      }
    };
    const NAvatarGroup = inject(avatarGroupInjectionKey, null);
    const mergedSizeRef = computed(() => {
      const {
        size
      } = props;
      if (size) return size;
      const {
        size: avatarGroupSize
      } = NAvatarGroup || {};
      if (avatarGroupSize) return avatarGroupSize;
      return "medium";
    });
    const themeRef = useTheme("Avatar", "-avatar", style, avatarLight, props, mergedClsPrefixRef);
    const TagInjection = inject(tagInjectionKey, null);
    const mergedRoundRef = computed(() => {
      if (NAvatarGroup) return true;
      const {
        round,
        circle
      } = props;
      if (round !== void 0 || circle !== void 0) return round || circle;
      if (TagInjection) {
        return TagInjection.roundRef.value;
      }
      return false;
    });
    const mergedBorderedRef = computed(() => {
      if (NAvatarGroup) return true;
      return props.bordered || false;
    });
    const cssVarsRef = computed(() => {
      const size = mergedSizeRef.value;
      const round = mergedRoundRef.value;
      const bordered = mergedBorderedRef.value;
      const {
        color: propColor
      } = props;
      const {
        self: {
          borderRadius,
          fontSize,
          color,
          border,
          colorModal,
          colorPopover
        },
        common: {
          cubicBezierEaseInOut
        }
      } = themeRef.value;
      let height;
      if (typeof size === "number") {
        height = `${size}px`;
      } else {
        height = themeRef.value.self[createKey("height", size)];
      }
      return {
        "--n-font-size": fontSize,
        "--n-border": bordered ? border : "none",
        "--n-border-radius": round ? "50%" : borderRadius,
        "--n-color": propColor || color,
        "--n-color-modal": propColor || colorModal,
        "--n-color-popover": propColor || colorPopover,
        "--n-bezier": cubicBezierEaseInOut,
        "--n-merged-size": `var(--n-avatar-size-override, ${height})`
      };
    });
    const themeClassHandle = inlineThemeDisabled ? useThemeClass("avatar", computed(() => {
      const size = mergedSizeRef.value;
      const round = mergedRoundRef.value;
      const bordered = mergedBorderedRef.value;
      const {
        color
      } = props;
      let hash = "";
      if (size) {
        if (typeof size === "number") {
          hash += `a${size}`;
        } else {
          hash += size[0];
        }
      }
      if (round) {
        hash += "b";
      }
      if (bordered) {
        hash += "c";
      }
      if (color) {
        hash += color2Class(color);
      }
      return hash;
    }), cssVarsRef, props) : void 0;
    const shouldStartLoadingRef = ref(!props.lazy);
    onMounted(() => {
      if (props.lazy && props.intersectionObserverOptions) {
        let unobserve;
        const stopWatchHandle = watchEffect(() => {
          unobserve === null || unobserve === void 0 ? void 0 : unobserve();
          unobserve = void 0;
          if (props.lazy) {
            unobserve = observeIntersection(selfRef.value, props.intersectionObserverOptions, shouldStartLoadingRef);
          }
        });
        onBeforeUnmount(() => {
          stopWatchHandle();
          unobserve === null || unobserve === void 0 ? void 0 : unobserve();
        });
      }
    });
    watch(() => {
      var _a;
      return props.src || ((_a = props.imgProps) === null || _a === void 0 ? void 0 : _a.src);
    }, () => {
      hasLoadErrorRef.value = false;
    });
    const loadedRef = ref(!props.lazy);
    return {
      textRef,
      selfRef,
      mergedRoundRef,
      mergedClsPrefix: mergedClsPrefixRef,
      fitTextTransform,
      cssVars: inlineThemeDisabled ? void 0 : cssVarsRef,
      themeClass: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.themeClass,
      onRender: themeClassHandle === null || themeClassHandle === void 0 ? void 0 : themeClassHandle.onRender,
      hasLoadError: hasLoadErrorRef,
      shouldStartLoading: shouldStartLoadingRef,
      loaded: loadedRef,
      mergedOnError: (e) => {
        if (!shouldStartLoadingRef.value) return;
        hasLoadErrorRef.value = true;
        const {
          onError,
          imgProps: {
            onError: imgPropsOnError
          } = {}
        } = props;
        onError === null || onError === void 0 ? void 0 : onError(e);
        imgPropsOnError === null || imgPropsOnError === void 0 ? void 0 : imgPropsOnError(e);
      },
      mergedOnLoad: (e) => {
        const {
          onLoad,
          imgProps: {
            onLoad: imgPropsOnLoad
          } = {}
        } = props;
        onLoad === null || onLoad === void 0 ? void 0 : onLoad(e);
        imgPropsOnLoad === null || imgPropsOnLoad === void 0 ? void 0 : imgPropsOnLoad(e);
        loadedRef.value = true;
      }
    };
  },
  render() {
    var _a, _b;
    const {
      $slots,
      src,
      mergedClsPrefix,
      lazy,
      onRender,
      loaded,
      hasLoadError,
      imgProps = {}
    } = this;
    onRender === null || onRender === void 0 ? void 0 : onRender();
    let img;
    const placeholderNode = !loaded && !hasLoadError && (this.renderPlaceholder ? this.renderPlaceholder() : (_b = (_a = this.$slots).placeholder) === null || _b === void 0 ? void 0 : _b.call(_a));
    if (this.hasLoadError) {
      img = this.renderFallback ? this.renderFallback() : resolveSlot($slots.fallback, () => [h("img", {
        src: this.fallbackSrc,
        style: {
          objectFit: this.objectFit
        }
      })]);
    } else {
      img = resolveWrappedSlot($slots.default, (children) => {
        if (children) {
          return h(VResizeObserver, {
            onResize: this.fitTextTransform
          }, {
            default: () => h("span", {
              ref: "textRef",
              class: `${mergedClsPrefix}-avatar__text`
            }, children)
          });
        } else if (src || imgProps.src) {
          const loadSrc = this.src || imgProps.src;
          return h("img", Object.assign(Object.assign({}, imgProps), {
            loading: (
              // If interseciton observer options is set, do not use native lazy
              isImageSupportNativeLazy && !this.intersectionObserverOptions && lazy ? "lazy" : "eager"
            ),
            src: lazy && this.intersectionObserverOptions ? this.shouldStartLoading ? loadSrc : void 0 : loadSrc,
            "data-image-src": loadSrc,
            onLoad: this.mergedOnLoad,
            onError: this.mergedOnError,
            style: [imgProps.style || "", {
              objectFit: this.objectFit
            }, placeholderNode ? {
              height: "0",
              width: "0",
              visibility: "hidden",
              position: "absolute"
            } : ""]
          }));
        }
      });
    }
    return h("span", {
      ref: "selfRef",
      class: [`${mergedClsPrefix}-avatar`, this.themeClass],
      style: this.cssVars
    }, img, lazy && placeholderNode);
  }
});
export {
  __unplugin_components_2 as _
};
