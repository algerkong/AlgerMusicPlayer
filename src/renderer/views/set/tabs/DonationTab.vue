<template>
  <setting-section :title="t('settings.sections.donation')">
    <donation-list />
  </setting-section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import DonationList from '@/components/common/DonationList.vue';

import SettingSection from '../SettingSection.vue';

const { t } = useI18n();
</script>
