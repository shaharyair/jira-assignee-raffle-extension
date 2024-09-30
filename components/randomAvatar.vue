<script setup lang="ts">
import { randomIntegerInRange } from '@/utils';

const props = defineProps<{
    avatarSources: string[],
}>();

const seenAvatarIndexes = ref<Set<number>>(new Set());
const randomAvatarIndex = ref<number>(-1);
const loading = ref<boolean>(false);

const randomizeAvatarIndex = () => {
    return randomIntegerInRange(0, props.avatarSources.length - 1);
}

const randomizeAvatar = () => {
    if (seenAvatarIndexes.value.size === props.avatarSources.length) {
        randomAvatarIndex.value = -1;
        seenAvatarIndexes.value.clear();
        return;
    }

    let newIndex = randomizeAvatarIndex();

    do {
        newIndex = randomizeAvatarIndex();
    } while (seenAvatarIndexes.value.has(newIndex));

    randomAvatarIndex.value = newIndex;
    seenAvatarIndexes.value.add(newIndex);
}

const onRandomClick = () => {
    loading.value = true;
    setTimeout(() => {
        randomizeAvatar();
        loading.value = false;
    }, 1000);
}

</script>

<template>
    <div
        class="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2">
        <div class="relative w-14">
            <div @click="onRandomClick"
                :class="[{ 'w-full aspect-square overflow-hidden rounded-full flex justify-center items-center cursor-pointer text-white p-0.5': true }, { 'border-2 border-[#0A66E4]': randomAvatarIndex >= 0 }]">
                <div v-if="randomAvatarIndex < 0"
                    class="text-xs bg-[#626F86] size-full rounded-full flex justify-center items-center">
                    <span>Random</span>
                </div>
                <div v-else class="size-full">
                    <img :src="props.avatarSources[randomAvatarIndex]" class="size-full rounded-full" />
                </div>
            </div>
            <div v-if="loading"
                class="w-full aspect-square absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/25 rounded-full flex justify-center items-center">
                <i class="pi pi-spinner animate-spin text-lg text-gray-300" />
            </div>
        </div>
    </div>
</template>
