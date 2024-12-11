import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue"],
  manifest: {
    name: "Jira Avatars Randomizer",
    version: "0.1.1",
    permissions: ["storage", "activeTab", "scripting"],
  },
});
