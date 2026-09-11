import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    name: "Jira Assignee Raffle",
    description: "Picks a random assignee on a Jira board and applies them as a filter.",
    version: "0.2.0",
    permissions: ["storage"],
  },
});
