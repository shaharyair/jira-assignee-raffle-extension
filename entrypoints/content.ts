import RandomAssignee from "../components/RandomAssignee.vue";
import { getFilterBar } from "../utils/jira";

const MOUNTED_ATTR = "data-jira-raffle";

export default defineContentScript({
  matches: ["*://*.atlassian.net/jira/software/*"],
  main(ctx) {
    const mount = () => {
      const anchor = getFilterBar();
      if (!anchor || anchor.querySelector(`[${MOUNTED_ATTR}]`)) return;

      createIntegratedUi(ctx, {
        position: "inline",
        anchor,
        append: "last",
        onMount: (container) => {
          container.setAttribute(MOUNTED_ATTR, "");
          container.style.display = "flex";
          const app = createApp(RandomAssignee);
          app.mount(container);
          return app;
        },
        onRemove: (app) => app?.unmount(),
      }).mount();
    };

    // Jira is an SPA: the filter bar appears late and is rebuilt on every board
    // switch, so watch instead of guessing a delay. Re-runs are cheap no-ops.
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    ctx.onInvalidated(() => observer.disconnect());

    mount();
  },
});
