<template>
  <div
    ref="coverContainer"
    class="cover-3d-container relative cursor-pointer"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @mouseenter="handleMouseEnter"
  >
    <div ref="coverImage" class="cover-wrapper" :style="coverTransformStyle">
      <n-image :src="src" class="cover-image" lazy preview-disabled :object-fit="objectFit" />
      <div class="cover-shine" :style="shineStyle"></div>
    </div>
    <div v-if="loading" class="loading-overlay">
      <i class="ri-loader-4-line loading-icon"></i>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';

interface Props {
  src: string;
  loading?: boolean;
  maxTilt?: number;
  scale?: number;
  shineIntensity?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  maxTilt: 12,
  scale: 1.03,
  shineIntensity: 0.25,
  objectFit: 'cover',
  disabled: false
});

// 3D视差效果相关
const coverContainer = ref<HTMLElement | null>(null);
const coverImage = ref<HTMLElement | null>(null);
const mouseX = ref(0.5);
const mouseY = ref(0.5);
const isHovering = ref(false);
const rafId = ref<number | null>(null);

// 3D视差效果计算
const coverTransformStyle = computed(() => {
  if (!isHovering.value || props.disabled) {
    return {
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)',
      transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
    };
  }

  const tiltX = Math.round((mouseY.value - 0.5) * props.maxTilt * 100) / 100;
  const tiltY = Math.round((mouseX.value - 0.5) * -props.maxTilt * 100) / 100;

  return {
    transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${props.scale})`,
    transition: 'none'
  };
});

// 光泽效果计算
const shineStyle = computed(() => {
  if (!isHovering.value || props.disabled) {
    return {
      opacity: 0,
      background: 'transparent',
      transition: 'opacity 0.3s ease-out'
    };
  }

  const shineX = Math.round(mouseX.value * 100);
  const shineY = Math.round(mouseY.value * 100);

  return {
    opacity: props.shineIntensity,
    background: `radial-gradient(200px circle at ${shineX}% ${shineY}%, rgba(255,255,255,0.3), transparent 50%)`,
    transition: 'none'
  };
});

// 使用 requestAnimationFrame 优化鼠标事件
const updateMousePosition = (x: number, y: number) => {
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
  }

  rafId.value = requestAnimationFrame(() => {
    // 只在位置有显著变化时更新，减少不必要的重绘
    const deltaX = Math.abs(mouseX.value - x);
    const deltaY = Math.abs(mouseY.value - y);

    if (deltaX > 0.01 || deltaY > 0.01) {
      mouseX.value = x;
      mouseY.value = y;
    }
  });
};

// 3D视差效果的鼠标事件处理
const handleMouseMove = (event: MouseEvent) => {
  if (!coverContainer.value || !isHovering.value || props.disabled) return;

  const rect = coverContainer.value.getBoundingClientRect();
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

  updateMousePosition(x, y);
};

const handleMouseEnter = () => {
  if (!props.disabled) {
    isHovering.value = true;
  }
};

const handleMouseLeave = () => {
  isHovering.value = false;
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
    rafId.value = null;
  }
  // 平滑回到中心位置
  updateMousePosition(0.5, 0.5);
};

// 清理资源
onBeforeUnmount(() => {
  if (rafId.value) {
    cancelAnimationFrame(rafId.value);
  }
});
</script>

<style scoped lang="scss">
.cover-3d-container {
  @apply w-full h-full;
}

/* 3D视差效果样式 */
.cover-wrapper {
  @apply relative w-full h-full rounded-xl overflow-hidden;
  transform-style: preserve-3d;
  will-change: transform;
  backface-visibility: hidden;
  transform: translateZ(0); /* 强制硬件加速 */
}

.cover-image {
  @apply w-full h-full;
  border-radius: inherit;
  transform: translateZ(0); /* 强制硬件加速 */
}

.cover-shine {
  @apply absolute inset-0 pointer-events-none rounded-xl;
  mix-blend-mode: overlay;
  z-index: 1;
  will-change: background, opacity;
  backface-visibility: hidden;
}

/* 为封面容器添加阴影效果 */
.cover-3d-container:hover .cover-wrapper {
  filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.25));
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-overlay {
  @apply absolute inset-0 flex items-center justify-center rounded-xl;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 2;
}

.loading-icon {
  font-size: 48px;
  color: white;
  animation: spin 1s linear infinite;
}

/* 移动端禁用3D效果 */
@media (max-width: 768px) {
  .cover-wrapper {
    transform: none !important;
  }

  .cover-shine {
    display: none;
  }
}
</style>
