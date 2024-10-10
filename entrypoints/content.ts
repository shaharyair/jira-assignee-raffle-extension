import { ContentScriptSettings } from "../utils/globalTypes";
import { JiraUtils } from "../utils/jira/utils";
import "./popup/style.css";
import "primeicons/primeicons.css";

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
