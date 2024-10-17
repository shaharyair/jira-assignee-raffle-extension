import { ChromeUtils } from "@/utils/chrome/utils";
import { EventActions } from "@/utils/chrome/types";

export default defineBackground(() => {
  ChromeUtils.addEventListener(EventActions.SAVE_AVATARS, ChromeUtils.executeScriptOnActiveTab, ["saveJiraAvatars.js",]);
});
