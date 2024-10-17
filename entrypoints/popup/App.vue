<script lang="ts" setup>
import { EventActions } from '@/utils/chrome/types';
import { ChromeUtils } from '@/utils/chrome/utils';
import Button from 'primevue/button';

const loading = ref<boolean>(false);
const status = ref({
  saved: false,
});

const onRefetchClick = () => {
  loading.value = true;
  ChromeUtils.sendEvent(EventActions.SAVE_AVATARS);
  setTimeout(() => {
    status.value.saved = true;
    loading.value = false;
  }, 1000);

  setTimeout(() => {
    status.value.saved = false;
  }, 5000);
}
</script>

<template>
  <div class="w-48 p-4 flex flex-col gap-2 justify-center items-center bg-zinc-800">
    <Button @click="onRefetchClick" :loading="loading" severity="primary" label="Refetch" rounded />
    <div v-if="status.saved">Script Executed!</div>
  </div>
</template>