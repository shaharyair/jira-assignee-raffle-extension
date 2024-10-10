import { ChromeUtils } from "../chrome/utils";
import { EventActions } from "../chrome/types";
import { AvatarsMenuToggle, JiraQuerySelectors } from "./types";
import { VueUtils } from "../vue/utils";
import RandomAvatar from "../../components/randomAvatar.vue";

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
    return Array.from(document.querySelectorAll(JiraQuerySelectors.AVATAR_IMAGES));
  }

  static getHiddenAvatarImgSources() {
    this.toggleMoreAvatarsMenu(AvatarsMenuToggle.SHOW);
    return Array.from(document.querySelectorAll(JiraQuerySelectors.HIDDEN_AVATAR_IMAGES));
  }

  static getAvatarButtons() {
    return Array.from(
      (document.querySelectorAll(JiraQuerySelectors.AVATAR_BUTTONS) as NodeListOf<HTMLElement>) || []
    );
  }

  static getHiddenAvatarButtons() {
    this.toggleMoreAvatarsMenu(AvatarsMenuToggle.SHOW);
    const moreAvatarsMenu = document.querySelectorAll(JiraQuerySelectors.MORE_AVATARS_MENU);
    if (!moreAvatarsMenu.length) {
      console.error("More avatars menu not found");
      return [];
    }
    return Array.from(moreAvatarsMenu).flatMap((menu) =>
      Array.from(menu.querySelectorAll(JiraQuerySelectors.HIDDEN_AVATAR_BUTTONS))
    ) as HTMLElement[];
  }

  static toggleMoreAvatarsMenu(action: AvatarsMenuToggle) {
    const moreAvatarsMenu = document.querySelectorAll(JiraQuerySelectors.MORE_AVATARS_MENU);
    const button = document.querySelector(JiraQuerySelectors.SHOW_MORE_AVATARS_MENU_BUTTON) as HTMLElement;
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
    const clearButtonParent = document.querySelector(JiraQuerySelectors.CLEAR_FILTERS_BUTTON);
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
    ChromeUtils.addEventListener(EventActions.SAVE_AVATARS, ChromeUtils.executeScriptOnActiveTab, [
      "saveJiraAvatars.js",
    ]);
  }

  static sendSaveAvatarsEvent() {
    ChromeUtils.sendEvent(EventActions.SAVE_AVATARS);
  }

  static renderJiraRandomButtonComponent() {
    const componentParent = document.querySelector(JiraQuerySelectors.JIRA_FILTER_MENU_BAR) as HTMLElement;
    if (!componentParent) {
      console.error("Jira Extension: Parent element not found, cannot render component");
      return;
    }
    VueUtils.createVNodeAndRenderComponent(RandomAvatar, componentParent);
  }
}
