import RandomAvatar from "../components/randomAvatar.vue";
import "./popup/style.css";
import "primeicons/primeicons.css";
import { VueUtils } from "../utils/vue/utils";
import { JiraQuerySelectors } from "../utils/jira/types";

export default defineContentScript({
  matches: ["*://firstoffer.atlassian.net/*"],
  main(ctx) {
    if (ctx.isValid) {
      setTimeout(() => {
        const componentParent = document.querySelector(JiraQuerySelectors.JIRA_FILTER_MENU_BAR) as HTMLElement;
        if (!componentParent) {
          console.error("Jira Extension: Parent element not found, cannot render component");
          return;
        }
        VueUtils.createVNodeAndRenderComponent(RandomAvatar, componentParent);
      }, 1000);
    }
  },
});
