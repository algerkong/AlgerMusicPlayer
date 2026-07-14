<template>
  <span
    v-if="tier === 'vip' || tier === 'svip'"
    class="vip-badge"
    :class="[
      `vip-badge--${tier}`,
      compact ? 'vip-badge--compact' : '',
      corner ? 'vip-badge--corner' : ''
    ]"
    :title="label"
  >
    <!-- SVIP：一闪而过的光带 -->
    <span v-if="tier === 'svip'" class="vip-badge__flash" aria-hidden="true" />
    <span class="vip-badge__text">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: 'VipBadge' });

const props = withDefaults(
  defineProps<{
    level?: string;
    compact?: boolean;
    corner?: boolean;
  }>(),
  {
    level: 'none',
    compact: false,
    corner: false
  }
);

/** 归一成 vip | svip | none */
const tier = computed(() => {
  const l = String(props.level || '').toLowerCase();
  if (l.includes('svip') || l.includes('super')) return 'svip' as const;
  if (l.includes('vip')) return 'vip' as const;
  return 'none' as const;
});

const label = computed(() => (tier.value === 'svip' ? 'SVIP' : tier.value === 'vip' ? 'VIP' : ''));
</script>

<style scoped>
/*
 * 黑金实体标：不跟封面 accent。
 * VIP 沉稳、SVIP 更亮 + 一闪而过光带。
 */
.vip-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  padding: 3px 7px;
  border-radius: 4px;
  box-sizing: border-box;
  user-select: none;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #e8c547;
  background: #141210;
  border: 1px solid #a88420;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 230, 150, 0.12);
}

.vip-badge__text {
  position: relative;
  z-index: 1;
  font-size: 10px;
  line-height: 1;
  color: inherit;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55);
}

/* VIP：哑金 */
.vip-badge--vip {
  color: #d4b84a;
  border-color: #9a7a1e;
  background: linear-gradient(180deg, #1e1a14 0%, #100e0b 100%);
}

/* SVIP：亮金 + 外发光 */
.vip-badge--svip {
  color: #ffe28a;
  border-color: #e8c547;
  background: linear-gradient(180deg, #2a2210 0%, #0c0a06 100%);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.85),
    0 0 10px rgba(232, 197, 71, 0.35),
    0 1px 3px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 240, 180, 0.28);
}
.vip-badge--svip .vip-badge__text {
  letter-spacing: 0.1em;
}

/*
 * 一闪而过：细光带从左扫到右，停一阵再扫
 * 总周期 2.4s，真正亮的只有前 ~0.45s
 */
.vip-badge__flash {
  pointer-events: none;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 55%;
  z-index: 2;
  background: linear-gradient(
    100deg,
    transparent 0%,
    rgba(255, 255, 255, 0) 35%,
    rgba(255, 252, 230, 0.75) 50%,
    rgba(255, 255, 255, 0) 65%,
    transparent 100%
  );
  transform: translateX(-160%) skewX(-18deg);
  animation: vip-flash-pass 2.4s ease-in-out infinite;
}

@keyframes vip-flash-pass {
  0% {
    transform: translateX(-160%) skewX(-18deg);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  28% {
    transform: translateX(220%) skewX(-18deg);
    opacity: 1;
  }
  32%,
  100% {
    transform: translateX(220%) skewX(-18deg);
    opacity: 0;
  }
}

/* 窄条（头像角标 / 菜单行） */
.vip-badge--compact {
  padding: 2px 5px;
}
.vip-badge--compact .vip-badge__text {
  font-size: 9px;
  letter-spacing: 0.06em;
}

/* 头像角标 */
.vip-badge--corner {
  position: absolute;
  right: -4px;
  bottom: -4px;
  z-index: 3;
  padding: 1px 4px;
  border-radius: 3px;
  box-shadow:
    0 0 0 1.5px #0a0a0b,
    0 2px 5px rgba(0, 0, 0, 0.5);
}
.vip-badge--corner.vip-badge--svip {
  box-shadow:
    0 0 0 1.5px #050505,
    0 0 8px rgba(255, 214, 100, 0.45),
    0 2px 6px rgba(0, 0, 0, 0.55);
}
.vip-badge--corner .vip-badge__text {
  font-size: 8px;
  letter-spacing: 0.04em;
}
.vip-badge--corner .vip-badge__flash {
  width: 70%;
}
</style>
