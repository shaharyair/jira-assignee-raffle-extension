# Jira Assignee Raffle

Adds a raffle button to the assignee filter row of a Jira board. Each click picks a
random assignee and filters the board to them. Nobody is drawn twice until everyone
has had a turn, then a new round starts.

Draw state is stored per board in `chrome.storage.local`, so two boards keep
independent rounds and a reload does not restart one.

## The draw

Clicking the dice runs a slot machine: the button grows, avatars blur past it and
decelerate onto the winner while the filter is being applied, then the ring flashes
gold, confetti bursts, the page shakes and a winner banner slides in. A gold arc
around the button tracks how much of the round is used up.

The reel animates to a single precomputed offset (Web Animations API), so it always
stops exactly on the assignee that was already picked — the animation never decides
the winner. Celebration overlays are appended to `document.body`, not to the Vue
container, so they survive Jira rebuilding the filter row mid-spin.

Sounds are synthesized with WebAudio (no audio files) and are **off by default**.
Everything above collapses to a plain, instant button under
`prefers-reduced-motion: reduce`.

## Popup

The toolbar popup lists the rounds in progress per board, resets them all with one
button, and toggles sound. Settings live in `chrome.storage.local` and the content
script picks them up through `storage.onChanged` — no reload needed.

## Develop

```bash
npm install
npm run dev      # loads a dev browser with the extension
npm run compile  # type check
npm test         # raffle + reel logic
npm run build    # -> .output/chrome-mv3
```

Load `.output/chrome-mv3` via `chrome://extensions` → Developer mode → Load unpacked.

## How it hooks into Jira

Jira exposes the assignee filter as real checkboxes whose id/value is the Atlassian
account id, so the extension keys off account ids instead of avatar image URLs
(those carry expiring parameters).

| Purpose | Selector |
| --- | --- |
| Mount anchor (avatar row) | `[data-testid="filters.ui.filters.assignee.stateless.assignee-filter"] > div` |
| Avatars in the row | `input[type="checkbox"][id^="assignee-"]` |
| "+N" overflow toggle | `[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]` |
| Overflow menu entries | `[role="menuitemcheckbox"]` (id = account id) |

Jira rebuilds the filter row after every toggle, so elements are re-read after each
click rather than cached, and a `MutationObserver` remounts the button when Jira
re-renders or you switch boards.

If a Jira update breaks the button, these selectors are the place to look.
