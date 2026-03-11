<template>
  <div class="relative inline-block" :class="widthClass" ref="wrapperRef">
    <button
      :disabled="disabled"
      class="flex w-full items-center justify-between gap-2 rounded-[10px] border px-3 py-1.5 text-sm transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed"
      :class="
        isOpen
          ? 'border-primary bg-white dark:bg-neutral-900 ring-2 ring-primary/20'
          : 'border-neutral-200 bg-neutral-50 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600'
      "
      @click="toggle"
    >
      <span
        class="truncate"
        :class="selectedLabel ? 'text-neutral-900 dark:text-neutral-100' : 'text-neutral-400'"
      >
        {{ selectedLabel || placeholder }}
      </span>
      <i
        class="ri-arrow-down-s-line text-base text-neutral-400 transition-transform duration-200 flex-shrink-0"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-1 scale-[0.98]"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1.5 w-full min-w-[160px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        :class="dropdownPosition === 'top' ? 'bottom-full mb-1.5 mt-0' : ''"
      >
        <div class="max-h-[240px] overflow-y-auto py-1">
          <div
            v-for="opt in options"
            :key="String(opt.value)"
            class="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors"
            :class="
              opt.value === modelValue
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800'
            "
            @click="select(opt.value)"
          >
            <span class="truncate flex-1">{{ opt.label }}</span>
            <i
              v-if="opt.value === modelValue"
              class="ri-check-line text-primary text-base flex-shrink-0"
            />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

defineOptions({ name: 'SSelect' });

type OptionValue = string | number | boolean;

const props = withDefaults(
  defineProps<{
    modelValue?: OptionValue;
    options?: { label: string; value: OptionValue }[];
    placeholder?: string;
    disabled?: boolean;
    width?: string;
  }>(),
  {
    modelValue: undefined,
    options: () => [],
    placeholder: '',
    disabled: false,
    width: 'w-40'
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: OptionValue];
}>();

const isOpen = ref(false);
const wrapperRef = ref<HTMLElement | null>(null);
const dropdownPosition = ref<'bottom' | 'top'>('bottom');

const widthClass = computed(() => props.width);

const selectedLabel = computed(() => {
  const opt = props.options.find((o) => o.value === props.modelValue);
  return opt?.label ?? '';
});

const toggle = () => {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
  if (isOpen.value) {
    checkDropdownPosition();
  }
};

const select = (value: OptionValue) => {
  emit('update:modelValue', value);
  isOpen.value = false;
};

const checkDropdownPosition = () => {
  if (!wrapperRef.value) return;
  const rect = wrapperRef.value.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  dropdownPosition.value = spaceBelow < 260 ? 'top' : 'bottom';
};

const onClickOutside = (e: MouseEvent) => {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isOpen.value = false;
  }
};

onMounted(() => document.addEventListener('click', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside));
</script>
