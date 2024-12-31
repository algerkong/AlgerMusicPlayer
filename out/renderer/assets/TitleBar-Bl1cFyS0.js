import { as as inject, ce as dialogApiInjectionKey, bi as throwError, d as defineComponent, j as openBlock, c as createElementBlock, b as createBaseVNode, R as isElectron, _ as _export_sfc } from "./index-DKaFsuse.js";
function useDialog() {
  const dialog = inject(dialogApiInjectionKey, null);
  if (dialog === null) {
    throwError("use-dialog", "No outer <n-dialog-provider /> founded.");
  }
  return dialog;
}
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "TitleBar",
  setup(__props) {
    const dialog = useDialog();
    const minimize = () => {
      if (!isElectron) {
        return;
      }
      window.api.minimize();
    };
    const close = () => {
      if (!isElectron) {
        return;
      }
      dialog.warning({
        title: "提示",
        content: "确定要退出吗？",
        positiveText: "最小化",
        negativeText: "关闭",
        onPositiveClick: () => {
          window.api.minimize();
        },
        onNegativeClick: () => {
          window.api.close();
        }
      });
    };
    const drag = (event) => {
      if (!isElectron) {
        return;
      }
      window.api.dragStart(event);
    };
    return (_ctx, _cache) => {
      return openBlock(), createElementBlock("div", {
        id: "title-bar",
        onMousedown: drag
      }, [
        _cache[2] || (_cache[2] = createBaseVNode("div", { id: "title" }, "Alger Music", -1)),
        createBaseVNode("div", { id: "buttons" }, [
          createBaseVNode("button", { onClick: minimize }, _cache[0] || (_cache[0] = [
            createBaseVNode("i", { class: "iconfont icon-minisize" }, null, -1)
          ])),
          createBaseVNode("button", { onClick: close }, _cache[1] || (_cache[1] = [
            createBaseVNode("i", { class: "iconfont icon-close" }, null, -1)
          ]))
        ])
      ], 32);
    };
  }
});
const TitleBar = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-6ad4ce60"]]);
export {
  TitleBar as default
};
