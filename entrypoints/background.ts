import { JiraUtils } from "../utils/jira/utils";

export default defineBackground(() => {
  JiraUtils.attachSaveAvatarsEventListeners();
});
