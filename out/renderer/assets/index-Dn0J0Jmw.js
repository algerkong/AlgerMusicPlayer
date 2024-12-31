import { d as defineComponent, r as ref, o as onMounted, a as onBeforeUnmount, c as createElementBlock, b as createBaseVNode, u as unref, n as normalizeClass, w as withDirectives, v as vModelText, i as isRef, e as createVNode, f as withCtx, t as toDisplayString, g as useStore, h as useRouter, B as Button, j as openBlock, s as setAnimationClass, k as createTextVNode, _ as _export_sfc } from "./index-DKaFsuse.js";
import { u as useMessage, g as getQrKey, c as createQr, a as checkQr, b as getUserDetail, l as loginByCellphone } from "./login-BsPxQYi6.js";
const _hoisted_1 = { class: "login-page" };
const _hoisted_2 = { class: "phone-login" };
const _hoisted_3 = { class: "content" };
const _hoisted_4 = ["src"];
const _hoisted_5 = { class: "phone-page" };
const _hoisted_6 = { class: "bottom" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  ...{
    name: "Login"
  },
  __name: "index",
  setup(__props) {
    const message = useMessage();
    const store = useStore();
    const router = useRouter();
    const isQr = ref(false);
    const qrUrl = ref();
    onMounted(() => {
      loadLogin();
    });
    const timerRef = ref(null);
    const loadLogin = async () => {
      try {
        if (timerRef.value) {
          clearInterval(timerRef.value);
          timerRef.value = null;
        }
        if (!isQr.value) return;
        const qrKey = await getQrKey();
        const key = qrKey.data.data.unikey;
        const { data } = await createQr(key);
        qrUrl.value = data.data.qrimg;
        const timer = timerIsQr(key);
        timerRef.value = timer;
      } catch (error) {
        console.error("加载登录信息时出错:", error);
      }
    };
    const timerIsQr = (key) => {
      const timer = setInterval(async () => {
        try {
          const { data } = await checkQr(key);
          if (data.code === 800) {
            clearInterval(timer);
            timerRef.value = null;
          }
          if (data.code === 803) {
            localStorage.setItem("token", data.cookie);
            const user = await getUserDetail();
            store.state.user = user.data.profile;
            localStorage.setItem("user", JSON.stringify(store.state.user));
            message.success("登录成功");
            clearInterval(timer);
            timerRef.value = null;
            router.push("/user");
          }
        } catch (error) {
          console.error("检查二维码状态时出错:", error);
          clearInterval(timer);
          timerRef.value = null;
        }
      }, 3e3);
      return timer;
    };
    onBeforeUnmount(() => {
      if (timerRef.value) {
        clearInterval(timerRef.value);
        timerRef.value = null;
      }
    });
    const chooseQr = () => {
      isQr.value = !isQr.value;
      loadLogin();
    };
    const phone = ref("");
    const password = ref("");
    const loginPhone = async () => {
      const { data } = await loginByCellphone(phone.value, password.value);
      if (data.code === 200) {
        message.success("登录成功");
        store.state.user = data.profile;
        localStorage.setItem("token", data.cookie);
        setTimeout(() => {
          router.push("/user");
        }, 1e3);
      }
    };
    return (_ctx, _cache) => {
      const _component_n_button = Button;
      return openBlock(), createElementBlock("div", _hoisted_1, [
        createBaseVNode("div", _hoisted_2, [
          _cache[9] || (_cache[9] = createBaseVNode("div", { class: "bg" }, null, -1)),
          createBaseVNode("div", _hoisted_3, [
            unref(isQr) ? (openBlock(), createElementBlock("div", {
              key: 0,
              class: normalizeClass(["phone", unref(setAnimationClass)("animate__fadeInUp")])
            }, [
              _cache[4] || (_cache[4] = createBaseVNode("div", { class: "login-title" }, "扫码登陆", -1)),
              createBaseVNode("img", {
                class: "qr-img",
                src: unref(qrUrl)
              }, null, 8, _hoisted_4),
              _cache[5] || (_cache[5] = createBaseVNode("div", { class: "text" }, "使用网易云APP扫码登录", -1))
            ], 2)) : (openBlock(), createElementBlock("div", {
              key: 1,
              class: normalizeClass(["phone", unref(setAnimationClass)("animate__fadeInUp")])
            }, [
              _cache[7] || (_cache[7] = createBaseVNode("div", { class: "login-title" }, "手机号登录", -1)),
              createBaseVNode("div", _hoisted_5, [
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => isRef(phone) ? phone.value = $event : null),
                  class: "phone-input",
                  type: "text",
                  placeholder: "手机号"
                }, null, 512), [
                  [vModelText, unref(phone)]
                ]),
                withDirectives(createBaseVNode("input", {
                  "onUpdate:modelValue": _cache[1] || (_cache[1] = ($event) => isRef(password) ? password.value = $event : null),
                  class: "phone-input",
                  type: "password",
                  placeholder: "密码"
                }, null, 512), [
                  [vModelText, unref(password)]
                ])
              ]),
              _cache[8] || (_cache[8] = createBaseVNode("div", { class: "text" }, "使用网易云账号登录", -1)),
              createVNode(_component_n_button, {
                class: "btn-login",
                onClick: _cache[2] || (_cache[2] = ($event) => loginPhone())
              }, {
                default: withCtx(() => _cache[6] || (_cache[6] = [
                  createTextVNode("登录")
                ])),
                _: 1
              })
            ], 2))
          ]),
          createBaseVNode("div", _hoisted_6, [
            createBaseVNode("div", {
              class: "title",
              onClick: _cache[3] || (_cache[3] = ($event) => chooseQr())
            }, toDisplayString(unref(isQr) ? "手机号登录" : "扫码登录"), 1)
          ])
        ])
      ]);
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-baab8304"]]);
export {
  index as default
};
