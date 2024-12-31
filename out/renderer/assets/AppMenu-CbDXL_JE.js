import { d as defineComponent, af as useRoute, r as ref, E as watch, ar as resolveComponent, j as openBlock, c as createElementBlock, b as createBaseVNode, u as unref, a3 as Fragment, a4 as renderList, e as createVNode, f as withCtx, n as normalizeClass, a2 as normalizeStyle, t as toDisplayString, T as createCommentVNode, _ as _export_sfc } from "./index-DKaFsuse.js";
const icon = "" + new URL("icon-mGmYaNg4.png", import.meta.url).href;
const _hoisted_1 = { class: "app-menu-header" };
const _hoisted_2 = ["src"];
const _hoisted_3 = { class: "app-menu-list" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "AppMenu",
  props: {
    size: {
      type: String,
      default: "26px"
    },
    color: {
      type: String,
      default: "#aaa"
    },
    selectColor: {
      type: String,
      default: "#10B981"
    },
    menus: {
      type: Array,
      default: () => []
    }
  },
  setup(__props) {
    const props = __props;
    const route = useRoute();
    const path = ref(route.path);
    watch(
      () => route.path,
      async (newParams) => {
        path.value = newParams;
      }
    );
    const isChecked = (index) => {
      return path.value === props.menus[index].path;
    };
    const iconStyle = (index) => {
      const style = {
        fontSize: props.size,
        color: isChecked(index) ? props.selectColor : props.color
      };
      return style;
    };
    const isText = ref(false);
    return (_ctx, _cache) => {
      const _component_router_link = resolveComponent("router-link");
      return openBlock(), createElementBlock("div", null, [
        createBaseVNode("div", {
          class: normalizeClass(["app-menu", { "app-menu-expanded": unref(isText) }])
        }, [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", {
              class: "app-menu-logo",
              onClick: _cache[0] || (_cache[0] = ($event) => isText.value = !unref(isText))
            }, [
              createBaseVNode("img", {
                src: unref(icon),
                class: "w-9 h-9",
                alt: "logo"
              }, null, 8, _hoisted_2)
            ])
          ]),
          createBaseVNode("div", _hoisted_3, [
            (openBlock(true), createElementBlock(Fragment, null, renderList(__props.menus, (item, index) => {
              return openBlock(), createElementBlock("div", {
                key: item.path,
                class: "app-menu-item"
              }, [
                createVNode(_component_router_link, {
                  class: "app-menu-item-link",
                  to: item.path
                }, {
                  default: withCtx(() => [
                    createBaseVNode("i", {
                      class: normalizeClass(["iconfont app-menu-item-icon", item.meta.icon]),
                      style: normalizeStyle(iconStyle(index))
                    }, null, 6),
                    unref(isText) ? (openBlock(), createElementBlock("span", {
                      key: 0,
                      class: normalizeClass(["app-menu-item-text ml-3", isChecked(index) ? "text-green-500" : ""])
                    }, toDisplayString(item.meta.title), 3)) : createCommentVNode("", true)
                  ]),
                  _: 2
                }, 1032, ["to"])
              ]);
            }), 128))
          ])
        ], 2)
      ]);
    };
  }
});
const AppMenu = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-f209e92f"]]);
export {
  AppMenu as default
};
