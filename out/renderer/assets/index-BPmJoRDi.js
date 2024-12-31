import { ad as request, d as defineComponent, r as ref, G as computed, aq as onActivated, c as createElementBlock, n as normalizeClass, u as unref, a2 as normalizeStyle, b as createBaseVNode, t as toDisplayString, e as createVNode, f as withCtx, T as createCommentVNode, w as withDirectives, S as Scrollbar, ab as resolveDirective, g as useStore, h as useRouter, j as openBlock, s as setAnimationClass, a7 as getImgUrl, a3 as Fragment, a4 as renderList, U as PlayBottom, ac as isMobile, a5 as setAnimationDelay, _ as _export_sfc } from "./index-DKaFsuse.js";
import { M as MusicList, a as getListDetail } from "./MusicList-s-QHu-iA.js";
import { S as SongItem } from "./SongItem-CoswpGn6.js";
import { _ as __unplugin_components_2 } from "./Avatar-rQ2og-6c.js";
import { N as NImage } from "./Image-DXClIklC.js";
import "./Drawer-BEJ8Ydua.js";
import "./Ellipsis-D4R5dIX2.js";
import "./Tag-C0oC92WF.js";
import "./use-locale-DLWAOXez.js";
function getUserDetail(uid) {
  return request.get("/user/detail", { params: { uid } });
}
function getUserPlaylist(uid) {
  return request.get("/user/playlist", { params: { uid } });
}
function getUserRecord(uid, type = 0) {
  return request.get("/user/record", { params: { uid, type } });
}
const _hoisted_1 = { class: "user-page" };
const _hoisted_2 = { class: "page" };
const _hoisted_3 = { class: "user-name" };
const _hoisted_4 = { class: "user-info" };
const _hoisted_5 = { class: "user-info-list" };
const _hoisted_6 = { class: "user-info-item" };
const _hoisted_7 = { class: "label" };
const _hoisted_8 = { class: "user-info-item" };
const _hoisted_9 = { class: "label" };
const _hoisted_10 = { class: "user-info-item" };
const _hoisted_11 = { class: "label" };
const _hoisted_12 = { class: "uesr-signature" };
const _hoisted_13 = ["onClick"];
const _hoisted_14 = { class: "play-list-item-info" };
const _hoisted_15 = { class: "play-list-item-name" };
const _hoisted_16 = { class: "play-list-item-count" };
const _hoisted_17 = { class: "record-list" };
const _hoisted_18 = { class: "play-count" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "User"
  },
  __name: "index",
  setup(__props) {
    const store = useStore();
    const router = useRouter();
    const userDetail = ref();
    const playList = ref([]);
    const recordList = ref();
    const infoLoading = ref(false);
    const user = computed(() => store.state.user);
    const loadPage = async () => {
      if (!user.value) {
        router.push("/login");
        return;
      }
      infoLoading.value = true;
      const { data: userData } = await getUserDetail(user.value.userId);
      userDetail.value = userData;
      const { data: playlistData } = await getUserPlaylist(user.value.userId);
      playList.value = playlistData.playlist;
      const { data: recordData } = await getUserRecord(user.value.userId);
      recordList.value = recordData.allData.map((item) => ({
        ...item,
        ...item.song,
        picUrl: item.song.al.picUrl
      }));
      infoLoading.value = false;
    };
    onActivated(() => {
      if (!user.value) {
        router.push("/login");
      } else {
        loadPage();
      }
    });
    const isShowList = ref(false);
    const list = ref();
    const listLoading = ref(false);
    const showPlaylist = async (id, name) => {
      isShowList.value = true;
      listLoading.value = true;
      list.value = {
        name
      };
      const { data } = await getListDetail(id);
      list.value = data.playlist;
      listLoading.value = false;
    };
    const handlePlay = () => {
      const tracks = recordList.value || [];
      store.commit("setPlayList", tracks);
    };
    return (_ctx, _cache) => {
      const _component_n_avatar = __unplugin_components_2;
      const _component_n_image = NImage;
      const _component_n_scrollbar = Scrollbar;
      const _directive_loading = resolveDirective("loading");
      return openBlock(), createElementBlock("div", _hoisted_1, [
        userDetail.value ? (openBlock(), createElementBlock("div", {
          key: 0,
          class: normalizeClass(["left", unref(setAnimationClass)("animate__fadeInLeft")]),
          style: normalizeStyle({ backgroundImage: `url(${unref(getImgUrl)(user.value.backgroundUrl)})` })
        }, [
          createBaseVNode("div", _hoisted_2, [
            createBaseVNode("div", _hoisted_3, toDisplayString(user.value.nickname), 1),
            createBaseVNode("div", _hoisted_4, [
              createVNode(_component_n_avatar, {
                round: "",
                size: 50,
                src: unref(getImgUrl)(user.value.avatarUrl, "50y50")
              }, null, 8, ["src"]),
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("div", _hoisted_6, [
                  createBaseVNode("div", _hoisted_7, toDisplayString(userDetail.value.profile.followeds), 1),
                  _cache[1] || (_cache[1] = createBaseVNode("div", null, "粉丝", -1))
                ]),
                createBaseVNode("div", _hoisted_8, [
                  createBaseVNode("div", _hoisted_9, toDisplayString(userDetail.value.profile.follows), 1),
                  _cache[2] || (_cache[2] = createBaseVNode("div", null, "关注", -1))
                ]),
                createBaseVNode("div", _hoisted_10, [
                  createBaseVNode("div", _hoisted_11, toDisplayString(userDetail.value.level), 1),
                  _cache[3] || (_cache[3] = createBaseVNode("div", null, "等级", -1))
                ])
              ])
            ]),
            createBaseVNode("div", _hoisted_12, toDisplayString(userDetail.value.profile.signature), 1),
            createBaseVNode("div", {
              class: normalizeClass(["play-list", unref(setAnimationClass)("animate__fadeInLeft")])
            }, [
              _cache[4] || (_cache[4] = createBaseVNode("div", { class: "title" }, "创建的歌单", -1)),
              createVNode(_component_n_scrollbar, null, {
                default: withCtx(() => [
                  (openBlock(true), createElementBlock(Fragment, null, renderList(playList.value, (item, index2) => {
                    return openBlock(), createElementBlock("div", {
                      key: index2,
                      class: "play-list-item",
                      onClick: ($event) => showPlaylist(item.id, item.name)
                    }, [
                      createVNode(_component_n_image, {
                        src: unref(getImgUrl)(item.coverImgUrl, "50y50"),
                        class: "play-list-item-img",
                        lazy: "",
                        "preview-disabled": ""
                      }, null, 8, ["src"]),
                      createBaseVNode("div", _hoisted_14, [
                        createBaseVNode("div", _hoisted_15, toDisplayString(item.name), 1),
                        createBaseVNode("div", _hoisted_16, toDisplayString(item.trackCount) + "首，播放" + toDisplayString(item.playCount) + "次 ", 1)
                      ])
                    ], 8, _hoisted_13);
                  }), 128)),
                  createVNode(PlayBottom)
                ]),
                _: 1
              })
            ], 2)
          ])
        ], 6)) : createCommentVNode("", true),
        !unref(isMobile) ? withDirectives((openBlock(), createElementBlock("div", {
          key: 1,
          class: normalizeClass(["right", unref(setAnimationClass)("animate__fadeInRight")])
        }, [
          _cache[5] || (_cache[5] = createBaseVNode("div", { class: "title" }, "听歌排行", -1)),
          createBaseVNode("div", _hoisted_17, [
            createVNode(_component_n_scrollbar, null, {
              default: withCtx(() => [
                (openBlock(true), createElementBlock(Fragment, null, renderList(recordList.value, (item, index2) => {
                  return openBlock(), createElementBlock("div", {
                    key: item.id,
                    class: normalizeClass(["record-item", unref(setAnimationClass)("animate__bounceInUp")]),
                    style: normalizeStyle(unref(setAnimationDelay)(index2, 25))
                  }, [
                    createVNode(SongItem, {
                      class: "song-item",
                      item,
                      onPlay: handlePlay
                    }, null, 8, ["item"]),
                    createBaseVNode("div", _hoisted_18, toDisplayString(item.playCount) + "次", 1)
                  ], 6);
                }), 128)),
                createVNode(PlayBottom)
              ]),
              _: 1
            })
          ])
        ], 2)), [
          [_directive_loading, infoLoading.value]
        ]) : createCommentVNode("", true),
        createVNode(MusicList, {
          show: isShowList.value,
          "onUpdate:show": _cache[0] || (_cache[0] = ($event) => isShowList.value = $event),
          name: list.value?.name || "",
          "song-list": list.value?.tracks || [],
          "list-info": list.value,
          loading: listLoading.value
        }, null, 8, ["show", "name", "song-list", "list-info", "loading"])
      ]);
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-be63ae6f"]]);
export {
  index as default
};
