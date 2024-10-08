import { JiraUtils } from "../utils/jira/utils";

export default defineContentScript({
  matches: ["*://firstoffer.atlassian.net/*"],
  main(ctx) {
    JiraUtils.saveJiraAvatars();
  },
});
