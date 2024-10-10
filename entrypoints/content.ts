import { JiraUtils } from "../utils/jira/utils";
import "./popup/style.css";
import "primeicons/primeicons.css";

enum ContentScriptSettings {
  LOADING_DELAY = 2000,
}

export default defineContentScript({
  matches: ["*://firstoffer.atlassian.net/*"],
  main(ctx) {
    if (ctx.isValid) {
      setTimeout(() => {
        JiraUtils.renderJiraRandomButtonComponent();
      }, ContentScriptSettings.LOADING_DELAY);
    }
  },
});
