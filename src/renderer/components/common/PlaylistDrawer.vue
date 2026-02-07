<template>
  <n-drawer
    :show="modelValue"
    :width="420"
    placement="right"
    @update:show="$emit('update:modelValue', $event)"
    :unstable-show-mask="false"
    :show-mask="false"
  >
    <n-drawer-content class="!p-0">
      <template #header>
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-bold tracking-tight text-neutral-900 dark:text-white">
            {{ t('comp.playlistDrawer.title') }}
          </h2>
          <div class="h-1.5 w-1.5 rounded-full bg-primary" />
        </div>
      </template>

      <n-scrollbar class="h-full">
        <div class="flex flex-col gap-5 px-5 py-4">
          <!-- 创建新歌单 -->
          <div class="flex flex-col">
            <button
              class="flex items-center gap-4 rounded-2xl p-3 transition-all duration-200"
              :class="
                isCreating
                  ? 'bg-neutral-100 dark:bg-neutral-800'
                  : 'bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800'
              "
              @click="toggleCreateForm"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform duration-300"
                :class="{ 'rotate-45': isCreating }"
              >
                <i class="iconfont text-xl" :class="isCreating ? 'ri-close-line' : 'ri-add-line'" />
              </div>
              <span class="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                {{
                  isCreating
                    ? t('comp.playlistDrawer.cancelCreate')
                    : t('comp.playlistDrawer.createPlaylist')
                }}
              </span>
            </button>

            <!-- 创建歌单表单 -->
            <div
              class="overflow-hidden transition-all duration-300 ease-in-out"
              :class="isCreating ? 'mt-4 max-h-[200px] opacity-100' : 'max-h-0 opacity-0'"
            >
              <div class="flex flex-col gap-4 px-1">
                <n-input
                  v-model:value="formValue.name"
                  :placeholder="t('comp.playlistDrawer.playlistName')"
                  maxlength="40"
                  round
                  :status="inputError ? 'error' : undefined"
                >
                  <template #prefix>
                    <i class="iconfont ri-music-2-line text-neutral-400" />
                  </template>
                </n-input>

                <div class="flex items-center justify-between px-1">
                  <div class="flex items-center gap-2.5">
                    <i
                      class="iconfont text-base"
                      :class="
                        formValue.privacy
                          ? 'ri-lock-line text-primary'
                          : 'ri-earth-line text-neutral-400 dark:text-neutral-500'
                      "
                    />
                    <span class="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                      {{
                        formValue.privacy
                          ? t('comp.playlistDrawer.privatePlaylist')
                          : t('comp.playlistDrawer.publicPlaylist')
                      }}
                    </span>
                  </div>
                  <n-switch v-model:value="formValue.privacy">
                    <template #checked>{{ t('comp.playlistDrawer.private') }}</template>
                    <template #unchecked>{{ t('comp.playlistDrawer.public') }}</template>
                  </n-switch>
                </div>

                <button
                  class="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary/90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!formValue.name || creating"
                  @click="handleCreatePlaylist"
                >
                  <n-spin v-if="creating" :size="14" />
                  <span>{{ t('comp.playlistDrawer.create') }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 歌单列表 -->
          <div class="flex flex-col gap-1.5 pb-32">
            <div
              v-for="(playlist, index) in playlists"
              :key="playlist.id"
              class="group flex cursor-pointer items-center gap-3.5 rounded-2xl p-2.5 transition-all duration-200 hover:bg-neutral-50 active:scale-[0.98] dark:hover:bg-neutral-800/60"
              :style="{ animationDelay: `${index * 0.03}s` }"
              @click="handleAddToPlaylist(playlist)"
            >
              <!-- 封面 -->
              <div
                class="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-100 shadow-sm dark:bg-neutral-800"
              >
                <n-image
                  :src="getImgUrl(playlist.coverImgUrl || playlist.picUrl, '100y100')"
                  class="h-full w-full object-cover"
                  preview-disabled
                  :img-props="{ crossorigin: 'anonymous' }"
                />
              </div>

              <!-- 信息 -->
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                  {{ playlist.name }}
                </div>
                <div class="mt-0.5 text-xs font-medium text-neutral-400 dark:text-neutral-500">
                  {{ playlist.trackCount }} {{ t('comp.playlistDrawer.count') }}
                </div>
              </div>

              <!-- 添加按钮 -->
              <div
                class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-neutral-300 transition-all duration-200 group-hover:bg-primary/10 group-hover:text-primary dark:text-neutral-600 dark:group-hover:text-primary"
              >
                <i class="iconfont ri-add-line text-xl" />
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
import { getLoginErrorMessage, hasPermission } from '@/utils/auth';

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

    // 检查是否有真实登录权限
    if (!hasPermission(true)) {
      message.error(getLoginErrorMessage(true));
      emit('update:modelValue', false);
      return;
    }

    const res = await getUserPlaylist(user.userId, 999);
    if (res.data?.playlist) {
      playlists.value = res.data.playlist.filter((item: any) => item.userId === user.userId);
    }
  } catch (error) {
    console.error('获取歌单失败:', error);
    message.error(t('comp.playlistDrawer.getPlaylistFailed'));
  }
};

// 添加到歌单
const handleAddToPlaylist = async (playlist: any) => {
  if (!props.songId) return;

  // 检查是否有真实登录权限
  if (!hasPermission(true)) {
    message.error(getLoginErrorMessage(true));
    return;
  }

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

  // 检查是否有真实登录权限
  if (!hasPermission(true)) {
    message.error(getLoginErrorMessage(true));
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

<style scoped>
:deep(.n-drawer-body-content-wrapper) {
  padding-bottom: 0 !important;
  padding-top: 0 !important;
}
</style>
