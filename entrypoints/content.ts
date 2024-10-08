import { ContentScriptContext } from "wxt/client";
import RandomAvatar from "../components/randomAvatar.vue";
import "./popup/style.css";
import "primeicons/primeicons.css";
import { VueUtils } from "../utils/vue/utils";

export default defineContentScript({
  matches: ["*://firstoffer.atlassian.net/*"],
  main(ctx: ContentScriptContext) {
    if (ctx.isValid) {
      setTimeout(() => {
        const componentParent = document.querySelector(
          '[data-testid="software-filters.ui.list-filter-container"]'
        ) as HTMLElement;
        if (!componentParent) {
          console.error("Jira Extension: Parent element not found, cannot render component");
          return;
        }
        VueUtils.createVNodeAndRenderComponent(RandomAvatar, componentParent);
      }, 1000);
    }
  },
});
