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
    <!-- SVIP：一闪而过的高光 -->
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
 * 会员标：胶囊、细边、柔金，不跟封面 accent。
 * VIP 克制；SVIP 略亮 + 一闪而过高光。
 */
.vip-badge {
  --vip-pad-y: 3px;
  --vip-pad-x: 8px;
  --vip-fs: 10px;
  --vip-ls: 0.04em;
  --vip-fw: 600;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  box-sizing: border-box;
  user-select: none;
  line-height: 1;
  padding: var(--vip-pad-y) var(--vip-pad-x);
  border-radius: 999px;
  border: 0.5px solid rgba(255, 214, 140, 0.38);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif;
  font-size: var(--vip-fs);
  font-weight: var(--vip-fw);
  letter-spacing: var(--vip-ls);
  color: #f3e2b0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0) 42%),
    linear-gradient(165deg, #3a3228 0%, #1c1814 55%, #12100e 100%);
  box-shadow:
    0 0.5px 0 rgba(255, 255, 255, 0.12) inset,
    0 1px 2px rgba(0, 0, 0, 0.28);
  -webkit-font-smoothing: antialiased;
}

.vip-badge__text {
  position: relative;
  z-index: 1;
  font-size: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: 1;
  color: inherit;
}

/* VIP：哑光香槟金 */
.vip-badge--vip {
  color: #e8d5a3;
  border-color: rgba(212, 184, 120, 0.32);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 40%),
    linear-gradient(165deg, #2e2922 0%, #181512 100%);
  box-shadow:
    0 0.5px 0 rgba(255, 255, 255, 0.08) inset,
    0 1px 2px rgba(0, 0, 0, 0.22);
}

/* SVIP：亮金材质 + 轻外晕 */
.vip-badge--svip {
  color: #fff1c8;
  border-color: rgba(255, 220, 140, 0.55);
  background:
    linear-gradient(180deg, rgba(255, 248, 220, 0.22) 0%, rgba(255, 255, 255, 0) 45%),
    linear-gradient(145deg, #5a4520 0%, #2a1f10 48%, #141008 100%);
  box-shadow:
    0 0.5px 0 rgba(255, 244, 200, 0.35) inset,
    0 0 0 0.5px rgba(232, 197, 71, 0.2),
    0 1px 4px rgba(201, 162, 39, 0.28),
    0 1px 2px rgba(0, 0, 0, 0.3);
}
.vip-badge--svip .vip-badge__text {
  letter-spacing: 0.05em;
}

/*
 * 一闪而过：窄高光带扫过，停顿后再来
 * 周期 3.4s，扫过段约 0.7s，略慢一点
 */
.vip-badge__flash {
  pointer-events: none;
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 42%;
  z-index: 2;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0) 28%,
    rgba(255, 255, 255, 0.55) 50%,
    rgba(255, 255, 255, 0) 72%,
    transparent 100%
  );
  transform: translateX(-180%) skewX(-16deg);
  animation: vip-flash-pass 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

@keyframes vip-flash-pass {
  0% {
    transform: translateX(-180%) skewX(-16deg);
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  32% {
    transform: translateX(280%) skewX(-16deg);
    opacity: 0.85;
  }
  38%,
  100% {
    transform: translateX(280%) skewX(-16deg);
    opacity: 0;
  }
}

/* 窄条 */
.vip-badge--compact {
  --vip-pad-y: 2px;
  --vip-pad-x: 6px;
  --vip-fs: 9px;
  --vip-ls: 0.03em;
}

/* 头像角标：贴边小胶囊 */
.vip-badge--corner {
  --vip-pad-y: 1.5px;
  --vip-pad-x: 5px;
  --vip-fs: 8px;
  --vip-ls: 0.02em;
  --vip-fw: 600;

  position: absolute;
  right: -3px;
  bottom: -3px;
  z-index: 3;
  box-shadow:
    0 0 0 1.5px rgba(10, 10, 11, 0.92),
    0 0.5px 0 rgba(255, 255, 255, 0.1) inset,
    0 1px 3px rgba(0, 0, 0, 0.4);
}
.vip-badge--corner.vip-badge--svip {
  box-shadow:
    0 0 0 1.5px rgba(8, 8, 9, 0.95),
    0 0.5px 0 rgba(255, 244, 200, 0.3) inset,
    0 0 6px rgba(232, 197, 71, 0.32),
    0 1px 3px rgba(0, 0, 0, 0.42);
}
.vip-badge--corner .vip-badge__flash {
  width: 55%;
}
</style>
