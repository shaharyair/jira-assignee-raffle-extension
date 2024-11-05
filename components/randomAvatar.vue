<script setup lang="ts">
import { JiraUtils } from '../utils/jira/utils';
import { GlobaUtils } from '../utils/globalUtils';

enum AvatarRandomSettings {
    LOADING_DELAY = 1000
}

const avatarSources = ref<string[]>([]);
const seenAvatarIndexes = ref<Set<number>>(new Set());
const randomAvatarIndex = ref<number>(-1);
const loading = ref<boolean>(false);

const randomizeAvatarIndex = () => {
    return GlobaUtils.randomIntegerInRange(0, avatarSources.value.length - 1);
}

const randomizeAvatar = () => {
    if (seenAvatarIndexes.value.size === avatarSources.value.length) {
        randomAvatarIndex.value = -1;
        seenAvatarIndexes.value.clear();
        localStorage.setItem('seenAvatarIndexes', JSON.stringify([]));
        JiraUtils.triggerAvatarSelection('');
        return;
    }

    let newIndex = randomizeAvatarIndex();
    while (seenAvatarIndexes.value.has(newIndex)) {
        newIndex = randomizeAvatarIndex();
    }

    randomAvatarIndex.value = newIndex;
    seenAvatarIndexes.value.add(newIndex);
    localStorage.setItem('seenAvatarIndexes', JSON.stringify(Array.from(seenAvatarIndexes.value)));
    JiraUtils.triggerAvatarSelection(avatarSources.value[randomAvatarIndex.value]);
    console.log('Random avatar index:', randomAvatarIndex.value);
}

const onRandomClick = () => {
    loading.value = true;
    setTimeout(() => {
        randomizeAvatar();
        loading.value = false;
    }, AvatarRandomSettings.LOADING_DELAY);
}

onMounted(() => {
    const avatarSourcesFromLocalStorage = localStorage.getItem('avatarSources');
    const seenAvatarIndexesFromLocalStorage = localStorage.getItem('seenAvatarIndexes');

    if (avatarSourcesFromLocalStorage) {
        avatarSources.value = JSON.parse(avatarSourcesFromLocalStorage);
        console.log('Avatar sources loaded from local storage', avatarSources.value);
    }
    else {
        console.error('No avatar sources found in local storage');
    }

    if (seenAvatarIndexesFromLocalStorage) {
        seenAvatarIndexes.value = new Set(JSON.parse(seenAvatarIndexesFromLocalStorage));
        console.log('Seen avatar indexes loaded from local storage', seenAvatarIndexes.value);
    }
    else {
        console.error('No seen avatar indexes found in local storage');
    }
});

</script>

<template>
    <div class="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2">
        <div class="relative w-16">
            <div @click="onRandomClick"
                :class="[{ 'w-full aspect-square overflow-hidden rounded-full flex justify-center items-center cursor-pointer text-white p-0.5': true }, { 'border-2 border-[#0A66E4]': randomAvatarIndex >= 0 }]">
                <div v-if="randomAvatarIndex < 0"
                    class="text-xs bg-[#626F86] size-full rounded-full flex justify-center items-center">
                    <span>Random</span>
                </div>
                <div v-else class="size-full">
                    <img :src="avatarSources[randomAvatarIndex]" class="size-full rounded-full" />
                </div>
            </div>
            <div v-if="loading"
                class="w-full aspect-square absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/25 rounded-full flex justify-center items-center">
                <i class="pi pi-spinner animate-spin text-lg text-gray-300" />
            </div>
        </div>
    </div>
</template>
