<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[1000] flex items-center justify-center md:items-center items-end"
        @click="handleMaskClick"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"></div>

        <!-- Content -->
        <Transition :name="isMobile ? 'slide-up' : 'scale-fade'">
          <div
            v-if="show"
            class="relative z-10 w-full bg-white dark:bg-[#1c1c1e] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            :class="[isMobile ? 'rounded-t-[20px] pb-safe' : 'md:max-w-[720px] md:rounded-2xl']"
            @click.stop
          >
            <!-- Header -->
            <div
              class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5 shrink-0"
            >
              <h3 class="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                {{ title }}
              </h3>
              <button
                class="p-1 -mr-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                @click="close"
              >
                <i class="ri-close-line text-lg"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              <slot></slot>
            </div>

            <!-- Footer -->
            <div
              v-if="$slots.footer"
              class="px-4 py-3 border-t border-gray-100 dark:border-white/5 shrink-0 bg-gray-50/50 dark:bg-white/5 backdrop-blur-xl"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  title?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

const show = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const isMobile = ref(false);

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

const close = () => {
  show.value = false;
  emit('close');
};

const handleMaskClick = () => {
  close();
};

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});

// Prevent body scroll when modal is open
watch(show, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* PC Scale Fade Transition */
.scale-fade-enter-active,
.scale-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.scale-fade-enter-from,
.scale-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Mobile Slide Up Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.pb-safe {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
