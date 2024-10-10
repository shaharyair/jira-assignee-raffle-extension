export enum AvatarsMenuToggle {
  SHOW = "SHOW",
  HIDE = "HIDE",
}

export enum JiraQuerySelectors {
  JIRA_FILTER_MENU_BAR = '[data-testid="software-filters.ui.list-filter-container"]',
  AVATAR_IMAGES = '[data-vc="filters.ui.filters.assignee.stateless.avatar.ak-avatar--image"]',
  HIDDEN_AVATAR_IMAGES = '[data-vc="avatar-image"]',
  AVATAR_BUTTONS = '[aria-label="assignee filter avatar"]',
  HIDDEN_AVATAR_BUTTONS = '[role="menuitemcheckbox"]',
  MORE_AVATARS_MENU = '[id^="ds--dropdown"]',
  SHOW_MORE_AVATARS_MENU_BUTTON = '[data-test-id="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]',
  CLEAR_FILTERS_BUTTON = '[data-testid="filters.ui.filters.clear-button.ak-button"]',
}
