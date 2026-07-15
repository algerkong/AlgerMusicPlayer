<template>
  <div class="app-menu-shell">
    <tooltip-provider :delay-duration="200">
      <div class="app-menu chrome-surface-strong">
        <!-- 返回 -->
        <Transition
          name="menu-back"
          @after-enter="bumpSlider"
          @after-leave="bumpSlider"
          @enter="onBackTransitionFrame"
          @leave="onBackTransitionFrame"
        >
          <div v-if="showBack" key="menu-back" class="menu-back-slot">
            <tooltip>
              <tooltip-trigger as-child>
                <button type="button" class="menu-back-btn" @click="goBack">
                  <i class="ri-arrow-left-line" />
                </button>
              </tooltip-trigger>
              <tooltip-content v-if="!isMobile" side="right" :side-offset="8">
                {{ t('common.back') }}
              </tooltip-content>
            </tooltip>
          </div>
        </Transition>

        <!-- 主导航（已去掉歌单入口） -->
        <scroll-area class="app-menu-list">
          <div class="menu-slider-bg" :style="sliderStyle" />
          <div
            v-for="(item, index) in menus"
            :key="item.path"
            :ref="(el) => setItemRef(el as HTMLElement | null, index)"
            class="app-menu-item"
          >
            <tooltip>
              <tooltip-trigger as-child>
                <router-link
                  class="app-menu-item-link"
                  :class="isMenuActive(item.path) ? 'is-on' : 'is-off'"
                  :to="item.path"
                  @click.stop
                >
                  <i
                    class="app-menu-item-icon"
                    :class="[
                      item.meta.icon,
                      String(item.meta.icon || '').startsWith('ri-') ? '' : 'iconfont'
                    ]"
                    :style="{ fontSize: size }"
                  />
                </router-link>
              </tooltip-trigger>
              <tooltip-content v-if="!isMobile" side="right" :side-offset="8">
                {{ t(item.meta.title) }}
              </tooltip-content>
            </tooltip>
          </div>
        </scroll-area>

        <!-- 我的歌单：窄轨封面 + shadcn tip / 右键 -->
        <div v-if="!isMobile && showPlaylistRail" class="playlist-rail">
          <separator class="playlist-rail-sep" />
          <tooltip>
            <tooltip-trigger as-child>
              <button type="button" class="playlist-add-btn" @click="openCreateDialog">
                <i class="ri-add-line" />
              </button>
            </tooltip-trigger>
            <tooltip-content side="right" :side-offset="8">新建歌单</tooltip-content>
          </tooltip>
          <scroll-area class="playlist-rail-scroll">
            <tooltip v-if="plStore.loading && !plStore.items.length">
              <tooltip-trigger as-child>
                <div class="playlist-rail-hint">…</div>
              </tooltip-trigger>
              <tooltip-content side="right" :side-offset="8">加载中</tooltip-content>
            </tooltip>
            <tooltip v-else-if="!plStore.authenticated">
              <tooltip-trigger as-child>
                <div class="playlist-rail-hint">
                  <i class="ri-login-box-line" />
                </div>
              </tooltip-trigger>
              <tooltip-content side="right" :side-offset="8">登录后同步歌单</tooltip-content>
            </tooltip>
            <tooltip v-else-if="!plStore.items.length">
              <tooltip-trigger as-child>
                <div class="playlist-rail-hint">
                  <i class="ri-play-list-add-line" />
                </div>
              </tooltip-trigger>
              <tooltip-content side="right" :side-offset="8">暂无歌单</tooltip-content>
            </tooltip>

            <!-- tip 与右键拆开：只 Tooltip 包 button，右键用定位菜单，避免嵌套把 tip 弄没 -->
            <tooltip v-for="pl in plStore.items" :key="pl.id">
              <tooltip-trigger as-child>
                <button
                  type="button"
                  class="playlist-rail-item"
                  :class="{ 'is-on': isPlaylistActive(pl.id) }"
                  @click="openPlaylist(pl)"
                  @contextmenu.prevent="openPlCtx($event, pl)"
                >
                  <div class="playlist-rail-cover">
                    <img v-if="pl.coverUrl" :src="pl.coverUrl" alt="" />
                    <i v-else class="ri-play-list-2-fill" />
                  </div>
                </button>
              </tooltip-trigger>
              <tooltip-content side="right" :side-offset="8">
                {{ playlistTitle(pl) }}
              </tooltip-content>
            </tooltip>
          </scroll-area>
        </div>

        <div v-if="!isMobile" class="menu-footer">
          <tooltip>
            <tooltip-trigger as-child>
              <router-link
                class="menu-footer-btn"
                :class="isSettingsActive ? 'is-on' : 'is-off'"
                to="/set"
                @click.stop
              >
                <i class="ri-settings-3-line" :style="{ fontSize: size }" />
              </router-link>
            </tooltip-trigger>
            <tooltip-content side="right" :side-offset="8">
              {{ t('comp.settings') }}
            </tooltip-content>
          </tooltip>
        </div>
      </div>
    </tooltip-provider>

    <!-- 新建 -->
    <ui-dialog :open="createOpen" @update:open="createOpen = $event">
      <dialog-content class="pl-dialog max-w-sm">
        <dialog-header>
          <dialog-title>新建歌单</dialog-title>
          <dialog-description>创建一个新的私人歌单</dialog-description>
        </dialog-header>
        <div class="field">
          <label class="field-label">名称</label>
          <input
            v-model="formName"
            class="field-input"
            type="text"
            maxlength="40"
            placeholder="歌单名称"
            @keydown.enter.prevent="submitCreate"
          />
        </div>
        <dialog-footer>
          <ui-button variant="outline" @click="createOpen = false">取消</ui-button>
          <ui-button :disabled="busy" @click="submitCreate">创建</ui-button>
        </dialog-footer>
      </dialog-content>
    </ui-dialog>

    <!-- 重命名 -->
    <ui-dialog :open="renameOpen" @update:open="renameOpen = $event">
      <dialog-content class="pl-dialog max-w-sm">
        <dialog-header>
          <dialog-title>重命名歌单</dialog-title>
          <dialog-description>修改「{{ formTarget?.name }}」的名称</dialog-description>
        </dialog-header>
        <div class="field">
          <label class="field-label">名称</label>
          <input
            v-model="formName"
            class="field-input"
            type="text"
            maxlength="40"
            placeholder="歌单名称"
            @keydown.enter.prevent="submitRename"
          />
        </div>
        <dialog-footer>
          <ui-button variant="outline" @click="renameOpen = false">取消</ui-button>
          <ui-button :disabled="busy" @click="submitRename">保存</ui-button>
        </dialog-footer>
      </dialog-content>
    </ui-dialog>

    <!-- 删除确认 -->
    <ui-dialog :open="deleteOpen" @update:open="deleteOpen = $event">
      <dialog-content class="pl-dialog max-w-sm">
        <dialog-header>
          <dialog-title>删除歌单</dialog-title>
          <dialog-description>
            确定删除「{{ formTarget?.name }}」？此操作不可恢复。
          </dialog-description>
        </dialog-header>
        <dialog-footer>
          <ui-button variant="outline" @click="deleteOpen = false">取消</ui-button>
          <ui-button variant="destructive" :disabled="busy" @click="submitDelete">删除</ui-button>
        </dialog-footer>
      </dialog-content>
    </ui-dialog>

    <!-- 歌单右键菜单（Teleport，不和 tip 嵌套） -->
    <teleport to="body">
      <div
        v-if="ctxOpen && formTarget"
        class="pl-ctx-backdrop"
        @mousedown="closePlCtx"
        @contextmenu.prevent="closePlCtx"
      />
      <div
        v-if="ctxOpen && formTarget"
        class="pl-ctx-menu"
        :style="{ left: `${ctxX}px`, top: `${ctxY}px` }"
        @mousedown.stop
      >
        <div class="pl-ctx-label">{{ formTarget.name }}</div>
        <button type="button" class="pl-ctx-item" @click="onCtxAction('open')">
          <i class="ri-folder-open-line" />
          打开
        </button>
        <button type="button" class="pl-ctx-item" @click="onCtxAction('rename')">
          <i class="ri-edit-line" />
          重命名
        </button>
        <div class="pl-ctx-sep" />
        <button
          type="button"
          class="pl-ctx-item pl-ctx-item--danger"
          @click="onCtxAction('delete')"
        >
          <i class="ri-delete-bin-line" />
          删除歌单
        </button>
      </div>
    </teleport>
  </div>
</template>

<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { navigateToMusicList } from '@/components/common/MusicListNavigator';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type SidebarPlaylist, useUserPlaylistsStore } from '@/store/modules/userPlaylists';
import { isElectron, isMobile } from '@/utils';
import { showBottomToast } from '@/utils/shortcutToast';

const props = defineProps({
  size: {
    type: String,
    default: '26px'
  },
  menus: {
    type: Array as any,
    default: () => []
  }
});

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const plStore = useUserPlaylistsStore();

const showPlaylistRail = computed(() => isElectron);

const sliderTick = ref(0);
const bumpSlider = async () => {
  await nextTick();
  requestAnimationFrame(() => {
    sliderTick.value += 1;
  });
};

const currentPath = computed(() => route.path || '/');
const isSettingsActive = computed(
  () => currentPath.value === '/set' || currentPath.value.startsWith('/set/')
);

const isMenuActive = (menuPath: string) => {
  if (isSettingsActive.value) return false;
  if (menuPath === '/') return currentPath.value === '/';
  return currentPath.value === menuPath || currentPath.value.startsWith(`${menuPath}/`);
};

const isPlaylistActive = (id: string) =>
  route.name === 'musicList' &&
  String(route.params.id || '') === String(id) &&
  String(route.query.type || '') === 'playlist';

watch(
  () => route.path,
  () => void bumpSlider()
);
watch(
  () => props.menus?.length,
  () => bumpSlider()
);
watch(
  () => plStore.items.length,
  () => bumpSlider()
);

onMounted(() => {
  bumpSlider();
  if (showPlaylistRail.value) void plStore.reload();
});

const showBack = computed(() => {
  if (isMobile.value) return false;
  return route.meta.back === true;
});
const goBack = () => router.back();
const onBackTransitionFrame = () => {
  bumpSlider();
  window.setTimeout(() => bumpSlider(), 80);
  window.setTimeout(() => bumpSlider(), 160);
  window.setTimeout(() => bumpSlider(), 280);
};

const activeIndex = computed(() => {
  if (isSettingsActive.value) return -1;
  return props.menus.findIndex((item: { path: string }) => isMenuActive(item.path));
});

const itemEls = ref<(HTMLElement | null)[]>([]);
const setItemRef = (el: HTMLElement | null, index: number) => {
  itemEls.value[index] = el;
};

const sliderStyle = computed(() => {
  void sliderTick.value;
  const idx = activeIndex.value;
  if (idx < 0) return { opacity: '0', width: '0px', height: '0px' };
  const wrap = itemEls.value[idx];
  if (!wrap) return { opacity: '0', width: '0px', height: '0px' };
  const link = wrap.querySelector('.app-menu-item-link') as HTMLElement | null;
  const target = link || wrap;
  return {
    transform: `translate(${target.offsetLeft + wrap.offsetLeft}px, ${target.offsetTop + wrap.offsetTop}px)`,
    width: `${target.offsetWidth}px`,
    height: `${target.offsetHeight}px`,
    opacity: '1'
  };
});

const playlistTitle = (pl: SidebarPlaylist) => {
  const n = pl.trackCount != null ? ` · ${pl.trackCount} 首` : '';
  return `${pl.name}${n}`;
};

const openPlaylist = (pl: SidebarPlaylist) => {
  navigateToMusicList(router, {
    id: pl.id,
    type: 'playlist',
    name: pl.name,
    listInfo: {
      id: pl.id,
      name: pl.name,
      picUrl: pl.coverUrl,
      source: 'qishui',
      trackCount: pl.trackCount
    },
    source: 'qishui',
    canRemove: true
  });
};

// —— 弹窗表单 ——
const busy = ref(false);
const createOpen = ref(false);
const renameOpen = ref(false);
const deleteOpen = ref(false);
const formName = ref('');
const formTarget = ref<SidebarPlaylist | null>(null);

// —— 右键菜单（与 tip 完全分离）——
const ctxOpen = ref(false);
const ctxX = ref(0);
const ctxY = ref(0);

const closePlCtx = () => {
  ctxOpen.value = false;
};

const openPlCtx = (e: MouseEvent, pl: SidebarPlaylist) => {
  formTarget.value = pl;
  // 避免贴边裁切
  const pad = 8;
  const menuW = 160;
  const menuH = 160;
  ctxX.value = Math.min(e.clientX, window.innerWidth - menuW - pad);
  ctxY.value = Math.min(e.clientY, window.innerHeight - menuH - pad);
  ctxOpen.value = true;
};

const onCtxAction = (action: 'open' | 'rename' | 'delete') => {
  const pl = formTarget.value;
  ctxOpen.value = false;
  if (!pl) return;
  if (action === 'open') openPlaylist(pl);
  else if (action === 'rename') openRenameDialog(pl);
  else openDeleteDialog(pl);
};

const openCreateDialog = () => {
  if (!plStore.authenticated) {
    showBottomToast('请先登录');
    return;
  }
  formName.value = '';
  createOpen.value = true;
};

const openRenameDialog = (pl: SidebarPlaylist) => {
  formTarget.value = pl;
  formName.value = pl.name;
  renameOpen.value = true;
};

const openDeleteDialog = (pl: SidebarPlaylist) => {
  formTarget.value = pl;
  deleteOpen.value = true;
};

const submitCreate = async () => {
  if (busy.value) return;
  busy.value = true;
  try {
    const pl = await plStore.create(formName.value || '新建歌单');
    createOpen.value = false;
    showBottomToast('已创建');
    openPlaylist(pl);
  } catch (error: any) {
    showBottomToast(error?.message || '创建失败');
  } finally {
    busy.value = false;
  }
};

const submitRename = async () => {
  if (busy.value || !formTarget.value) return;
  busy.value = true;
  try {
    await plStore.rename(formTarget.value.id, formName.value);
    renameOpen.value = false;
    showBottomToast('已重命名');
  } catch (error: any) {
    showBottomToast(error?.message || '重命名失败');
  } finally {
    busy.value = false;
  }
};

const submitDelete = async () => {
  if (busy.value || !formTarget.value) return;
  busy.value = true;
  const id = formTarget.value.id;
  try {
    await plStore.remove(id);
    deleteOpen.value = false;
    showBottomToast('已删除');
    if (isPlaylistActive(id)) router.push('/');
  } catch (error: any) {
    showBottomToast(error?.message || '删除失败');
  } finally {
    busy.value = false;
  }
};
</script>

<style lang="scss" scoped>
.app-menu-shell {
  @apply h-full flex items-stretch;
  padding: 8px 6px calc(10px + var(--play-bar-height, 5rem));
  box-sizing: border-box;
}

.app-menu {
  @apply flex flex-col items-center justify-start w-[56px] py-2;
  border-radius: 16px;
  height: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.menu-back-slot {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  width: 100%;
  margin-bottom: 4px;
  overflow: hidden;
}

.menu-back-btn {
  @apply flex items-center justify-center flex-shrink-0;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--chrome-text-muted, #9ca3af);
  font-size: 20px;
  cursor: pointer;
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.15s;

  &:hover {
    color: var(--primary-color, #22c55e);
    background: var(--chrome-surface, rgba(255, 255, 255, 0.1));
    transform: scale(1.05);
  }
}

.menu-back-enter-active,
.menu-back-leave-active {
  transition:
    opacity 0.22s ease,
    max-height 0.3s cubic-bezier(0.34, 1.4, 0.64, 1),
    margin 0.28s ease,
    transform 0.3s cubic-bezier(0.34, 1.4, 0.64, 1);
  max-height: 48px;
}

.menu-back-enter-from,
.menu-back-leave-to {
  opacity: 0;
  max-height: 0;
  margin-bottom: 0;
  transform: translateY(-10px) scale(0.82);
}

.menu-back-enter-to,
.menu-back-leave-from {
  opacity: 1;
  max-height: 48px;
  margin-bottom: 4px;
  transform: translateY(0) scale(1);
}

.app-menu-list {
  position: relative;
  flex: 0 0 auto;
  min-height: 0;
  max-height: none;
  padding-bottom: 4px;
  width: 100%;
}

.menu-slider-bg {
  position: absolute;
  top: 0;
  left: 0;
  border-radius: 14px;
  background: var(--primary-color, #22c55e);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
  transition:
    transform 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    width 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    height 0.28s cubic-bezier(0.34, 1.4, 0.64, 1),
    opacity 0.18s ease;
  pointer-events: none;
  z-index: 0;
}

.app-menu-item {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
}

.app-menu-item-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 4px 0;
  border-radius: 14px;
  overflow: visible;
  transition:
    color 0.15s,
    transform 0.15s;
}

.app-menu-item-icon {
  position: relative;
  z-index: 2;
  transition: color 0.15s;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1;
}

:global(.theme-light) .app-menu-item-icon {
  color: rgba(17, 24, 39, 0.55);
}

.app-menu-item-link.is-off:hover {
  transform: scale(1.05);
}

.app-menu-item-link.is-off:hover .app-menu-item-icon {
  color: var(--primary-color, #22c55e) !important;
}

.app-menu-item-link.is-on .app-menu-item-icon {
  color: #ffffff !important;
}

.playlist-rail {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2px;
}

.playlist-rail-sep {
  width: 28px;
  margin: 6px 0 8px;
  background: var(--chrome-border, rgba(255, 255, 255, 0.14));
  flex-shrink: 0;
}

.playlist-add-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--chrome-text-muted, rgba(255, 255, 255, 0.65));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  margin-bottom: 4px;
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.12s;

  &:hover {
    color: var(--primary-color, #22c55e);
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }
}

.playlist-rail-scroll {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.playlist-rail-hint {
  width: 36px;
  height: 36px;
  margin: 2px auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--chrome-text-muted, rgba(255, 255, 255, 0.45));
}

.playlist-rail-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin: 2px auto;
  border: none;
  background: transparent;
  border-radius: 12px;
  padding: 0;
  cursor: pointer;
  color: var(--chrome-text, #f3f4f6);
  transition:
    background 0.15s,
    transform 0.12s,
    box-shadow 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(1.05);
  }

  &.is-on {
    background: color-mix(in srgb, var(--primary-color, #22c55e) 28%, transparent);
    box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--primary-color, #22c55e) 55%, transparent);
  }
}

.playlist-rail-cover {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.55);
  font-size: 14px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.menu-footer {
  flex-shrink: 0;
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 8px;
  margin-top: 4px;
  z-index: 2;
  border-top: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.08));
}

.menu-footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  color: rgba(255, 255, 255, 0.72);
  transition:
    color 0.15s,
    background 0.15s,
    transform 0.15s;

  &:hover,
  &.is-off:hover {
    color: var(--primary-color, #22c55e);
    background: var(--chrome-surface, rgba(255, 255, 255, 0.1));
    transform: scale(1.05);
  }

  &.is-on {
    color: #ffffff !important;
    background: var(--primary-color, #22c55e);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
}

:global(.theme-light) .menu-footer-btn {
  color: rgba(17, 24, 39, 0.55);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 8px 0 4px;
}

.field-label {
  font-size: 12px;
  color: var(--chrome-text-muted, #9ca3af);
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.14));
  background: var(--chrome-surface, rgba(255, 255, 255, 0.06));
  color: var(--chrome-text, #f8fafc);
  font-size: 14px;
  outline: none;
}

.field-input:focus {
  border-color: rgb(var(--chrome-accent, 34, 197, 94));
  box-shadow: 0 0 0 2px rgba(var(--chrome-accent, 34, 197, 94), 0.2);
}

.pl-ctx-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100050;
}

.pl-ctx-menu {
  position: fixed;
  z-index: 100060;
  min-width: 9.5rem;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--chrome-border, rgba(255, 255, 255, 0.14));
  background: var(--chrome-surface-strong, rgba(24, 24, 27, 0.96));
  color: var(--chrome-text, #f3f4f6);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(14px);
}

.pl-ctx-label {
  padding: 6px 10px 8px;
  font-size: 11px;
  opacity: 0.65;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pl-ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  cursor: pointer;
  text-align: left;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  i {
    font-size: 15px;
    opacity: 0.9;
  }
}

.pl-ctx-item--danger {
  color: #f87171;
}

.pl-ctx-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--chrome-border, rgba(255, 255, 255, 0.12));
}

.mobile {
  .app-menu {
    max-width: 100%;
    width: 100vw;
    position: relative;
    bottom: 0;
    left: 0;
    z-index: 99999;
    @apply bg-light dark:bg-black border-none;

    &-list {
      @apply flex justify-between px-4;
      max-height: none !important;
      overflow: visible !important;
    }

    &-item {
      &-link {
        @apply my-2 w-auto px-2 py-2;
        width: auto !important;
      }
    }
  }
}
</style>
