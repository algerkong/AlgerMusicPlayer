import { d as defineComponent, g as useStore, G as computed, aG as useTemplateRef, j as openBlock, c as createElementBlock, O as createBlock, u as unref, a7 as getImgUrl, T as createCommentVNode, b as createBaseVNode, e as createVNode, f as withCtx, k as createTextVNode, t as toDisplayString, a3 as Fragment, a4 as renderList, n as normalizeClass, ah as withModifiers, b5 as getImageBackground, ae as audioService, _ as _export_sfc } from "./index-DKaFsuse.js";
import { N as NImage } from "./Image-DXClIklC.js";
import { _ as __unplugin_components_2 } from "./Ellipsis-D4R5dIX2.js";
const _hoisted_1 = { class: "song-item-content" };
const _hoisted_2 = {
  key: 0,
  class: "song-item-content-wrapper"
};
const _hoisted_3 = { class: "song-item-content-title" };
const _hoisted_4 = { class: "song-item-content-name" };
const _hoisted_5 = {
  key: 0,
  class: "song-item-operating-like"
};
const _hoisted_6 = {
  key: 0,
  class: "iconfont icon-stop"
};
const _hoisted_7 = {
  key: 1,
  class: "iconfont icon-playfill"
};
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "SongItem",
  props: {
    item: {},
    mini: { type: Boolean, default: false },
    list: { type: Boolean, default: false },
    favorite: { type: Boolean, default: true }
  },
  emits: ["play"],
  setup(__props, { emit: __emit }) {
    const props = __props;
    const store = useStore();
    const play = computed(() => store.state.play);
    const playMusic = computed(() => store.state.playMusic);
    const playLoading = computed(
      () => playMusic.value.id === props.item.id && playMusic.value.playLoading
    );
    const isPlaying = computed(() => {
      return playMusic.value.id === props.item.id;
    });
    const emits = __emit;
    const songImageRef = useTemplateRef("songImg");
    const imageLoad = async () => {
      if (!songImageRef.value) {
        return;
      }
      const { backgroundColor } = await getImageBackground(
        songImageRef.value.imageRef
      );
      props.item.backgroundColor = backgroundColor;
    };
    const playMusicEvent = async (item) => {
      if (playMusic.value.id === item.id) {
        if (play.value) {
          store.commit("setPlayMusic", false);
          audioService.getCurrentSound()?.pause();
        } else {
          store.commit("setPlayMusic", true);
          audioService.getCurrentSound()?.play();
        }
        return;
      }
      await store.commit("setPlay", item);
      store.commit("setIsPlay", true);
      emits("play", item);
    };
    const isFavorite = computed(() => {
      return store.state.favoriteList.includes(props.item.id);
    });
    const toggleFavorite = async (e) => {
      e.stopPropagation();
      if (isFavorite.value) {
        store.commit("removeFromFavorite", props.item.id);
      } else {
        store.commit("addToFavorite", props.item.id);
      }
    };
    return (_ctx, _cache) => {
      const _component_n_image = NImage;
      const _component_n_ellipsis = __unplugin_components_2;
      return openBlock(), createElementBlock("div", {
        class: normalizeClass(["song-item", { "song-mini": _ctx.mini, "song-list": _ctx.list }])
      }, [
        _ctx.item.picUrl ? (openBlock(), createBlock(_component_n_image, {
          key: 0,
          ref: "songImg",
          src: unref(getImgUrl)(_ctx.item.picUrl, "100y100"),
          class: "song-item-img",
          "preview-disabled": "",
          "img-props": {
            crossorigin: "anonymous"
          },
          onLoad: imageLoad
        }, null, 8, ["src"])) : createCommentVNode("", true),
        createBaseVNode("div", _hoisted_1, [
          _ctx.list ? (openBlock(), createElementBlock("div", _hoisted_2, [
            createVNode(_component_n_ellipsis, {
              class: "song-item-content-title text-ellipsis",
              "line-clamp": "1"
            }, {
              default: withCtx(() => [
                createTextVNode(toDisplayString(_ctx.item.name), 1)
              ]),
              _: 1
            }),
            _cache[1] || (_cache[1] = createBaseVNode("div", { class: "song-item-content-divider" }, "-", -1)),
            createVNode(_component_n_ellipsis, {
              class: "song-item-content-name text-ellipsis",
              "line-clamp": "1"
            }, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.item.ar || _ctx.item.song.artists, (artists, artistsindex) => {
                  return openBlock(), createElementBlock("span", { key: artistsindex }, toDisplayString(artists.name) + toDisplayString(artistsindex < (_ctx.item.ar || _ctx.item.song.artists).length - 1 ? " / " : ""), 1);
                }), 128))
              ]),
              _: 1
            })
          ])) : (openBlock(), createElementBlock(Fragment, { key: 1 }, [
            createBaseVNode("div", _hoisted_3, [
              createVNode(_component_n_ellipsis, {
                class: "text-ellipsis",
                "line-clamp": "1"
              }, {
                default: withCtx(() => [
                  createTextVNode(toDisplayString(_ctx.item.name), 1)
                ]),
                _: 1
              })
            ]),
            createBaseVNode("div", _hoisted_4, [
              createVNode(_component_n_ellipsis, {
                class: "text-ellipsis",
                "line-clamp": "1"
              }, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(_ctx.item.ar || _ctx.item.song.artists, (artists, artistsindex) => {
                    return openBlock(), createElementBlock("span", { key: artistsindex }, toDisplayString(artists.name) + toDisplayString(artistsindex < (_ctx.item.ar || _ctx.item.song.artists).length - 1 ? " / " : ""), 1);
                  }), 128))
                ]),
                _: 1
              })
            ])
          ], 64))
        ]),
        createBaseVNode("div", {
          class: normalizeClass(["song-item-operating", { "song-item-operating-list": _ctx.list }])
        }, [
          _ctx.favorite ? (openBlock(), createElementBlock("div", _hoisted_5, [
            createBaseVNode("i", {
              class: normalizeClass(["iconfont icon-likefill", { "like-active": isFavorite.value }]),
              onClick: withModifiers(toggleFavorite, ["stop"])
            }, null, 2)
          ])) : createCommentVNode("", true),
          createBaseVNode("div", {
            class: normalizeClass(["song-item-operating-play bg-gray-300 dark:bg-gray-800 animate__animated", { "bg-green-600": isPlaying.value, animate__flipInY: playLoading.value }]),
            onClick: _cache[0] || (_cache[0] = ($event) => playMusicEvent(_ctx.item))
          }, [
            isPlaying.value && play.value ? (openBlock(), createElementBlock("i", _hoisted_6)) : (openBlock(), createElementBlock("i", _hoisted_7))
          ], 2)
        ], 2)
      ], 2);
    };
  }
});
const SongItem = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-aae6c67f"]]);
export {
  SongItem as S
};
