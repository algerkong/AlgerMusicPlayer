<template>
  <div
    class="nav-card group relative overflow-hidden rounded-xl md:rounded-2xl cursor-pointer transition-all duration-300"
    :class="[
      aspectClass,
      colorClasses.bg,
      active ? colorClasses.activeBg : '',
      'hover:shadow-lg hover:-translate-y-0.5'
    ]"
    @click="$emit('click')"
  >
    <!-- Background Pattern -->
    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
      <div
        class="absolute inset-0"
        :class="colorClasses.pattern"
        style="
          background-image: radial-gradient(circle at 20% 50%, currentColor 1px, transparent 1px);
          background-size: 20px 20px;
          opacity: 0.05;
        "
      />
    </div>

    <!-- Glow Effect on Hover -->
    <div
      class="absolute -inset-[1px] rounded-xl md:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
      :class="colorClasses.glow"
    />

    <!-- Content Container -->
    <div class="relative h-full flex flex-col justify-between p-4 md:p-5">
      <!-- Header with Icon and Badge -->
      <div class="flex items-start justify-between">
        <!-- Icon -->
        <div
          class="icon-wrapper flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-xl md:rounded-2xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
          :class="[colorClasses.iconBg, active ? colorClasses.activeIconBg : '']"
        >
          <i
            :class="[
              icon,
              colorClasses.iconColor,
              'text-lg md:text-xl transition-all duration-300'
            ]"
          ></i>
        </div>

        <!-- Badge (optional) -->
        <div
          v-if="badge"
          class="badge px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold animate-pulse"
          :class="colorClasses.badgeBg"
        >
          {{ badge }}
        </div>
      </div>

      <!-- Text Content -->
      <div class="space-y-0.5 md:space-y-1">
        <h3
          class="text-sm md:text-base font-bold tracking-tight line-clamp-1"
          :class="colorClasses.title"
        >
          {{ title }}
        </h3>
        <p class="text-xs md:text-sm line-clamp-1" :class="colorClasses.subtitle">
          {{ subtitle }}
        </p>
      </div>

      <!-- Arrow Indicator -->
      <div
        class="absolute bottom-3 right-3 md:bottom-4 md:right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1"
        :class="colorClasses.arrow"
      >
        <i class="ri-arrow-right-line text-sm md:text-base"></i>
      </div>
    </div>

    <!-- Active Indicator -->
    <div
      v-if="active"
      class="absolute top-3 left-3 h-2 w-2 rounded-full animate-pulse"
      :class="colorClasses.activeDot"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  color?: 'rose' | 'amber' | 'purple' | 'blue' | 'emerald' | 'cyan';
  active?: boolean;
  badge?: string | null;
  aspect?: 'square' | 'tall' | 'wide';
}

const props = withDefaults(defineProps<Props>(), {
  color: 'blue',
  active: false,
  badge: null,
  aspect: 'square'
});

defineEmits<{
  (e: 'click'): void;
}>();

const aspectClass = computed(() => {
  switch (props.aspect) {
    case 'tall':
      return 'aspect-[4/5]';
    case 'wide':
      return 'aspect-[16/9]';
    default:
      return 'aspect-square md:aspect-[4/3]';
  }
});

const colorClasses = computed(() => {
  const colors = {
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      activeBg: 'dark:bg-rose-950/50',
      iconBg: 'bg-rose-100 dark:bg-rose-900/40',
      activeIconBg: 'dark:bg-rose-900/60',
      iconColor: 'text-rose-600 dark:text-rose-400',
      title: 'text-rose-900 dark:text-rose-100',
      subtitle: 'text-rose-700 dark:text-rose-300',
      arrow: 'text-rose-600 dark:text-rose-400',
      pattern: 'text-rose-600',
      glow: 'bg-rose-500/20',
      badgeBg: 'bg-rose-500 text-white',
      activeDot: 'bg-rose-500'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      activeBg: 'dark:bg-amber-950/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      activeIconBg: 'dark:bg-amber-900/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-900 dark:text-amber-100',
      subtitle: 'text-amber-700 dark:text-amber-300',
      arrow: 'text-amber-600 dark:text-amber-400',
      pattern: 'text-amber-600',
      glow: 'bg-amber-500/20',
      badgeBg: 'bg-amber-500 text-white',
      activeDot: 'bg-amber-500'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      activeBg: 'dark:bg-purple-950/50',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      activeIconBg: 'dark:bg-purple-900/60',
      iconColor: 'text-purple-600 dark:text-purple-400',
      title: 'text-purple-900 dark:text-purple-100',
      subtitle: 'text-purple-700 dark:text-purple-300',
      arrow: 'text-purple-600 dark:text-purple-400',
      pattern: 'text-purple-600',
      glow: 'bg-purple-500/20',
      badgeBg: 'bg-purple-500 text-white',
      activeDot: 'bg-purple-500'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      activeBg: 'dark:bg-blue-950/50',
      iconBg: 'bg-blue-100 dark:bg-blue-900/40',
      activeIconBg: 'dark:bg-blue-900/60',
      iconColor: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-100',
      subtitle: 'text-blue-700 dark:text-blue-300',
      arrow: 'text-blue-600 dark:text-blue-400',
      pattern: 'text-blue-600',
      glow: 'bg-blue-500/20',
      badgeBg: 'bg-blue-500 text-white',
      activeDot: 'bg-blue-500'
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      activeBg: 'dark:bg-emerald-950/50',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      activeIconBg: 'dark:bg-emerald-900/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'text-emerald-900 dark:text-emerald-100',
      subtitle: 'text-emerald-700 dark:text-emerald-300',
      arrow: 'text-emerald-600 dark:text-emerald-400',
      pattern: 'text-emerald-600',
      glow: 'bg-emerald-500/20',
      badgeBg: 'bg-emerald-500 text-white',
      activeDot: 'bg-emerald-500'
    },
    cyan: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      activeBg: 'dark:bg-cyan-950/50',
      iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
      activeIconBg: 'dark:bg-cyan-900/60',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      title: 'text-cyan-900 dark:text-cyan-100',
      subtitle: 'text-cyan-700 dark:text-cyan-300',
      arrow: 'text-cyan-600 dark:text-cyan-400',
      pattern: 'text-cyan-600',
      glow: 'bg-cyan-500/20',
      badgeBg: 'bg-cyan-500 text-white',
      activeDot: 'bg-cyan-500'
    }
  };

  return colors[props.color];
});
</script>

<style scoped>
.nav-card {
  position: relative;
  will-change: transform;
}

.nav-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.nav-card:hover::before {
  opacity: 1;
}

.icon-wrapper {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.badge {
  animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
