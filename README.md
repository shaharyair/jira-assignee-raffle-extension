# Jira Assignee Raffle

Adds a raffle button to the assignee filter row of a Jira board. Clicking it opens a
full-screen slot machine; pulling its lever picks a random assignee and filters the
board to them. Nobody is drawn twice until everyone has had a turn, then a new round
starts.

Draw state is stored per board in `chrome.storage.local`, so two boards keep
independent rounds and a reload does not restart one.

## The draw

Clicking the dice opens the cabinet over the page: three reels, a marquee and a
lever you drag down (or hit Enter on). Release past 60% of the lever's travel and it
latches; anything shorter springs back. The reels stop left to right 300ms apart,
and roughly a third of the time the last one hangs a frame short before creeping the
winner in. Then the payline lights, the plate names the winner, confetti bursts and
the page shakes. A gold arc around the button tracks how much of the round is used
up, and the button keeps the winner's avatar in a gold ring with a dice badge.

**Nothing is drawn until the lever is pulled.** Opening the cabinet and dismissing it
(Esc or a backdrop click) leaves storage untouched, so nobody's turn is burned by a
change of mind. Each reel animates to a single precomputed offset (Web Animations
API) that always ends on the already-picked assignee, near-miss included: the
animation never decides the winner. The cabinet and the celebration overlays are
appended to `document.body`, not to the Vue container, so they survive Jira
rebuilding the filter row mid-spin.

Sounds are synthesized with WebAudio (no audio files) and are **off by default**.
Under `prefers-reduced-motion: reduce` the cabinet still opens (it is the
interaction, not decoration) but the reels snap instead of spinning, with no blur,
near-miss, confetti or shake.

## Popup

The toolbar popup lists the rounds in progress per board, resets them all with one
button, and toggles sound. Settings live in `chrome.storage.local` and the content
script picks them up through `storage.onChanged`, no reload needed.

## Develop

```bash
npm install
npm run dev      # loads a dev browser with the extension
npm run compile  # type check
npm test         # raffle + reel maths
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
