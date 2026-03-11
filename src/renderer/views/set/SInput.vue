<template>
  <div class="inline-flex items-center gap-1" :class="widthClass">
    <button
      v-if="type === 'number' && showButtons"
      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
      :disabled="disabled || atMin"
      @click="decrement"
    >
      <i class="ri-subtract-line text-sm" />
    </button>

    <div class="relative flex-1 min-w-0">
      <input
        ref="inputRef"
        :type="type === 'number' ? 'text' : type"
        :value="displayValue"
        :placeholder="placeholder"
        :disabled="disabled"
        inputmode="decimal"
        class="w-full rounded-[10px] border border-neutral-200 bg-neutral-50 py-1.5 pl-3 text-sm text-neutral-900 transition-all duration-200 outline-none placeholder:text-neutral-400 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:bg-neutral-900"
        :class="[type === 'number' && !suffix ? 'text-center pr-3' : '', suffix ? 'pr-10' : 'pr-3']"
        @input="handleInput"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      <span
        v-if="suffix"
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400"
      >
        {{ suffix }}
      </span>
    </div>

    <button
      v-if="type === 'number' && showButtons"
      class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
      :disabled="disabled || atMax"
      @click="increment"
    >
      <i class="ri-add-line text-sm" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

defineOptions({ name: 'SInput' });

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    type?: 'text' | 'number';
    placeholder?: string;
    disabled?: boolean;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    showButtons?: boolean;
    width?: string;
  }>(),
  {
    modelValue: '',
    type: 'text',
    placeholder: '',
    disabled: false,
    min: -Infinity,
    max: Infinity,
    step: 1,
    suffix: '',
    showButtons: true,
    width: ''
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string | number];
  blur: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

const numericValue = computed(() => {
  const n = Number(props.modelValue);
  return Number.isFinite(n) ? n : 0;
});

const displayValue = computed(() => {
  if (props.type === 'number') {
    return String(props.modelValue ?? '');
  }
  return String(props.modelValue ?? '');
});

const atMin = computed(() => numericValue.value <= props.min);
const atMax = computed(() => numericValue.value >= props.max);

const widthClass = computed(() => props.width);

const clamp = (n: number) => Math.min(props.max, Math.max(props.min, n));

const handleInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value;
  if (props.type === 'text') {
    emit('update:modelValue', val);
    return;
  }
  if (val === '' || val === '-') {
    emit('update:modelValue', val as unknown as number);
    return;
  }
  const n = Number(val);
  if (!Number.isNaN(n)) {
    emit('update:modelValue', n);
  }
};

const handleBlur = () => {
  if (props.type === 'number') {
    const clamped = clamp(numericValue.value);
    emit('update:modelValue', clamped);
  }
  emit('blur');
};

const increment = () => {
  emit('update:modelValue', clamp(numericValue.value + props.step));
};

const decrement = () => {
  emit('update:modelValue', clamp(numericValue.value - props.step));
};

const handleKeydown = (e: KeyboardEvent) => {
  if (props.type !== 'number') return;
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    increment();
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    decrement();
  }
};
</script>
