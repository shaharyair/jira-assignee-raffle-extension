import { render, h, Component } from "vue";
import { EventActions } from "./types";

export const saveJiraAvatars = () => {
  const displayedAvatarsCollection = document.querySelectorAll(
    '[data-vc="filters.ui.filters.assignee.stateless.avatar.ak-avatar--image"]'
  );
  const hiddenAvatarsCollection = document.querySelectorAll('[data-vc="avatar-image"]');

  const combinedAvatarsCollection = [
    ...displayedAvatarsCollection,
    ...hiddenAvatarsCollection,
  ];

  const avatarSources = Array.from(
    new Set(combinedAvatarsCollection.map((el) => el.getAttribute("src") || ""))
  );

  const avatarFilteredSources = avatarSources.filter((el) => !el.includes("universal_avatar"));

  console.log("avatars", avatarFilteredSources);
  localStorage.setItem("avatarSources", JSON.stringify(avatarFilteredSources));
  localStorage.setItem("seenAvatarIndexes", JSON.stringify([]));

  return avatarFilteredSources;
};

export const createVNodeAndRenderComponent = (
  component: Component,
  targetElement: HTMLElement,
  props = {}
): void => {
  const vNode = h(component, props);
  render(vNode, targetElement);
};

export const sendSaveAvatarsAction = () => {
  chrome.runtime.sendMessage({ action: EventActions.SAVE_AVATARS });
};

export const randomIntegerInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
