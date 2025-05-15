<template>
  <n-drawer
    :show="modelValue"
    :width="400"
    placement="right"
    @update:show="$emit('update:modelValue', $event)"
  >
    <n-drawer-content :title="t('comp.playlistDrawer.title')" class="mac-style-drawer">
      <n-scrollbar class="h-full">
        <div class="playlist-drawer">
          <!-- 创建新歌单按钮和表单 -->
          <div class="create-playlist-section">
            <div
              class="create-playlist-button"
              :class="{ 'is-expanded': isCreating }"
              @click="toggleCreateForm"
            >
              <div class="create-playlist-icon">
                <i class="iconfont" :class="isCreating ? 'ri-close-line' : 'ri-add-line'"></i>
              </div>
              <div class="create-playlist-text">
                {{
                  isCreating
                    ? t('comp.playlistDrawer.cancelCreate')
                    : t('comp.playlistDrawer.createPlaylist')
                }}
              </div>
            </div>

            <!-- 创建歌单表单 -->
            <div class="create-playlist-form" :class="{ 'is-visible': isCreating }">
              <n-input
                v-model:value="formValue.name"
                :placeholder="t('comp.playlistDrawer.playlistName')"
                maxlength="40"
                class="mac-style-input"
                :status="inputError ? 'error' : undefined"
              >
                <template #prefix>
                  <i class="iconfont ri-music-2-line"></i>
                </template>
              </n-input>
              <div class="privacy-switch">
                <div class="privacy-label">
                  <i
                    class="iconfont"
                    :class="formValue.privacy ? 'ri-lock-line' : 'ri-earth-line'"
                  ></i>
                  <span>{{
                    formValue.privacy
                      ? t('comp.playlistDrawer.privatePlaylist')
                      : t('comp.playlistDrawer.publicPlaylist')
                  }}</span>
                </div>
                <n-switch v-model:value="formValue.privacy" class="mac-style-switch">
                  <template #checked>{{ t('comp.playlistDrawer.private') }}</template>
                  <template #unchecked>{{ t('comp.playlistDrawer.public') }}</template>
                </n-switch>
              </div>
              <div class="form-actions">
                <n-button
                  type="primary"
                  quaternary
                  class="mac-style-button"
                  :loading="creating"
                  :disabled="!formValue.name"
                  @click="handleCreatePlaylist"
                >
                  {{ t('comp.playlistDrawer.create') }}
                </n-button>
              </div>
            </div>
          </div>

          <!-- 歌单列表 -->
          <div class="playlist-list">
            <div
              v-for="playlist in playlists"
              :key="playlist.id"
              class="playlist-item"
              @click="handleAddToPlaylist(playlist)"
            >
              <n-image
                :src="getImgUrl(playlist.coverImgUrl || playlist.picUrl, '100y100')"
                class="playlist-item-img"
                preview-disabled
                :img-props="{
                  crossorigin: 'anonymous'
                }"
              />
              <div class="playlist-item-info">
                <div class="playlist-item-name">{{ playlist.name }}</div>
                <div class="playlist-item-count">
                  {{ playlist.trackCount }}
                  {{ t('comp.playlistDrawer.count') }}
                </div>
              </div>
              <div class="playlist-item-action">
                <i class="iconfont ri-add-line"></i>
              </div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </n-drawer-content>
  </n-drawer>
</template>

<script lang="ts" setup>
import { useMessage } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { createPlaylist, updatePlaylistTracks } from '@/api/music';
import { getUserPlaylist } from '@/api/user';
import { useUserStore } from '@/store';
import { getImgUrl } from '@/utils';

const store = useUserStore();
const { t } = useI18n();
const props = defineProps<{
  modelValue: boolean;
  songId?: number;
}>();

const emit = defineEmits(['update:modelValue']);

const message = useMessage();
const playlists = ref<any[]>([]);
const creating = ref(false);
const isCreating = ref(false);

const formValue = ref({
  name: '',
  privacy: false
});

const inputError = computed(() => {
  return isCreating.value && !formValue.value.name;
});

const toggleCreateForm = () => {
  if (creating.value) return;
  isCreating.value = !isCreating.value;
  if (!isCreating.value) {
    formValue.value.name = '';
    formValue.value.privacy = false;
  }
};

// 获取用户歌单
const fetchUserPlaylists = async () => {
  try {
    const { user } = store;
    if (!user?.userId) {
      message.error(t('comp.playlistDrawer.loginFirst'));
      emit('update:modelValue', false);
      return;
    }

    const res = await getUserPlaylist(user.userId);
    if (res.data?.playlist) {
      playlists.value = res.data.playlist;
    }
  } catch (error) {
    console.error('获取歌单失败:', error);
    message.error(t('comp.playlistDrawer.getPlaylistFailed'));
  }
};

// 添加到歌单
const handleAddToPlaylist = async (playlist: any) => {
  if (!props.songId) return;
  try {
    const res = await updatePlaylistTracks({
      op: 'add',
      pid: playlist.id,
      tracks: props.songId.toString()
    });
    console.log('res.data', res.data);

    if (res.status === 200) {
      message.success(t('comp.playlistDrawer.addSuccess'));
      emit('update:modelValue', false);
    } else {
      throw new Error(res.data?.msg || t('comp.playlistDrawer.addFailed'));
    }
  } catch (error: any) {
    console.error('添加到歌单失败:', error);
    message.error(error.message || t('comp.playlistDrawer.addFailed'));
  }
};

// 创建歌单
const handleCreatePlaylist = async () => {
  if (!formValue.value.name) {
    message.error(t('comp.playlistDrawer.inputPlaylistName'));
    return;
  }

  try {
    creating.value = true;

    const res = await createPlaylist({
      name: formValue.value.name,
      privacy: formValue.value.privacy ? 10 : 0
    });

    if (res.data?.id) {
      message.success(t('comp.playlistDrawer.createSuccess'));
      isCreating.value = false;
      formValue.value.name = '';
      formValue.value.privacy = false;
      await fetchUserPlaylists();
    }
  } catch (error) {
    console.error('创建歌单失败:', error);
    message.error(t('comp.playlistDrawer.createFailed'));
  } finally {
    creating.value = false;
  }
};

// 监听显示状态变化
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      fetchUserPlaylists();
    }
  }
);
</script>

<style lang="scss" scoped>
.mac-style-drawer {
  @apply h-full;

  :deep(.n-drawer-header__main) {
    @apply text-base font-medium;
  }

  :deep(.n-drawer-content) {
    @apply h-full;
  }

  :deep(.n-drawer-content-wrapper) {
    @apply h-full;
  }

  :deep(.n-scrollbar-rail) {
    @apply right-0.5;
  }
}

.playlist-drawer {
  @apply flex flex-col gap-6 py-6;
}

.create-playlist-section {
  @apply flex flex-col;
}

.create-playlist-button {
  @apply flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-200
         bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700;

  &.is-expanded {
    @apply bg-gray-100 dark:bg-gray-700;

    .create-playlist-icon {
      transform: rotate(45deg);
    }
  }

  &-icon {
    @apply w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white
           transition-all duration-300;

    .iconfont {
      @apply text-xl transition-transform duration-300;
    }
  }

  &-text {
    @apply text-sm font-medium transition-colors duration-300;
  }
}

.create-playlist-form {
  @apply max-h-0 overflow-hidden transition-all duration-300 ease-in-out opacity-0;

  &.is-visible {
    @apply max-h-[200px] mt-4 opacity-100;
  }

  .mac-style-input {
    @apply rounded-lg;
    :deep(.n-input-wrapper) {
      @apply bg-gray-50 dark:bg-gray-800 border-0;
    }
    :deep(.n-input__input) {
      @apply text-sm;
    }
    :deep(.n-input__prefix) {
      @apply text-gray-400;
    }
  }

  .form-actions {
    @apply mt-4;
    .mac-style-button {
      @apply w-full rounded-lg text-sm py-2 bg-green-500 hover:bg-green-600 text-white;
    }
  }
}

.privacy-switch {
  @apply flex items-center justify-between mt-4 px-2;

  .privacy-label {
    @apply flex items-center gap-2;

    .iconfont {
      @apply text-base text-gray-500 dark:text-gray-400;
    }
    span {
      @apply text-sm;
    }
  }

  :deep(.n-switch) {
    @apply h-5 min-w-[40px];
  }
}

.playlist-list {
  @apply flex flex-col gap-2 pb-40;
}

.playlist-item {
  @apply flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200
         hover:bg-gray-50 dark:hover:bg-gray-800;

  &-img {
    @apply w-10 h-10 rounded-xl;
  }

  &-info {
    @apply flex-1 min-w-0;
  }

  &-name {
    @apply text-sm font-medium truncate;
  }

  &-count {
    @apply text-xs text-gray-500 dark:text-gray-400;
  }

  &-action {
    @apply w-8 h-8 rounded-lg flex items-center justify-center
           text-gray-400 hover:text-green-500 transition-colors duration-200;

    .iconfont {
      @apply text-xl;
    }
  }
}

:deep(.n-drawer-body-content-wrapper) {
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}
</style>
