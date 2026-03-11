<template>
  <button
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-sm font-medium transition-all duration-200 select-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
    :class="variantClass"
    @click="$emit('click', $event)"
  >
    <i v-if="loading" class="ri-loader-4-line animate-spin text-sm" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'SBtn' });

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'danger' | 'ghost';
    disabled?: boolean;
    loading?: boolean;
  }>(),
  {
    variant: 'default',
    disabled: false,
    loading: false
  }
);

defineEmits<{ click: [event: MouseEvent] }>();

const variantClass = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-primary text-white hover:bg-primary/85 shadow-sm shadow-primary/20';
    case 'danger':
      return 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60';
    case 'ghost':
      return 'bg-transparent text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800';
    default:
      return 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700';
  }
});
</script>
