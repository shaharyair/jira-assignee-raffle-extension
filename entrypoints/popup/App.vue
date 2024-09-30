<script lang="ts" setup>
import Button from 'primevue/button';
import { sendSaveAvatarsAction } from '../../utils';

const onRefreshClick = () => {
  sendSaveAvatarsAction()
}
</script>

<template>
  <div class="w-48 p-4 flex flex-col justify-center items-center bg-zinc-800">
    <Button @click="onRefreshClick" severity="primary" label="Refresh" rounded />
  </div>
</template>