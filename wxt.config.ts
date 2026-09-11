import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    name: "Jira Assignee Raffle",
    description:
      "Slot-machine raffle for Jira boards: spin the dice, land on a random assignee, filter the board to them.",
    version: "0.3.0",
    permissions: ["storage"],
  },
});
