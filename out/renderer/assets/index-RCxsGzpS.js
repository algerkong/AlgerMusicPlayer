import { d as defineComponent, l as h, m as c, p as cB, q as useTheme, x as useConfig, y as inputNumberLight, z as useFormItem, r as ref, A as toRef, C as useMergedState, D as useMemo, E as watch, F as useRtl, G as computed, H as rgba, I as resolveWrappedSlot, J as on, K as resolveSlot, N as NBaseIcon, X as XButton, L as call, M as nextTick, o as onMounted, O as createBlock, f as withCtx, P as checkUpdate, S as Scrollbar, g as useStore, Q as config, j as openBlock, b as createBaseVNode, e as createVNode, u as unref, R as isElectron, c as createElementBlock, T as createCommentVNode, t as toDisplayString, k as createTextVNode, U as PlayBottom, B as Button, _ as _export_sfc } from "./index-DKaFsuse.js";
import { _ as __unplugin_components_1$1, a as __unplugin_components_3 } from "./Switch-D3Z_Vg3u.js";
import { u as useLocale } from "./use-locale-DLWAOXez.js";
import { _ as __unplugin_components_4 } from "./Tag-C0oC92WF.js";
import { _ as __unplugin_components_0 } from "./Slider-BA6NituQ.js";
const AddIcon = defineComponent({
  name: "Add",
  render() {
    return h("svg", {
      width: "512",
      height: "512",
      viewBox: "0 0 512 512",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg"
    }, h("path", {
      d: "M256 112V400M400 256H112",
      stroke: "currentColor",
      "stroke-width": "32",
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }));
  }
});
const RemoveIcon = defineComponent({
  name: "Remove",
  render() {
    return h("svg", {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 512 512"
    }, h("line", {
      x1: "400",
      y1: "256",
      x2: "112",
      y2: "256",
      style: "\n        fill: none;\n        stroke: currentColor;\n        stroke-linecap: round;\n        stroke-linejoin: round;\n        stroke-width: 32px;\n      "
    }));
  }
});
const style = c([cB("input-number-suffix", `
 display: inline-block;
 margin-right: 10px;
 `), cB("input-number-prefix", `
 display: inline-block;
 margin-left: 10px;
 `)]);
function parse(value) {
  if (value === void 0 || value === null || typeof value === "string" && value.trim() === "") {
    return null;
  }
  return Number(value);
}
function isWipValue(value) {
  return value.includes(".") && (/^(-)?\d+.*(\.|0)$/.test(value) || /^-?\d*$/.test(value)) || value === "-" || value === "-0";
}
function validator(value) {
  if (value === void 0 || value === null) return true;
  if (Number.isNaN(value)) return false;
  return true;
}
function format(value, precision) {
  if (typeof value !== "number") return "";
  return precision === void 0 ? String(value) : value.toFixed(precision);
}
function parseNumber(number) {
  if (number === null) return null;
  if (typeof number === "number") {
    return number;
  } else {
    const parsedNumber = Number(number);
    if (Number.isNaN(parsedNumber)) {
      return null;
    } else {
      return parsedNumber;
    }
  }
}
const HOLDING_CHANGE_THRESHOLD = 800;
const HOLDING_CHANGE_INTERVAL = 100;
const inputNumberProps = Object.assign(Object.assign({}, useTheme.props), {
  autofocus: Boolean,
  loading: {
    type: Boolean,
    default: void 0
  },
  placeholder: String,
  defaultValue: {
    type: Number,
    default: null
  },
  value: Number,
  step: {
    type: [Number, String],
    default: 1
  },
  min: [Number, String],
  max: [Number, String],
  size: String,
  disabled: {
    type: Boolean,
    default: void 0
  },
  validator: Function,
  bordered: {
    type: Boolean,
    default: void 0
  },
  showButton: {
    type: Boolean,
    default: true
  },
  buttonPlacement: {
    type: String,
    default: "right"
  },
  inputProps: Object,
  readonly: Boolean,
  clearable: Boolean,
  keyboard: {
    type: Object,
    default: {}
  },
  updateValueOnInput: {
    type: Boolean,
    default: true
  },
  round: {
    type: Boolean,
    default: void 0
  },
  parse: Function,
  format: Function,
  precision: Number,
  status: String,
  "onUpdate:value": [Function, Array],
  onUpdateValue: [Function, Array],
  onFocus: [Function, Array],
  onBlur: [Function, Array],
  onClear: [Function, Array],
  // deprecated
  onChange: [Function, Array]
});
const __unplugin_components_1 = defineComponent({
  name: "InputNumber",
  props: inputNumberProps,
  setup(props) {
    const {
      mergedBorderedRef,
      mergedClsPrefixRef,
      mergedRtlRef
    } = useConfig(props);
    const themeRef = useTheme("InputNumber", "-input-number", style, inputNumberLight, props, mergedClsPrefixRef);
    const {
      localeRef
    } = useLocale("InputNumber");
    const formItem = useFormItem(props);
    const {
      mergedSizeRef,
      mergedDisabledRef,
      mergedStatusRef
    } = formItem;
    const inputInstRef = ref(null);
    const minusButtonInstRef = ref(null);
    const addButtonInstRef = ref(null);
    const uncontrolledValueRef = ref(props.defaultValue);
    const controlledValueRef = toRef(props, "value");
    const mergedValueRef = useMergedState(controlledValueRef, uncontrolledValueRef);
    const displayedValueRef = ref("");
    const getPrecision = (value) => {
      const fraction = String(value).split(".")[1];
      return fraction ? fraction.length : 0;
    };
    const getMaxPrecision = (currentValue) => {
      const precisions = [props.min, props.max, props.step, currentValue].map((value) => {
        if (value === void 0) return 0;
        return getPrecision(value);
      });
      return Math.max(...precisions);
    };
    const mergedPlaceholderRef = useMemo(() => {
      const {
        placeholder
      } = props;
      if (placeholder !== void 0) return placeholder;
      return localeRef.value.placeholder;
    });
    const mergedStepRef = useMemo(() => {
      const parsedNumber = parseNumber(props.step);
      if (parsedNumber !== null) {
        return parsedNumber === 0 ? 1 : Math.abs(parsedNumber);
      }
      return 1;
    });
    const mergedMinRef = useMemo(() => {
      const parsedNumber = parseNumber(props.min);
      if (parsedNumber !== null) return parsedNumber;
      else return null;
    });
    const mergedMaxRef = useMemo(() => {
      const parsedNumber = parseNumber(props.max);
      if (parsedNumber !== null) return parsedNumber;
      else return null;
    });
    const deriveDisplayedValueFromValue = () => {
      const {
        value: mergedValue
      } = mergedValueRef;
      if (validator(mergedValue)) {
        const {
          format: formatProp,
          precision
        } = props;
        if (formatProp) {
          displayedValueRef.value = formatProp(mergedValue);
        } else {
          if (mergedValue === null || precision === void 0 || getPrecision(mergedValue) > precision) {
            displayedValueRef.value = format(mergedValue, void 0);
          } else {
            displayedValueRef.value = format(mergedValue, precision);
          }
        }
      } else {
        displayedValueRef.value = String(mergedValue);
      }
    };
    deriveDisplayedValueFromValue();
    const doUpdateValue = (value) => {
      const {
        value: mergedValue
      } = mergedValueRef;
      if (value === mergedValue) {
        deriveDisplayedValueFromValue();
        return;
      }
      const {
        "onUpdate:value": _onUpdateValue,
        onUpdateValue,
        onChange
      } = props;
      const {
        nTriggerFormInput,
        nTriggerFormChange
      } = formItem;
      if (onChange) call(onChange, value);
      if (onUpdateValue) call(onUpdateValue, value);
      if (_onUpdateValue) call(_onUpdateValue, value);
      uncontrolledValueRef.value = value;
      nTriggerFormInput();
      nTriggerFormChange();
    };
    const deriveValueFromDisplayedValue = ({
      offset,
      doUpdateIfValid,
      fixPrecision,
      isInputing
    }) => {
      const {
        value: displayedValue
      } = displayedValueRef;
      if (isInputing && isWipValue(displayedValue)) {
        return false;
      }
      const parsedValue = (props.parse || parse)(displayedValue);
      if (parsedValue === null) {
        if (doUpdateIfValid) doUpdateValue(null);
        return null;
      }
      if (validator(parsedValue)) {
        const currentPrecision = getPrecision(parsedValue);
        const {
          precision
        } = props;
        if (precision !== void 0 && precision < currentPrecision && !fixPrecision) {
          return false;
        }
        let nextValue = Number.parseFloat((parsedValue + offset).toFixed(precision !== null && precision !== void 0 ? precision : getMaxPrecision(parsedValue)));
        if (validator(nextValue)) {
          const {
            value: mergedMax
          } = mergedMaxRef;
          const {
            value: mergedMin
          } = mergedMinRef;
          if (mergedMax !== null && nextValue > mergedMax) {
            if (!doUpdateIfValid || isInputing) return false;
            nextValue = mergedMax;
          }
          if (mergedMin !== null && nextValue < mergedMin) {
            if (!doUpdateIfValid || isInputing) return false;
            nextValue = mergedMin;
          }
          if (props.validator && !props.validator(nextValue)) return false;
          if (doUpdateIfValid) doUpdateValue(nextValue);
          return nextValue;
        }
      }
      return false;
    };
    const displayedValueInvalidRef = useMemo(() => {
      const derivedValue = deriveValueFromDisplayedValue({
        offset: 0,
        doUpdateIfValid: false,
        isInputing: false,
        fixPrecision: false
      });
      return derivedValue === false;
    });
    const minusableRef = useMemo(() => {
      const {
        value: mergedValue
      } = mergedValueRef;
      if (props.validator && mergedValue === null) {
        return false;
      }
      const {
        value: mergedStep
      } = mergedStepRef;
      const derivedNextValue = deriveValueFromDisplayedValue({
        offset: -mergedStep,
        doUpdateIfValid: false,
        isInputing: false,
        fixPrecision: false
      });
      return derivedNextValue !== false;
    });
    const addableRef = useMemo(() => {
      const {
        value: mergedValue
      } = mergedValueRef;
      if (props.validator && mergedValue === null) {
        return false;
      }
      const {
        value: mergedStep
      } = mergedStepRef;
      const derivedNextValue = deriveValueFromDisplayedValue({
        offset: +mergedStep,
        doUpdateIfValid: false,
        isInputing: false,
        fixPrecision: false
      });
      return derivedNextValue !== false;
    });
    function doFocus(e) {
      const {
        onFocus
      } = props;
      const {
        nTriggerFormFocus
      } = formItem;
      if (onFocus) call(onFocus, e);
      nTriggerFormFocus();
    }
    function doBlur(e) {
      var _a, _b;
      if (e.target === ((_a = inputInstRef.value) === null || _a === void 0 ? void 0 : _a.wrapperElRef)) {
        return;
      }
      const value = deriveValueFromDisplayedValue({
        offset: 0,
        doUpdateIfValid: true,
        isInputing: false,
        fixPrecision: true
      });
      if (value !== false) {
        const inputElRef = (_b = inputInstRef.value) === null || _b === void 0 ? void 0 : _b.inputElRef;
        if (inputElRef) {
          inputElRef.value = String(value || "");
        }
        if (mergedValueRef.value === value) {
          deriveDisplayedValueFromValue();
        }
      } else {
        deriveDisplayedValueFromValue();
      }
      const {
        onBlur
      } = props;
      const {
        nTriggerFormBlur
      } = formItem;
      if (onBlur) call(onBlur, e);
      nTriggerFormBlur();
      void nextTick(() => {
        deriveDisplayedValueFromValue();
      });
    }
    function doClear(e) {
      const {
        onClear
      } = props;
      if (onClear) call(onClear, e);
    }
    function doAdd() {
      const {
        value: addable
      } = addableRef;
      if (!addable) {
        clearAddHoldTimeout();
        return;
      }
      const {
        value: mergedValue
      } = mergedValueRef;
      if (mergedValue === null) {
        if (!props.validator) {
          doUpdateValue(createValidValue());
        }
      } else {
        const {
          value: mergedStep
        } = mergedStepRef;
        deriveValueFromDisplayedValue({
          offset: mergedStep,
          doUpdateIfValid: true,
          isInputing: false,
          fixPrecision: true
        });
      }
    }
    function doMinus() {
      const {
        value: minusable
      } = minusableRef;
      if (!minusable) {
        clearMinusHoldTimeout();
        return;
      }
      const {
        value: mergedValue
      } = mergedValueRef;
      if (mergedValue === null) {
        if (!props.validator) {
          doUpdateValue(createValidValue());
        }
      } else {
        const {
          value: mergedStep
        } = mergedStepRef;
        deriveValueFromDisplayedValue({
          offset: -mergedStep,
          doUpdateIfValid: true,
          isInputing: false,
          fixPrecision: true
        });
      }
    }
    const handleFocus = doFocus;
    const handleBlur = doBlur;
    function createValidValue() {
      if (props.validator) return null;
      const {
        value: mergedMin
      } = mergedMinRef;
      const {
        value: mergedMax
      } = mergedMaxRef;
      if (mergedMin !== null) {
        return Math.max(0, mergedMin);
      } else if (mergedMax !== null) {
        return Math.min(0, mergedMax);
      } else {
        return 0;
      }
    }
    function handleClear(e) {
      doClear(e);
      doUpdateValue(null);
    }
    function handleMouseDown(e) {
      var _a, _b, _c;
      if ((_a = addButtonInstRef.value) === null || _a === void 0 ? void 0 : _a.$el.contains(e.target)) {
        e.preventDefault();
      }
      if ((_b = minusButtonInstRef.value) === null || _b === void 0 ? void 0 : _b.$el.contains(e.target)) {
        e.preventDefault();
      }
      (_c = inputInstRef.value) === null || _c === void 0 ? void 0 : _c.activate();
    }
    let minusHoldStateIntervalId = null;
    let addHoldStateIntervalId = null;
    let firstMinusMousedownId = null;
    function clearMinusHoldTimeout() {
      if (firstMinusMousedownId) {
        window.clearTimeout(firstMinusMousedownId);
        firstMinusMousedownId = null;
      }
      if (minusHoldStateIntervalId) {
        window.clearInterval(minusHoldStateIntervalId);
        minusHoldStateIntervalId = null;
      }
    }
    let firstAddMousedownId = null;
    function clearAddHoldTimeout() {
      if (firstAddMousedownId) {
        window.clearTimeout(firstAddMousedownId);
        firstAddMousedownId = null;
      }
      if (addHoldStateIntervalId) {
        window.clearInterval(addHoldStateIntervalId);
        addHoldStateIntervalId = null;
      }
    }
    function handleMinusMousedown() {
      clearMinusHoldTimeout();
      firstMinusMousedownId = window.setTimeout(() => {
        minusHoldStateIntervalId = window.setInterval(() => {
          doMinus();
        }, HOLDING_CHANGE_INTERVAL);
      }, HOLDING_CHANGE_THRESHOLD);
      on("mouseup", document, clearMinusHoldTimeout, {
        once: true
      });
    }
    function handleAddMousedown() {
      clearAddHoldTimeout();
      firstAddMousedownId = window.setTimeout(() => {
        addHoldStateIntervalId = window.setInterval(() => {
          doAdd();
        }, HOLDING_CHANGE_INTERVAL);
      }, HOLDING_CHANGE_THRESHOLD);
      on("mouseup", document, clearAddHoldTimeout, {
        once: true
      });
    }
    const handleAddClick = () => {
      if (addHoldStateIntervalId) return;
      doAdd();
    };
    const handleMinusClick = () => {
      if (minusHoldStateIntervalId) return;
      doMinus();
    };
    function handleKeyDown(e) {
      var _a, _b;
      if (e.key === "Enter") {
        if (e.target === ((_a = inputInstRef.value) === null || _a === void 0 ? void 0 : _a.wrapperElRef)) {
          return;
        }
        const value = deriveValueFromDisplayedValue({
          offset: 0,
          doUpdateIfValid: true,
          isInputing: false,
          fixPrecision: true
        });
        if (value !== false) {
          (_b = inputInstRef.value) === null || _b === void 0 ? void 0 : _b.deactivate();
        }
      } else if (e.key === "ArrowUp") {
        if (!addableRef.value) return;
        if (props.keyboard.ArrowUp === false) return;
        e.preventDefault();
        const value = deriveValueFromDisplayedValue({
          offset: 0,
          doUpdateIfValid: true,
          isInputing: false,
          fixPrecision: true
        });
        if (value !== false) {
          doAdd();
        }
      } else if (e.key === "ArrowDown") {
        if (!minusableRef.value) return;
        if (props.keyboard.ArrowDown === false) return;
        e.preventDefault();
        const value = deriveValueFromDisplayedValue({
          offset: 0,
          doUpdateIfValid: true,
          isInputing: false,
          fixPrecision: true
        });
        if (value !== false) {
          doMinus();
        }
      }
    }
    function handleUpdateDisplayedValue(value) {
      displayedValueRef.value = value;
      if (props.updateValueOnInput && !props.format && !props.parse && props.precision === void 0) {
        deriveValueFromDisplayedValue({
          offset: 0,
          doUpdateIfValid: true,
          isInputing: true,
          fixPrecision: false
        });
      }
    }
    watch(mergedValueRef, () => {
      deriveDisplayedValueFromValue();
    });
    const exposedMethods = {
      focus: () => {
        var _a;
        return (_a = inputInstRef.value) === null || _a === void 0 ? void 0 : _a.focus();
      },
      blur: () => {
        var _a;
        return (_a = inputInstRef.value) === null || _a === void 0 ? void 0 : _a.blur();
      },
      select: () => {
        var _a;
        return (_a = inputInstRef.value) === null || _a === void 0 ? void 0 : _a.select();
      }
    };
    const rtlEnabledRef = useRtl("InputNumber", mergedRtlRef, mergedClsPrefixRef);
    return Object.assign(Object.assign({}, exposedMethods), {
      rtlEnabled: rtlEnabledRef,
      inputInstRef,
      minusButtonInstRef,
      addButtonInstRef,
      mergedClsPrefix: mergedClsPrefixRef,
      mergedBordered: mergedBorderedRef,
      uncontrolledValue: uncontrolledValueRef,
      mergedValue: mergedValueRef,
      mergedPlaceholder: mergedPlaceholderRef,
      displayedValueInvalid: displayedValueInvalidRef,
      mergedSize: mergedSizeRef,
      mergedDisabled: mergedDisabledRef,
      displayedValue: displayedValueRef,
      addable: addableRef,
      minusable: minusableRef,
      mergedStatus: mergedStatusRef,
      handleFocus,
      handleBlur,
      handleClear,
      handleMouseDown,
      handleAddClick,
      handleMinusClick,
      handleAddMousedown,
      handleMinusMousedown,
      handleKeyDown,
      handleUpdateDisplayedValue,
      // theme
      mergedTheme: themeRef,
      inputThemeOverrides: {
        paddingSmall: "0 8px 0 10px",
        paddingMedium: "0 8px 0 12px",
        paddingLarge: "0 8px 0 14px"
      },
      buttonThemeOverrides: computed(() => {
        const {
          self: {
            iconColorDisabled
          }
        } = themeRef.value;
        const [r, g, b, a] = rgba(iconColorDisabled);
        return {
          textColorTextDisabled: `rgb(${r}, ${g}, ${b})`,
          opacityDisabled: `${a}`
        };
      })
    });
  },
  render() {
    const {
      mergedClsPrefix,
      $slots
    } = this;
    const renderMinusButton = () => {
      return h(XButton, {
        text: true,
        disabled: !this.minusable || this.mergedDisabled || this.readonly,
        focusable: false,
        theme: this.mergedTheme.peers.Button,
        themeOverrides: this.mergedTheme.peerOverrides.Button,
        builtinThemeOverrides: this.buttonThemeOverrides,
        onClick: this.handleMinusClick,
        onMousedown: this.handleMinusMousedown,
        ref: "minusButtonInstRef"
      }, {
        icon: () => resolveSlot($slots["minus-icon"], () => [h(NBaseIcon, {
          clsPrefix: mergedClsPrefix
        }, {
          default: () => h(RemoveIcon, null)
        })])
      });
    };
    const renderAddButton = () => {
      return h(XButton, {
        text: true,
        disabled: !this.addable || this.mergedDisabled || this.readonly,
        focusable: false,
        theme: this.mergedTheme.peers.Button,
        themeOverrides: this.mergedTheme.peerOverrides.Button,
        builtinThemeOverrides: this.buttonThemeOverrides,
        onClick: this.handleAddClick,
        onMousedown: this.handleAddMousedown,
        ref: "addButtonInstRef"
      }, {
        icon: () => resolveSlot($slots["add-icon"], () => [h(NBaseIcon, {
          clsPrefix: mergedClsPrefix
        }, {
          default: () => h(AddIcon, null)
        })])
      });
    };
    return h("div", {
      class: [`${mergedClsPrefix}-input-number`, this.rtlEnabled && `${mergedClsPrefix}-input-number--rtl`]
    }, h(__unplugin_components_1$1, {
      ref: "inputInstRef",
      autofocus: this.autofocus,
      status: this.mergedStatus,
      bordered: this.mergedBordered,
      loading: this.loading,
      value: this.displayedValue,
      onUpdateValue: this.handleUpdateDisplayedValue,
      theme: this.mergedTheme.peers.Input,
      themeOverrides: this.mergedTheme.peerOverrides.Input,
      builtinThemeOverrides: this.inputThemeOverrides,
      size: this.mergedSize,
      placeholder: this.mergedPlaceholder,
      disabled: this.mergedDisabled,
      readonly: this.readonly,
      round: this.round,
      textDecoration: this.displayedValueInvalid ? "line-through" : void 0,
      onFocus: this.handleFocus,
      onBlur: this.handleBlur,
      onKeydown: this.handleKeyDown,
      onMousedown: this.handleMouseDown,
      onClear: this.handleClear,
      clearable: this.clearable,
      inputProps: this.inputProps,
      internalLoadingBeforeSuffix: true
    }, {
      prefix: () => {
        var _a;
        return this.showButton && this.buttonPlacement === "both" ? [renderMinusButton(), resolveWrappedSlot($slots.prefix, (children) => {
          if (children) {
            return h("span", {
              class: `${mergedClsPrefix}-input-number-prefix`
            }, children);
          }
          return null;
        })] : (_a = $slots.prefix) === null || _a === void 0 ? void 0 : _a.call($slots);
      },
      suffix: () => {
        var _a;
        return this.showButton ? [resolveWrappedSlot($slots.suffix, (children) => {
          if (children) {
            return h("span", {
              class: `${mergedClsPrefix}-input-number-suffix`
            }, children);
          }
          return null;
        }), this.buttonPlacement === "right" ? renderMinusButton() : null, renderAddButton()] : (_a = $slots.suffix) === null || _a === void 0 ? void 0 : _a.call($slots);
      }
    }));
  }
});
const _hoisted_1 = { class: "set-page" };
const _hoisted_2 = { class: "set-item" };
const _hoisted_3 = {
  key: 0,
  class: "set-item"
};
const _hoisted_4 = { class: "set-item" };
const _hoisted_5 = { class: "flex items-center gap-2" };
const _hoisted_6 = { class: "text-sm text-gray-400" };
const _hoisted_7 = { class: "w-40" };
const _hoisted_8 = { class: "set-item" };
const _hoisted_9 = { class: "set-item-content" };
const _hoisted_10 = { class: "flex items-center gap-2" };
const _hoisted_11 = { class: "set-item" };
const _sfc_main = /* @__PURE__ */ defineComponent({
  __name: "index",
  setup(__props) {
    const store = useStore();
    const checking = ref(false);
    const updateInfo = ref({
      hasUpdate: false,
      latestVersion: "",
      currentVersion: config.version,
      releaseInfo: null
    });
    const setData = computed(() => store.state.setData);
    watch(() => setData.value, (newVal) => {
      store.commit("setSetData", newVal);
    }, { deep: true });
    const isDarkTheme = computed({
      get: () => store.state.theme === "dark",
      set: () => store.commit("toggleTheme")
    });
    const openAuthor = () => {
      window.open(setData.value.authorUrl);
    };
    const restartApp = () => {
      window.electron.ipcRenderer.send("restart");
    };
    const checkForUpdates = async () => {
      checking.value = true;
      try {
        const result = await checkUpdate();
        updateInfo.value = result;
      } finally {
        checking.value = false;
      }
    };
    const openReleasePage = () => {
      window.open("https://github.com/algerkong/AlgerMusicPlayer/releases/latest");
    };
    onMounted(() => {
      checkForUpdates();
    });
    return (_ctx, _cache) => {
      const _component_n_switch = __unplugin_components_3;
      const _component_n_input_number = __unplugin_components_1;
      const _component_n_slider = __unplugin_components_0;
      const _component_n_tag = __unplugin_components_4;
      const _component_n_button = Button;
      const _component_n_scrollbar = Scrollbar;
      return openBlock(), createBlock(_component_n_scrollbar, null, {
        default: withCtx(() => [
          createBaseVNode("div", _hoisted_1, [
            createBaseVNode("div", _hoisted_2, [
              _cache[5] || (_cache[5] = createBaseVNode("div", null, [
                createBaseVNode("div", { class: "set-item-title" }, "主题模式"),
                createBaseVNode("div", { class: "set-item-content" }, "切换日间/夜间主题")
              ], -1)),
              createVNode(_component_n_switch, {
                value: isDarkTheme.value,
                "onUpdate:value": _cache[0] || (_cache[0] = ($event) => isDarkTheme.value = $event)
              }, {
                checked: withCtx(() => _cache[3] || (_cache[3] = [
                  createBaseVNode("i", { class: "ri-moon-line" }, null, -1)
                ])),
                unchecked: withCtx(() => _cache[4] || (_cache[4] = [
                  createBaseVNode("i", { class: "ri-sun-line" }, null, -1)
                ])),
                _: 1
              }, 8, ["value"])
            ]),
            unref(isElectron) ? (openBlock(), createElementBlock("div", _hoisted_3, [
              _cache[6] || (_cache[6] = createBaseVNode("div", null, [
                createBaseVNode("div", { class: "set-item-title" }, "音乐API端口"),
                createBaseVNode("div", { class: "set-item-content" }, " 修改后需要重启应用 ")
              ], -1)),
              createVNode(_component_n_input_number, {
                value: setData.value.musicApiPort,
                "onUpdate:value": _cache[1] || (_cache[1] = ($event) => setData.value.musicApiPort = $event)
              }, null, 8, ["value"])
            ])) : createCommentVNode("", true),
            createBaseVNode("div", _hoisted_4, [
              _cache[7] || (_cache[7] = createBaseVNode("div", null, [
                createBaseVNode("div", { class: "set-item-title" }, "动画速度"),
                createBaseVNode("div", { class: "set-item-content" }, "调节动画播放速度")
              ], -1)),
              createBaseVNode("div", _hoisted_5, [
                createBaseVNode("span", _hoisted_6, toDisplayString(setData.value.animationSpeed) + "x", 1),
                createBaseVNode("div", _hoisted_7, [
                  createVNode(_component_n_slider, {
                    value: setData.value.animationSpeed,
                    "onUpdate:value": _cache[2] || (_cache[2] = ($event) => setData.value.animationSpeed = $event),
                    min: 0.1,
                    max: 3,
                    step: 0.1,
                    marks: {
                      0.1: "极慢",
                      1: "正常",
                      3: "极快"
                    },
                    disabled: setData.value.noAnimate,
                    class: "w-40"
                  }, null, 8, ["value", "disabled"])
                ])
              ])
            ]),
            createBaseVNode("div", _hoisted_8, [
              createBaseVNode("div", null, [
                _cache[8] || (_cache[8] = createBaseVNode("div", { class: "set-item-title" }, "版本", -1)),
                createBaseVNode("div", _hoisted_9, [
                  createTextVNode(toDisplayString(updateInfo.value.currentVersion) + " ", 1),
                  updateInfo.value.hasUpdate ? (openBlock(), createBlock(_component_n_tag, {
                    key: 0,
                    type: "success",
                    class: "ml-2"
                  }, {
                    default: withCtx(() => [
                      createTextVNode("发现新版本 " + toDisplayString(updateInfo.value.latestVersion), 1)
                    ]),
                    _: 1
                  })) : createCommentVNode("", true)
                ])
              ]),
              createBaseVNode("div", _hoisted_10, [
                createVNode(_component_n_button, {
                  type: updateInfo.value.hasUpdate ? "primary" : "default",
                  size: "small",
                  loading: checking.value,
                  onClick: checkForUpdates
                }, {
                  default: withCtx(() => [
                    createTextVNode(toDisplayString(checking.value ? "检查中..." : "检查更新"), 1)
                  ]),
                  _: 1
                }, 8, ["type", "loading"]),
                updateInfo.value.hasUpdate ? (openBlock(), createBlock(_component_n_button, {
                  key: 0,
                  type: "success",
                  size: "small",
                  onClick: openReleasePage
                }, {
                  default: withCtx(() => _cache[9] || (_cache[9] = [
                    createTextVNode(" 前往更新 ")
                  ])),
                  _: 1
                })) : createCommentVNode("", true)
              ])
            ]),
            createBaseVNode("div", {
              class: "set-item cursor-pointer hover:text-green-500 hover:bg-green-950 transition-all",
              onClick: openAuthor
            }, [
              _cache[10] || (_cache[10] = createBaseVNode("div", null, [
                createBaseVNode("div", { class: "set-item-title" }, "作者"),
                createBaseVNode("div", { class: "set-item-content" }, "algerkong github")
              ], -1)),
              createBaseVNode("div", null, toDisplayString(setData.value.author), 1)
            ]),
            createBaseVNode("div", _hoisted_11, [
              _cache[12] || (_cache[12] = createBaseVNode("div", null, [
                createBaseVNode("div", { class: "set-item-title" }, "重启"),
                createBaseVNode("div", { class: "set-item-content" }, "重启应用")
              ], -1)),
              createVNode(_component_n_button, {
                type: "primary",
                onClick: restartApp
              }, {
                default: withCtx(() => _cache[11] || (_cache[11] = [
                  createTextVNode("重启")
                ])),
                _: 1
              })
            ])
          ]),
          createVNode(PlayBottom)
        ]),
        _: 1
      });
    };
  }
});
const index = /* @__PURE__ */ _export_sfc(_sfc_main, [["__scopeId", "data-v-0331ad9e"]]);
export {
  index as default
};
