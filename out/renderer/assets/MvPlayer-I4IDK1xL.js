import { ad as request, d as defineComponent, r as ref, E as watch, o as onMounted, a1 as onUnmounted, G as computed, O as createBlock, f as withCtx, g as useStore, j as openBlock, b as createBaseVNode, n as normalizeClass, c as createElementBlock, e as createVNode, u as unref, B as Button, T as createCommentVNode, a2 as normalizeStyle, k as createTextVNode, t as toDisplayString, ak as Transition, M as nextTick, aj as __unplugin_components_0$1, _ as _export_sfc } from "./index-DKaFsuse.js";
import { N as NIcon } from "./Icon-DucaliTK.js";
import { _ as __unplugin_components_0 } from "./Slider-BA6NituQ.js";
import { _ as __unplugin_components_3 } from "./Image-DXClIklC.js";
import { _ as __unplugin_components_2 } from "./Drawer-BEJ8Ydua.js";
import { _ as __unplugin_components_2$1 } from "./Ellipsis-D4R5dIX2.js";
const getTopMv = (params) => {
  return request({
    url: "/mv/all",
    method: "get",
    params
  });
};
const getAllMv = (params) => {
  return request({
    url: "/mv/all",
    method: "get",
    params
  });
};
const getMvUrl = (id) => {
  return request.get("/mv/url", {
    params: {
      id
    }
  });
};
const _hoisted_1 = { class: "mv-detail" };
const _hoisted_2 = ["src"];
const _hoisted_3 = { class: "progress-bar custom-slider" };
const _hoisted_4 = { class: "progress-rail" };
const _hoisted_5 = { class: "controls-main" };
const _hoisted_6 = { class: "left-controls" };
const _hoisted_7 = {
  key: 1,
  class: "ri-skip-back-line"
};
const _hoisted_8 = {
  key: 1,
  class: "ri-skip-forward-line"
};
const _hoisted_9 = { class: "time-display" };
const _hoisted_10 = { class: "right-controls" };
const _hoisted_11 = {
  key: 0,
  class: "volume-control custom-slider"
};
const _hoisted_12 = {
  key: 0,
  class: "mode-hint"
};
const _hoisted_13 = { class: "mode-text" };
const _hoisted_14 = { class: "title" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "MvPlayer",
  props: {
    show: { type: Boolean, default: false },
    currentMv: { default: void 0 },
    noList: { type: Boolean, default: false }
  },
  emits: ["update:show", "next", "prev"],
  setup(__props, { emit: __emit }) {
    const PLAY_MODE = {
      Single: "single",
      Auto: "auto"
    };
    const props = __props;
    const emit = __emit;
    const store = useStore();
    const mvUrl = ref();
    const playMode = ref(PLAY_MODE.Auto);
    const videoRef = ref();
    const isPlaying = ref(false);
    const currentTime = ref(0);
    const duration = ref(0);
    const progress = ref(0);
    const bufferedProgress = ref(0);
    const volume = ref(100);
    const showControls = ref(true);
    let controlsTimer = null;
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
    };
    const togglePlay = () => {
      if (!videoRef.value) return;
      if (isPlaying.value) {
        videoRef.value.pause();
      } else {
        videoRef.value.play();
      }
      resetCursorTimer();
    };
    const toggleMute = () => {
      if (!videoRef.value) return;
      if (volume.value === 0) {
        volume.value = 100;
      } else {
        volume.value = 0;
      }
    };
    watch(volume, (newVolume) => {
      if (videoRef.value) {
        videoRef.value.volume = newVolume / 100;
      }
    });
    const handleProgressChange = (value) => {
      if (!videoRef.value || !duration.value) return;
      const newTime = value / 100 * duration.value;
      videoRef.value.currentTime = newTime;
    };
    const handleTimeUpdate = () => {
      if (!videoRef.value) return;
      currentTime.value = videoRef.value.currentTime;
      if (!isDragging.value) {
        progress.value = currentTime.value / duration.value * 100;
      }
      if (videoRef.value.buffered.length > 0) {
        bufferedProgress.value = videoRef.value.buffered.end(0) / duration.value * 100;
      }
    };
    const handleLoadedMetadata = () => {
      if (!videoRef.value) return;
      duration.value = videoRef.value.duration;
    };
    const resetControlsTimer = () => {
      if (controlsTimer) {
        clearTimeout(controlsTimer);
      }
      showControls.value = true;
      controlsTimer = setTimeout(() => {
        if (isPlaying.value) {
          showControls.value = false;
        }
      }, 3e3);
    };
    const handleMouseMove = () => {
      resetControlsTimer();
      resetCursorTimer();
    };
    onMounted(() => {
      document.addEventListener("mousemove", handleMouseMove);
    });
    onUnmounted(() => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimer) {
        clearTimeout(controlsTimer);
      }
      if (cursorTimer) {
        clearTimeout(cursorTimer);
      }
      unlockScreenOrientation();
    });
    watch(
      () => props.currentMv,
      async (newMv) => {
        if (newMv) {
          await loadMvUrl(newMv);
        }
      }
    );
    const autoPlayBlocked = ref(false);
    const playLoading = ref(false);
    const loadMvUrl = async (mv) => {
      playLoading.value = true;
      autoPlayBlocked.value = false;
      try {
        const res = await getMvUrl(mv.id);
        mvUrl.value = res.data.data.url;
        await nextTick();
        if (videoRef.value) {
          try {
            await videoRef.value.play();
          } catch (error) {
            console.warn("自动播放失败，可能需要用户交互:", error);
            autoPlayBlocked.value = true;
          }
        }
      } catch (error) {
        console.error("加载MV地址失败:", error);
      } finally {
        playLoading.value = false;
      }
    };
    const handleClose = () => {
      emit("update:show", false);
      if (store.state.playMusicUrl) {
        store.commit("setIsPlay", true);
      }
    };
    const handleEnded = () => {
      if (playMode.value === PLAY_MODE.Single) {
        if (props.currentMv) {
          loadMvUrl(props.currentMv);
        }
      } else {
        emit("next", (value) => {
          nextLoading.value = value;
        });
      }
    };
    const togglePlayMode = () => {
      playMode.value = playMode.value === PLAY_MODE.Auto ? PLAY_MODE.Single : PLAY_MODE.Auto;
      showModeHint.value = true;
      setTimeout(() => {
        showModeHint.value = false;
      }, 1500);
    };
    const isDragging = ref(false);
    const videoContainerRef = ref();
    const isFullscreen = ref(false);
    const checkFullscreenAPI = () => {
      const doc = document;
      return {
        requestFullscreen: videoContainerRef.value?.requestFullscreen || videoContainerRef.value?.webkitRequestFullscreen || videoContainerRef.value?.mozRequestFullScreen || videoContainerRef.value?.msRequestFullscreen,
        exitFullscreen: doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen,
        fullscreenElement: doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement,
        fullscreenEnabled: doc.fullscreenEnabled || doc.webkitFullscreenEnabled || doc.mozFullScreenEnabled || doc.msFullscreenEnabled
      };
    };
    const lockScreenOrientation = async () => {
      try {
        if ("orientation" in screen) {
          await screen.orientation.lock("landscape");
        }
      } catch (error) {
        console.warn("无法锁定屏幕方向:", error);
      }
    };
    const unlockScreenOrientation = () => {
      try {
        if ("orientation" in screen) {
          screen.orientation.unlock();
        }
      } catch (error) {
        console.warn("无法解锁屏幕方向:", error);
      }
    };
    const toggleFullscreen = async () => {
      const api = checkFullscreenAPI();
      if (!api.fullscreenEnabled) {
        console.warn("全屏API不可用");
        return;
      }
      try {
        if (!api.fullscreenElement) {
          await videoContainerRef.value?.requestFullscreen();
          isFullscreen.value = true;
          if (window.innerWidth <= 768) {
            await lockScreenOrientation();
          }
        } else {
          await document.exitFullscreen();
          isFullscreen.value = false;
          if (window.innerWidth <= 768) {
            unlockScreenOrientation();
          }
        }
      } catch (error) {
        console.error("切换全屏失败:", error);
      }
    };
    const handleFullscreenChange = () => {
      const api = checkFullscreenAPI();
      isFullscreen.value = !!api.fullscreenElement;
    };
    onMounted(() => {
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.addEventListener("mozfullscreenchange", handleFullscreenChange);
      document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    });
    onUnmounted(() => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    });
    const handleKeyPress = (e) => {
      if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    onMounted(() => {
      document.addEventListener("keydown", handleKeyPress);
    });
    onUnmounted(() => {
      document.removeEventListener("keydown", handleKeyPress);
    });
    const showModeHint = ref(false);
    const prevLoading = ref(false);
    const nextLoading = ref(false);
    const handlePrev = () => {
      prevLoading.value = true;
      emit("prev", (value) => {
        prevLoading.value = value;
      });
    };
    const handleNext = () => {
      nextLoading.value = true;
      emit("next", (value) => {
        nextLoading.value = value;
      });
    };
    const showCursor = ref(true);
    let cursorTimer = null;
    const resetCursorTimer = () => {
      if (cursorTimer) {
        clearTimeout(cursorTimer);
      }
      showCursor.value = true;
      if (isPlaying.value && !showControls.value) {
        cursorTimer = setTimeout(() => {
          showCursor.value = false;
        }, 3e3);
      }
    };
    watch(isPlaying, (newValue) => {
      if (!newValue) {
        showCursor.value = true;
        if (cursorTimer) {
          clearTimeout(cursorTimer);
        }
      } else {
        resetCursorTimer();
      }
    });
    watch(showControls, (newValue) => {
      if (newValue) {
        showCursor.value = true;
        if (cursorTimer) {
          clearTimeout(cursorTimer);
        }
      } else {
        resetCursorTimer();
      }
    });
    const isMobile = computed(() => store.state.isMobile);
    return (_ctx, _cache) => {
      const _component_n_spin = __unplugin_components_0$1;
      const _component_n_ellipsis = __unplugin_components_2$1;
      const _component_n_drawer = __unplugin_components_2;
      return openBlock(), createBlock(_component_n_drawer, {
        show: _ctx.show,
        height: "100%",
        placement: "bottom",
        "z-index": 999999999,
        to: `#layout-main`
      }, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", {
              ref_key: "videoContainerRef",
              ref: videoContainerRef,
              class: normalizeClass(["video-container", { "cursor-hidden": !showCursor.value }])
            }, [
              createBaseVNode("video", {
                ref_key: "videoRef",
                ref: videoRef,
                src: mvUrl.value,
                class: "video-player",
                onEnded: handleEnded,
                onTimeupdate: handleTimeUpdate,
                onLoadedmetadata: handleLoadedMetadata,
                onPlay: _cache[0] || (_cache[0] = ($event) => isPlaying.value = true),
                onPause: _cache[1] || (_cache[1] = ($event) => isPlaying.value = false),
                onClick: togglePlay
              }, null, 40, _hoisted_2),
              autoPlayBlocked.value ? (openBlock(), createElementBlock("div", {
                key: 0,
                class: "play-hint",
                onClick: togglePlay
              }, [
                createVNode(unref(Button), {
                  quaternary: "",
                  circle: "",
                  size: "large"
                }, {
                  icon: withCtx(() => [
                    createVNode(unref(NIcon), { size: "48" }, {
                      default: withCtx(() => _cache[4] || (_cache[4] = [
                        createBaseVNode("i", { class: "ri-play-circle-line" }, null, -1)
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ])) : createCommentVNode("", true),
              createBaseVNode("div", {
                class: normalizeClass(["custom-controls", { "controls-hidden": !showControls.value }])
              }, [
                createBaseVNode("div", _hoisted_3, [
                  createVNode(unref(__unplugin_components_0), {
                    value: progress.value,
                    "onUpdate:value": [
                      _cache[2] || (_cache[2] = ($event) => progress.value = $event),
                      handleProgressChange
                    ],
                    min: 0,
                    max: 100,
                    tooltip: false,
                    step: 0.1
                  }, {
                    rail: withCtx(() => [
                      createBaseVNode("div", _hoisted_4, [
                        createBaseVNode("div", {
                          class: "progress-buffer",
                          style: normalizeStyle({ width: `${bufferedProgress.value}%` })
                        }, null, 4)
                      ])
                    ]),
                    _: 1
                  }, 8, ["value"])
                ]),
                createBaseVNode("div", _hoisted_5, [
                  createBaseVNode("div", _hoisted_6, [
                    !props.noList ? (openBlock(), createBlock(unref(__unplugin_components_3), {
                      key: 0,
                      placement: "top"
                    }, {
                      trigger: withCtx(() => [
                        createVNode(unref(Button), {
                          quaternary: "",
                          circle: "",
                          onClick: handlePrev
                        }, {
                          icon: withCtx(() => [
                            createVNode(unref(NIcon), { size: "24" }, {
                              default: withCtx(() => [
                                prevLoading.value ? (openBlock(), createBlock(_component_n_spin, {
                                  key: 0,
                                  size: "small"
                                })) : (openBlock(), createElementBlock("i", _hoisted_7))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        _cache[5] || (_cache[5] = createTextVNode(" 上一个 "))
                      ]),
                      _: 1
                    })) : createCommentVNode("", true),
                    createVNode(unref(__unplugin_components_3), { placement: "top" }, {
                      trigger: withCtx(() => [
                        createVNode(unref(Button), {
                          quaternary: "",
                          circle: "",
                          onClick: togglePlay
                        }, {
                          icon: withCtx(() => [
                            createVNode(unref(NIcon), { size: "24" }, {
                              default: withCtx(() => [
                                playLoading.value ? (openBlock(), createBlock(_component_n_spin, {
                                  key: 0,
                                  size: "small"
                                })) : (openBlock(), createElementBlock("i", {
                                  key: 1,
                                  class: normalizeClass(isPlaying.value ? "ri-pause-line" : "ri-play-line")
                                }, null, 2))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(isPlaying.value ? "暂停" : "播放"), 1)
                      ]),
                      _: 1
                    }),
                    !props.noList ? (openBlock(), createBlock(unref(__unplugin_components_3), {
                      key: 1,
                      placement: "top"
                    }, {
                      trigger: withCtx(() => [
                        createVNode(unref(Button), {
                          quaternary: "",
                          circle: "",
                          onClick: handleNext
                        }, {
                          icon: withCtx(() => [
                            createVNode(unref(NIcon), { size: "24" }, {
                              default: withCtx(() => [
                                nextLoading.value ? (openBlock(), createBlock(_component_n_spin, {
                                  key: 0,
                                  size: "small"
                                })) : (openBlock(), createElementBlock("i", _hoisted_8))
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        _cache[6] || (_cache[6] = createTextVNode(" 下一个 "))
                      ]),
                      _: 1
                    })) : createCommentVNode("", true),
                    createBaseVNode("div", _hoisted_9, toDisplayString(formatTime(currentTime.value)) + " / " + toDisplayString(formatTime(duration.value)), 1)
                  ]),
                  createBaseVNode("div", _hoisted_10, [
                    !isMobile.value ? (openBlock(), createElementBlock("div", _hoisted_11, [
                      createVNode(unref(__unplugin_components_3), { placement: "top" }, {
                        trigger: withCtx(() => [
                          createVNode(unref(Button), {
                            quaternary: "",
                            circle: "",
                            onClick: toggleMute
                          }, {
                            icon: withCtx(() => [
                              createVNode(unref(NIcon), { size: "24" }, {
                                default: withCtx(() => [
                                  createBaseVNode("i", {
                                    class: normalizeClass(volume.value === 0 ? "ri-volume-mute-line" : "ri-volume-up-line")
                                  }, null, 2)
                                ]),
                                _: 1
                              })
                            ]),
                            _: 1
                          })
                        ]),
                        default: withCtx(() => [
                          createTextVNode(" " + toDisplayString(volume.value === 0 ? "取消静音" : "静音"), 1)
                        ]),
                        _: 1
                      }),
                      createVNode(unref(__unplugin_components_0), {
                        value: volume.value,
                        "onUpdate:value": _cache[3] || (_cache[3] = ($event) => volume.value = $event),
                        min: 0,
                        max: 100,
                        tooltip: false,
                        class: "volume-slider"
                      }, null, 8, ["value"])
                    ])) : createCommentVNode("", true),
                    !props.noList ? (openBlock(), createBlock(unref(__unplugin_components_3), {
                      key: 1,
                      placement: "top"
                    }, {
                      trigger: withCtx(() => [
                        createVNode(unref(Button), {
                          quaternary: "",
                          circle: "",
                          class: "play-mode-btn",
                          onClick: togglePlayMode
                        }, {
                          icon: withCtx(() => [
                            createVNode(unref(NIcon), { size: "24" }, {
                              default: withCtx(() => [
                                createBaseVNode("i", {
                                  class: normalizeClass(
                                    playMode.value === "single" ? "ri-repeat-one-line" : "ri-play-list-line"
                                  )
                                }, null, 2)
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(playMode.value === "single" ? "单曲循环" : "列表循环"), 1)
                      ]),
                      _: 1
                    })) : createCommentVNode("", true),
                    createVNode(unref(__unplugin_components_3), { placement: "top" }, {
                      trigger: withCtx(() => [
                        createVNode(unref(Button), {
                          quaternary: "",
                          circle: "",
                          onClick: toggleFullscreen
                        }, {
                          icon: withCtx(() => [
                            createVNode(unref(NIcon), { size: "24" }, {
                              default: withCtx(() => [
                                createBaseVNode("i", {
                                  class: normalizeClass(isFullscreen.value ? "ri-fullscreen-exit-line" : "ri-fullscreen-line")
                                }, null, 2)
                              ]),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        createTextVNode(" " + toDisplayString(isFullscreen.value ? "退出全屏" : "全屏"), 1)
                      ]),
                      _: 1
                    }),
                    createVNode(unref(__unplugin_components_3), { placement: "top" }, {
                      trigger: withCtx(() => [
                        createVNode(unref(Button), {
                          quaternary: "",
                          circle: "",
                          onClick: handleClose
                        }, {
                          icon: withCtx(() => [
                            createVNode(unref(NIcon), { size: "24" }, {
                              default: withCtx(() => _cache[7] || (_cache[7] = [
                                createBaseVNode("i", { class: "ri-close-line" }, null, -1)
                              ])),
                              _: 1
                            })
                          ]),
                          _: 1
                        })
                      ]),
                      default: withCtx(() => [
                        _cache[8] || (_cache[8] = createTextVNode(" 关闭 "))
                      ]),
                      _: 1
                    })
                  ])
                ])
              ], 2),
              createVNode(Transition, { name: "fade" }, {
                default: withCtx(() => [
                  showModeHint.value ? (openBlock(), createElementBlock("div", _hoisted_12, [
                    createVNode(unref(NIcon), {
                      size: "48",
                      class: "mode-icon"
                    }, {
                      default: withCtx(() => [
                        createBaseVNode("i", {
                          class: normalizeClass(playMode.value === "single" ? "ri-repeat-one-line" : "ri-play-list-line")
                        }, null, 2)
                      ]),
                      _: 1
                    }),
                    createBaseVNode("div", _hoisted_13, toDisplayString(playMode.value === "single" ? "单曲循环" : "自动播放下一个"), 1)
                  ])) : createCommentVNode("", true)
                ]),
                _: 1
              })
            ], 2),
            createBaseVNode("div", {
              class: normalizeClass(["mv-detail-title", { "title-hidden": !showControls.value }])
            }, [
              createBaseVNode("div", _hoisted_14, [
                createVNode(_component_n_ellipsis, null, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(_ctx.currentMv?.name), 1)
                  ]),
                  _: 1
                })
              ])
            ], 2)
          ])
        ]),
        _: 1
      }, 8, ["show"]);
    };
  }
});
const MvPlayer = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f4c63e83"]]);
export {
  MvPlayer as M,
  getAllMv as a,
  getTopMv as g
};
