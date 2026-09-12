/**
 * Jira board assignee-filter DOM access.
 * Selectors verified against the live board UI; see README for the audit table.
 */
const SELECTORS = {
  /** Assignee filter fieldset — also our mount anchor. */
  filter: '[data-testid="filters.ui.filters.assignee.stateless.assignee-filter"]',
  /** Avatars that fit in the row: real checkboxes, id/value = accountId. */
  visible: 'input[type="checkbox"][id^="assignee-"]',
  /** "+N" overflow toggle. */
  showMore:
    '[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]',
  /** Overflow menu entries: id = accountId. */
  hidden: '[role="menuitemcheckbox"]',
} as const;

const ID_PREFIX = "assignee-";
const ARIA_PREFIX = "Filter assignees by ";
/** Jira re-renders the filter row after every toggle; wait it out before re-reading. */
const RERENDER_MS = 900;
const MENU_MS = 700;

export type Assignee = {
  id: string;
  name: string;
  avatar: string;
  checked: boolean;
  el: HTMLElement;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The filter row that holds the assignee filter alongside Epic, Type and the
 * rest: our button belongs beside them, not inside the avatar strip where it
 * reads as a person. Falls back to the avatar strip if Jira has no wrapper.
 */
export const getFilterRow = () => {
  const filter = document.querySelector<HTMLElement>(SELECTORS.filter);
  return filter?.parentElement ?? filter?.querySelector<HTMLElement>(":scope > div") ?? null;
};

const isMenuOpen = () => !!document.querySelector(SELECTORS.hidden);

async function openMenu() {
  if (isMenuOpen()) return;
  const button = document.querySelector<HTMLElement>(SELECTORS.showMore);
  if (!button) return; // no overflow: everyone fits in the row
  button.click();
  await sleep(MENU_MS);
}

export async function closeMenu() {
  if (!isMenuOpen()) return;
  document.querySelector<HTMLElement>(SELECTORS.showMore)?.click();
  await sleep(300);
}

/**
 * Everyone on the board, visible row + overflow menu.
 * Elements go stale after any click, so always re-read rather than caching.
 */
export async function getAssignees(): Promise<Assignee[]> {
  await openMenu();

  const visible = [...document.querySelectorAll<HTMLInputElement>(SELECTORS.visible)]
    .map((el) => ({
      id: el.id.slice(ID_PREFIX.length),
      name: (el.getAttribute("aria-label") ?? "").replace(ARIA_PREFIX, ""),
      avatar: document.querySelector<HTMLImageElement>(`label[for="${CSS.escape(el.id)}"] img`)?.src ?? "",
      checked: el.checked,
      el: el as HTMLElement,
    }))
    .filter((a) => a.id !== "empty"); // "Unassigned" is not a person

  const hidden = [...document.querySelectorAll<HTMLElement>(SELECTORS.hidden)].map((el) => ({
    id: el.id,
    name: (el.innerText ?? "").trim(),
    avatar: el.querySelector("img")?.src ?? "",
    checked: el.getAttribute("aria-checked") === "true",
    el,
  }));

  return [...visible, ...hidden];
}

/**
 * Uncheck every selected assignee. Jira accumulates filters (assignee IN (a, b)),
 * so a pick without this would stack instead of replace.
 */
export async function clearSelection() {
  // One click per pass: each toggle re-renders and invalidates the rest.
  for (let i = 0; i < 15; i++) {
    const checked = (await getAssignees()).filter((a) => a.checked);
    if (!checked[0]) return;
    checked[0].el.click();
    await sleep(RERENDER_MS);
  }
  console.warn("[jira-raffle] could not clear the assignee filter");
}

export async function selectAssignee(id: string) {
  await clearSelection();
  const target = (await getAssignees()).find((a) => a.id === id);
  if (!target) {
    console.warn(`[jira-raffle] assignee ${id} is no longer on the board`);
    return;
  }
  target.el.click();
  await sleep(RERENDER_MS);
  await closeMenu();
}

/** Board identity for per-board raffle state, e.g. "/jira/software/projects/DASH/boards/1". */
export const getBoardKey = () => location.pathname;
