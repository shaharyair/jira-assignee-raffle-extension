<script lang="ts" setup>
import Button from 'primevue/button';
import { sendSaveAvatarsAction } from '../../utils';

const loading = ref<boolean>(false);
const status = ref({
  saved: false,
});

const onRefetchClick = () => {
  loading.value = true;
  sendSaveAvatarsAction()
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
    <div v-if="status.saved">Saved!</div>
  </div>
</template>