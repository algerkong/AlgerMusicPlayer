<template>
  <div
    class="group relative overflow-hidden rounded-2xl bg-white/5 transition-all duration-300 hover:bg-white/10 hover:shadow-2xl hover:shadow-black/20 dark:bg-neutral-900/50"
    :class="[containerClass]"
    @click="$emit('click')"
  >
    <!-- 图片区域 -->
    <div class="relative aspect-square overflow-hidden mb-3">
      <img
        v-if="image"
        :src="image"
        class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div v-else class="h-full w-full skeleton-shimmer" />

      <!-- 播放按钮遮罩 (Apple Music 风格) -->
      <div
        class="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <div
          class="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform duration-300 hover:scale-110 active:scale-95"
        >
          <slot name="play-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              class="text-black ml-1"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </slot>
        </div>
      </div>

      <!-- 右上角额外信息 (例如播放量) -->
      <div
        v-if="$slots.extra"
        class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-md"
      >
        <slot name="extra" />
      </div>
    </div>

    <!-- 文字区域 -->
    <div class="px-3 pb-4">
      <h3
        v-if="title"
        class="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-50 mb-0.5"
      >
        {{ title }}
      </h3>
      <p v-if="subtitle" class="truncate text-xs text-neutral-500 dark:text-neutral-300">
        {{ subtitle }}
      </p>
    </div>

    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  image?: string;
  title?: string;
  subtitle?: string;
  containerClass?: string;
}>();

defineEmits<{
  (e: 'click'): void;
}>();
</script>
