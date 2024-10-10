import { EventActions } from "./types";

export class ChromeUtils {
  static sendEvent = (action: EventActions) => {
    chrome.runtime.sendMessage({ action});
  };

  static addEventListener = (event: EventActions, callback: (...args: any[]) => void , callbackArgs: any[]) => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === event) {
        callback(...callbackArgs);
      }
    });
  };

  static executeScriptOnActiveTab = (scriptPath: string) => {
    const activeTabQueryOptions = { active: true, currentWindow: true };
    chrome.tabs.query(activeTabQueryOptions).then((tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs?.[0]?.id as number },
        files: [scriptPath],
      });
    });
  };
}
