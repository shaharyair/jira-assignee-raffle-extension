import { EventActions } from "../types";
import { saveJiraAvatars } from "../utils";

const activeTabQueryOptions = { active: true, currentWindow: true };

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === EventActions.SAVE_AVATARS) {
      chrome.tabs.query(activeTabQueryOptions).then((tabs: any[]) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: saveJiraAvatars,
        });
      });
    }
  });
});
