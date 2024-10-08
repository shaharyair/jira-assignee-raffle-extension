import { EventActions } from "../../types";
import { AvatarsMenuToggle } from "./types";

export class JiraUtils {
  static saveJiraAvatars() {
    this.clearAvatarSelection();
    const avatarImageSources = this.getAvatarImgSources();
    const hiddenAvatarImageSources = this.getHiddenAvatarImgSources();
    const combinedAvatarsCollection = [...avatarImageSources, ...hiddenAvatarImageSources];
    const avatarSources = Array.from(new Set(combinedAvatarsCollection.map((el) => el.getAttribute("src") || "")));
    const avatarFilteredSources = avatarSources.filter((el) => !el.includes("universal_avatar"));
    localStorage.setItem("avatarSources", JSON.stringify(avatarFilteredSources));
    localStorage.setItem("seenAvatarIndexes", JSON.stringify([]));
    console.log("Saved Avatars to local storage", avatarFilteredSources);
    this.toggleMoreAvatarsMenu(AvatarsMenuToggle.HIDE);
    return avatarFilteredSources;
  }

  static getAvatarImgSources() {
    return Array.from(
      document.querySelectorAll('[data-vc="filters.ui.filters.assignee.stateless.avatar.ak-avatar--image"]')
    );
  }

  static getHiddenAvatarImgSources() {
    this.toggleMoreAvatarsMenu(AvatarsMenuToggle.SHOW);
    return Array.from(document.querySelectorAll('[data-vc="avatar-image"]'));
  }

  static getAvatarButtons() {
    return Array.from(
      (document.querySelectorAll('[aria-label="assignee filter avatar"]') as NodeListOf<HTMLElement>) || []
    );
  }

  static getHiddenAvatarButtons() {
    this.toggleMoreAvatarsMenu(AvatarsMenuToggle.SHOW);
    const moreAvatarsMenu = document.querySelectorAll('[id^="ds--dropdown"]');
    if (!moreAvatarsMenu.length) {
      console.error("More avatars menu not found");
      return [];
    }
    return Array.from(moreAvatarsMenu).flatMap((menu) =>
      Array.from(menu.querySelectorAll('[role="menuitemcheckbox"]'))
    ) as HTMLElement[];
  }

  static toggleMoreAvatarsMenu(action: AvatarsMenuToggle) {
    const moreAvatarsMenu = document.querySelectorAll('[id^="ds--dropdown"]');
    const button = document.querySelector(
      '[data-test-id="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]'
    ) as HTMLElement;
    if (action === AvatarsMenuToggle.SHOW && !moreAvatarsMenu.length) {
      button?.click();
    }
    if (action === AvatarsMenuToggle.HIDE && moreAvatarsMenu.length) {
      button?.click();
    }
  }

  static isButtonChecked(button: HTMLElement) {
    return button.getAttribute("aria-checked") === "true" || button.getAttribute("checked") !== null;
  }

  static clearAvatarSelection() {
    const clearButtonParent = document.querySelector('[data-testid="filters.ui.filters.clear-button.ak-button"]');
    if (!clearButtonParent) {
      return;
    }

    const clearButton = clearButtonParent.querySelector('[type="button"]') as HTMLElement;
    if (clearButton) {
      clearButton.click();
    } else {
      console.error("Clear button not found");
    }
  }

  static selectAvatarFilter(imgSrcToMatch: string) {
    const avatarButtons = this.getAvatarButtons();
    const hiddenAvatarButtons = this.getHiddenAvatarButtons();
    const combinedAvatarButtons = [...avatarButtons, ...hiddenAvatarButtons];
    combinedAvatarButtons.forEach((button) => {
      this.toggleMoreAvatarsMenu(AvatarsMenuToggle.SHOW);
      const parentElem = button.parentElement;
      const image = parentElem?.querySelector("img");
      const isImgMatch = image?.src === imgSrcToMatch;
      if (isImgMatch && !this.isButtonChecked(button)) {
        button.click();
      }
    });
    this.toggleMoreAvatarsMenu(AvatarsMenuToggle.HIDE);
  }

  static triggerAvatarSelection(imgSrcToMatch: string) {
    this.clearAvatarSelection();
    this.selectAvatarFilter(imgSrcToMatch);
  }

  static attachSaveAvatarsEventListeners() {
    const activeTabQueryOptions = { active: true, currentWindow: true };
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === EventActions.SAVE_AVATARS) {
        chrome.tabs.query(activeTabQueryOptions).then((tabs) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs?.[0]?.id as number },
            files : ['saveJiraAvatars.js'],
          });
        });
      }
    });
  }

  static sendSaveAvatarsEvent() {
    chrome.runtime.sendMessage({ action: EventActions.SAVE_AVATARS });
  }
}
