<template>
  <div class="home-container h-full w-full bg-white dark:bg-black transition-colors duration-500">
    <n-scrollbar class="h-full">
      <div class="home-content w-full pb-32 pt-6 page-padding">
        <!-- Hero Section -->
        <home-hero />

        <!-- Main Content Sections -->
        <div class="content-sections space-y-10 md:space-y-8 lg:space-y-12">
          <!-- Recommended Playlists (Grid Section) -->
          <home-playlist-section :title="t('comp.recommendSonglist.title')" :limit="18" />

          <!-- Hot Artists (Horizontal Scroll Section) -->
          <home-artists :title="t('comp.recommendSinger.title')" :limit="15" />

          <!-- New Albums (NEW - 新碟上架) -->
          <home-album-section
            :title="t('comp.newAlbum.title')"
            :limit="6"
            :columns="5"
            :rows="1"
            @more="router.push('/album')"
          />

          <!-- New Songs (Compact Grid Section) -->
          <home-new-songs :title="t('comp.recommendNewMusic.title')" :limit="20" />
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script lang="ts" setup>
import { NScrollbar } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import HomeAlbumSection from './components/HomeAlbumSection.vue';
import HomeArtists from './components/HomeArtists.vue';
import HomeHero from './components/HomeHero.vue';
import HomeNewSongs from './components/HomeNewSongs.vue';
import HomePlaylistSection from './components/HomePlaylistSection.vue';

defineOptions({
  name: 'Home'
});

const { t } = useI18n();
const router = useRouter();
</script>

<style lang="scss" scoped>
.home-container {
  position: relative;
}

/* Global animation optimization - use will-change sparingly */
:deep(.animate-item) {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger delays for sequential animations */
:deep(.animate-item) {
  @for $i from 1 through 20 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.05}s;
    }
  }
}
</style>
