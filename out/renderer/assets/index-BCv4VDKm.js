import { p as cB, V as cNotM, m as c, W as cM, Y as cE, d as defineComponent, x as useConfig, Z as useStyle, $ as provide, F as useRtl, l as h, a0 as buttonGroupInjectionKey, r as ref, G as computed, E as watch, o as onMounted, a1 as onUnmounted, c as createElementBlock, b as createBaseVNode, e as createVNode, f as withCtx, t as toDisplayString, n as normalizeClass, a2 as normalizeStyle, a3 as Fragment, a4 as renderList, j as openBlock, T as createCommentVNode, B as Button, _ as _export_sfc } from "./index-DKaFsuse.js";
const zero = "0!important";
const n1 = "-1px!important";
function createLeftBorderStyle(type) {
  return cM(`${type}-type`, [c("& +", [cB("button", {}, [cM(`${type}-type`, [cE("border", {
    borderLeftWidth: zero
  }), cE("state-border", {
    left: n1
  })])])])]);
}
function createTopBorderStyle(type) {
  return cM(`${type}-type`, [c("& +", [cB("button", [cM(`${type}-type`, [cE("border", {
    borderTopWidth: zero
  }), cE("state-border", {
    top: n1
  })])])])]);
}
const style = cB("button-group", `
 flex-wrap: nowrap;
 display: inline-flex;
 position: relative;
`, [cNotM("vertical", {
  flexDirection: "row"
}, [cNotM("rtl", [cB("button", [c("&:first-child:not(:last-child)", `
 margin-right: ${zero};
 border-top-right-radius: ${zero};
 border-bottom-right-radius: ${zero};
 `), c("&:last-child:not(:first-child)", `
 margin-left: ${zero};
 border-top-left-radius: ${zero};
 border-bottom-left-radius: ${zero};
 `), c("&:not(:first-child):not(:last-child)", `
 margin-left: ${zero};
 margin-right: ${zero};
 border-radius: ${zero};
 `), createLeftBorderStyle("default"), cM("ghost", [createLeftBorderStyle("primary"), createLeftBorderStyle("info"), createLeftBorderStyle("success"), createLeftBorderStyle("warning"), createLeftBorderStyle("error")])])])]), cM("vertical", {
  flexDirection: "column"
}, [cB("button", [c("&:first-child:not(:last-child)", `
 margin-bottom: ${zero};
 margin-left: ${zero};
 margin-right: ${zero};
 border-bottom-left-radius: ${zero};
 border-bottom-right-radius: ${zero};
 `), c("&:last-child:not(:first-child)", `
 margin-top: ${zero};
 margin-left: ${zero};
 margin-right: ${zero};
 border-top-left-radius: ${zero};
 border-top-right-radius: ${zero};
 `), c("&:not(:first-child):not(:last-child)", `
 margin: ${zero};
 border-radius: ${zero};
 `), createTopBorderStyle("default"), cM("ghost", [createTopBorderStyle("primary"), createTopBorderStyle("info"), createTopBorderStyle("success"), createTopBorderStyle("warning"), createTopBorderStyle("error")])])])]);
const buttonGroupProps = {
  size: {
    type: String,
    default: void 0
  },
  vertical: Boolean
};
const __unplugin_components_1 = defineComponent({
  name: "ButtonGroup",
  props: buttonGroupProps,
  setup(props) {
    const {
      mergedClsPrefixRef,
      mergedRtlRef
    } = useConfig(props);
    useStyle("-button-group", style, mergedClsPrefixRef);
    provide(buttonGroupInjectionKey, props);
    const rtlEnabledRef = useRtl("ButtonGroup", mergedRtlRef, mergedClsPrefixRef);
    return {
      rtlEnabled: rtlEnabledRef,
      mergedClsPrefix: mergedClsPrefixRef
    };
  },
  render() {
    const {
      mergedClsPrefix
    } = this;
    return h("div", {
      class: [`${mergedClsPrefix}-button-group`, this.rtlEnabled && `${mergedClsPrefix}-button-group--rtl`, this.vertical && `${mergedClsPrefix}-button-group--vertical`],
      role: "group"
    }, this.$slots);
  }
});
const _hoisted_1 = { class: "font-size-controls" };
const _hoisted_2 = { class: "play-controls" };
const _hoisted_3 = { class: "control-buttons" };
const _hoisted_4 = {
  key: 0,
  class: "ri-sun-line"
};
const _hoisted_5 = {
  key: 1,
  class: "ri-moon-line"
};
const _hoisted_6 = {
  key: 0,
  class: "ri-lock-line"
};
const _hoisted_7 = {
  key: 1,
  class: "ri-lock-unlock-line"
};
const _hoisted_8 = { class: "lyric-scroll" };
const _hoisted_9 = {
  key: 1,
  class: "lyric-empty"
};
const fontSizeStep = 2;
const TIME_OFFSET = 400;
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "Lyric"
  },
  __name: "index",
  setup(__props) {
    const windowData = window;
    const containerRef = ref(null);
    const containerHeight = ref(0);
    const lineHeight = ref(60);
    const currentIndex = ref(0);
    const fontSize = ref(24);
    const animationFrameId = ref(null);
    const lastUpdateTime = ref(performance.now());
    const staticData = ref({
      lrcArray: [],
      lrcTimeArray: [],
      allTime: 0,
      playMusic: {}
    });
    const dynamicData = ref({
      nowTime: 0,
      startCurrentTime: 0,
      nextTime: 0,
      isPlay: true
    });
    const lyricSetting = ref({
      ...localStorage.getItem("lyricData") ? JSON.parse(localStorage.getItem("lyricData") || "") : {
        isTop: false,
        theme: "dark",
        isLock: false
      }
    });
    const isHovering = ref(false);
    const showControls = computed(() => {
      if (lyricSetting.value.isLock) {
        return isHovering.value;
      }
      return true;
    });
    const handleMouseEnter = () => {
      if (lyricSetting.value.isLock) {
        isHovering.value = true;
        windowData.electron.ipcRenderer.send("set-ignore-mouse", true);
      } else {
        windowData.electron.ipcRenderer.send("set-ignore-mouse", false);
      }
    };
    const handleMouseLeave = () => {
      if (!lyricSetting.value.isLock) return;
      isHovering.value = false;
      windowData.electron.ipcRenderer.send("set-ignore-mouse", false);
    };
    watch(
      () => lyricSetting.value.isLock,
      (newLock) => {
        if (newLock) {
          isHovering.value = false;
        }
      }
    );
    onMounted(() => {
      if (lyricSetting.value.isLock) {
        isHovering.value = false;
      }
    });
    onUnmounted(() => {
    });
    const wrapperStyle = computed(() => {
      if (!containerHeight.value) {
        return {
          transform: "translateY(0)",
          transition: "none"
        };
      }
      const containerCenter = containerHeight.value / 2;
      const currentLineTop = currentIndex.value * lineHeight.value + containerHeight.value * 0.2 + lineHeight.value;
      const targetOffset = containerCenter - currentLineTop;
      const contentHeight = staticData.value.lrcArray.length * lineHeight.value + containerHeight.value * 0.4;
      const minOffset = -(contentHeight - containerHeight.value);
      const maxOffset = 0;
      const finalOffset = Math.min(maxOffset, Math.max(minOffset, targetOffset));
      return {
        transform: `translateY(${finalOffset}px)`,
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      };
    });
    const lyricLineStyle = computed(() => ({
      height: `${lineHeight.value}px`
    }));
    const updateContainerHeight = () => {
      if (!containerRef.value) return;
      containerHeight.value = containerRef.value.clientHeight;
      const baseLineHeight = fontSize.value * 2.5;
      const maxAllowedHeight = containerHeight.value / 3;
      lineHeight.value = Math.min(maxAllowedHeight, Math.max(40, baseLineHeight));
    };
    const handleFontSizeChange = async () => {
      saveFontSize();
      updateContainerHeight();
    };
    const increaseFontSize = async () => {
      if (fontSize.value < 48) {
        fontSize.value += fontSizeStep;
        await handleFontSizeChange();
      }
    };
    const decreaseFontSize = async () => {
      if (fontSize.value > 12) {
        fontSize.value -= fontSizeStep;
        await handleFontSizeChange();
      }
    };
    const saveFontSize = () => {
      localStorage.setItem("lyricFontSize", fontSize.value.toString());
    };
    onMounted(() => {
      const resizeObserver = new ResizeObserver(() => {
        updateContainerHeight();
      });
      if (containerRef.value) {
        resizeObserver.observe(containerRef.value);
      }
      onUnmounted(() => {
        resizeObserver.disconnect();
      });
    });
    const actualTime = ref(0);
    const currentProgress = computed(() => {
      const { startCurrentTime, nextTime } = dynamicData.value;
      if (!startCurrentTime || !nextTime) return 0;
      const duration = nextTime - startCurrentTime;
      const elapsed = actualTime.value - startCurrentTime;
      return Math.min(Math.max(elapsed / duration, 0), 1);
    });
    const getLyricStyle = (index2) => {
      if (index2 !== currentIndex.value) return {};
      const progress = currentProgress.value * 100;
      return {
        background: `linear-gradient(to right, var(--highlight-color) ${progress}%, var(--text-color) ${progress}%)`,
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        transition: "all 0.1s linear"
      };
    };
    const updateProgress = () => {
      if (!dynamicData.value.isPlay) {
        if (animationFrameId.value) {
          cancelAnimationFrame(animationFrameId.value);
          animationFrameId.value = null;
        }
        return;
      }
      const timeDiff = (performance.now() - lastUpdateTime.value) / 1e3;
      actualTime.value = dynamicData.value.nowTime + timeDiff + TIME_OFFSET / 1e3;
      animationFrameId.value = requestAnimationFrame(updateProgress);
    };
    watch(
      () => dynamicData.value,
      (newData) => {
        lastUpdateTime.value = performance.now();
        actualTime.value = newData.nowTime + TIME_OFFSET / 1e3;
        if (newData.isPlay && !animationFrameId.value) {
          updateProgress();
        }
      },
      { deep: true }
    );
    watch(
      () => dynamicData.value.isPlay,
      (isPlaying) => {
        if (isPlaying) {
          lastUpdateTime.value = performance.now();
          updateProgress();
        } else if (animationFrameId.value) {
          cancelAnimationFrame(animationFrameId.value);
          animationFrameId.value = null;
        }
      }
    );
    const handleDataUpdate = (parsedData) => {
      if (!parsedData) {
        console.error("Invalid update data received:", parsedData);
        return;
      }
      staticData.value = {
        lrcArray: parsedData.lrcArray || [],
        lrcTimeArray: parsedData.lrcTimeArray || [],
        allTime: parsedData.allTime || 0,
        playMusic: parsedData.playMusic || {}
      };
      dynamicData.value = {
        nowTime: parsedData.nowTime || 0,
        startCurrentTime: parsedData.startCurrentTime || 0,
        nextTime: parsedData.nextTime || 0,
        isPlay: parsedData.isPlay
      };
      if (typeof parsedData.nowIndex === "number") {
        currentIndex.value = parsedData.nowIndex;
      }
    };
    onMounted(() => {
      const savedFontSize = localStorage.getItem("lyricFontSize");
      if (savedFontSize) {
        fontSize.value = Number(savedFontSize);
        lineHeight.value = fontSize.value * 2.5;
      }
      updateContainerHeight();
      window.addEventListener("resize", updateContainerHeight);
      windowData.electron.ipcRenderer.on("receive-lyric", (_, data) => {
        try {
          const parsedData = JSON.parse(data);
          handleDataUpdate(parsedData);
        } catch (error) {
          console.error("Error parsing lyric data:", error);
        }
      });
    });
    onUnmounted(() => {
      window.removeEventListener("resize", updateContainerHeight);
    });
    const checkTheme = () => {
      if (lyricSetting.value.theme === "light") {
        lyricSetting.value.theme = "dark";
      } else {
        lyricSetting.value.theme = "light";
      }
    };
    const handleLock = () => {
      lyricSetting.value.isLock = !lyricSetting.value.isLock;
      windowData.electron.ipcRenderer.send("set-ignore-mouse", lyricSetting.value.isLock);
    };
    const handleClose = () => {
      windowData.electron.ipcRenderer.send("close-lyric");
    };
    watch(
      () => lyricSetting.value,
      (newValue) => {
        localStorage.setItem("lyricData", JSON.stringify(newValue));
      },
      { deep: true }
    );
    const isDragging = ref(false);
    const startPosition = ref({ x: 0, y: 0 });
    const handleMouseDown = (e) => {
      if (lyricSetting.value.isLock || e.target.closest(".control-buttons") || e.target.closest(".font-size-controls")) {
        return;
      }
      if (e.button !== 0) return;
      isDragging.value = true;
      startPosition.value = { x: e.screenX, y: e.screenY };
      const handleMouseMove = (e2) => {
        if (!isDragging.value) return;
        const deltaX = e2.screenX - startPosition.value.x;
        const deltaY = e2.screenY - startPosition.value.y;
        windowData.electron.ipcRenderer.send("lyric-drag-move", { deltaX, deltaY });
        startPosition.value = { x: e2.screenX, y: e2.screenY };
      };
      const handleMouseUp = () => {
        if (!isDragging.value) return;
        isDragging.value = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };
    onUnmounted(() => {
      isDragging.value = false;
    });
    onMounted(() => {
      const lyricLock = document.getElementById("lyric-lock");
      if (lyricLock) {
        lyricLock.onmouseenter = () => {
          if (lyricSetting.value.isLock) {
            windowData.electron.ipcRenderer.send("set-ignore-mouse", false);
          }
        };
        lyricLock.onmouseleave = () => {
          if (lyricSetting.value.isLock) {
            windowData.electron.ipcRenderer.send("set-ignore-mouse", true);
          }
        };
      }
    });
    const handlePlayPause = () => {
      windowData.electron.ipcRenderer.send("control-back", "playpause");
    };
    const handlePrev = () => {
      windowData.electron.ipcRenderer.send("control-back", "prev");
    };
    const handleNext = () => {
      windowData.electron.ipcRenderer.send("control-back", "next");
    };
    return (_ctx, _cache) => {
      const _component_n_button = Button;
      const _component_n_button_group = __unplugin_components_1;
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["lyric-window", [lyricSetting.value.theme, { lyric_lock: lyricSetting.value.isLock }]]),
        onMousedown: handleMouseDown,
        onMouseenter: handleMouseEnter,
        onMouseleave: handleMouseLeave
      }, [
        _cache[5] || (_cache[5] = createBaseVNode("div", { class: "drag-overlay" }, null, -1)),
        createBaseVNode("div", {
          class: normalizeClass(["control-bar", { "control-bar-show": showControls.value }])
        }, [
          createBaseVNode("div", _hoisted_1, [
            createVNode(_component_n_button_group, null, {
              default: withCtx(() => [
                createVNode(_component_n_button, {
                  quaternary: "",
                  size: "small",
                  disabled: fontSize.value <= 12,
                  onClick: decreaseFontSize
                }, {
                  default: withCtx(() => _cache[0] || (_cache[0] = [
                    createBaseVNode("i", { class: "ri-subtract-line" }, null, -1)
                  ])),
                  _: 1
                }, 8, ["disabled"]),
                createVNode(_component_n_button, {
                  quaternary: "",
                  size: "small",
                  disabled: fontSize.value >= 48,
                  onClick: increaseFontSize
                }, {
                  default: withCtx(() => _cache[1] || (_cache[1] = [
                    createBaseVNode("i", { class: "ri-add-line" }, null, -1)
                  ])),
                  _: 1
                }, 8, ["disabled"])
              ]),
              _: 1
            }),
            createBaseVNode("div", null, toDisplayString(staticData.value.playMusic.name), 1)
          ]),
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("div", {
              class: "control-button",
              onClick: handlePrev
            }, _cache[2] || (_cache[2] = [
              createBaseVNode("i", { class: "ri-skip-back-fill" }, null, -1)
            ])),
            createBaseVNode("div", {
              class: "control-button play-button",
              onClick: handlePlayPause
            }, [
              createBaseVNode("i", {
                class: normalizeClass(dynamicData.value.isPlay ? "ri-pause-fill" : "ri-play-fill")
              }, null, 2)
            ]),
            createBaseVNode("div", {
              class: "control-button",
              onClick: handleNext
            }, _cache[3] || (_cache[3] = [
              createBaseVNode("i", { class: "ri-skip-forward-fill" }, null, -1)
            ]))
          ]),
          createBaseVNode("div", _hoisted_3, [
            createBaseVNode("div", {
              class: "control-button",
              onClick: checkTheme
            }, [
              lyricSetting.value.theme === "light" ? (openBlock(), createElementBlock("i", _hoisted_4)) : (openBlock(), createElementBlock("i", _hoisted_5))
            ]),
            createBaseVNode("div", {
              id: "lyric-lock",
              class: "control-button",
              onClick: handleLock
            }, [
              lyricSetting.value.isLock ? (openBlock(), createElementBlock("i", _hoisted_6)) : (openBlock(), createElementBlock("i", _hoisted_7))
            ]),
            createBaseVNode("div", {
              class: "control-button",
              onClick: handleClose
            }, _cache[4] || (_cache[4] = [
              createBaseVNode("i", { class: "ri-close-line" }, null, -1)
            ]))
          ])
        ], 2),
        createBaseVNode("div", {
          ref_key: "containerRef",
          ref: containerRef,
          class: "lyric-container"
        }, [
          createBaseVNode("div", _hoisted_8, [
            createBaseVNode("div", {
              class: "lyric-wrapper",
              style: normalizeStyle(wrapperStyle.value)
            }, [
              staticData.value.lrcArray?.length > 0 ? (openBlock(true), createElementBlock(Fragment, { key: 0 }, renderList(staticData.value.lrcArray, (line, index2) => {
                return openBlock(), createElementBlock("div", {
                  key: index2,
                  class: normalizeClass(["lyric-line", {
                    "lyric-line-current": index2 === currentIndex.value,
                    "lyric-line-passed": index2 < currentIndex.value,
                    "lyric-line-next": index2 === currentIndex.value + 1
                  }]),
                  style: normalizeStyle(lyricLineStyle.value)
                }, [
                  createBaseVNode("div", {
                    class: "lyric-text",
                    style: normalizeStyle({ fontSize: `${fontSize.value}px` })
                  }, [
                    createBaseVNode("span", {
                      class: "lyric-text-inner",
                      style: normalizeStyle(getLyricStyle(index2))
                    }, toDisplayString(line.text || ""), 5)
                  ], 4),
                  line.trText ? (openBlock(), createElementBlock("div", {
                    key: 0,
                    class: "lyric-translation",
                    style: normalizeStyle({ fontSize: `${fontSize.value * 0.6}px` })
                  }, toDisplayString(line.trText), 5)) : createCommentVNode("", true)
                ], 6);
              }), 128)) : (openBlock(), createElementBlock("div", _hoisted_9, "无歌词"))
            ], 4)
          ])
        ], 512)
      ], 34);
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-4abaac34"]]);
export {
  index as default
};
