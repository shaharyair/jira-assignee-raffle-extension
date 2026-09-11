# Jira Assignee Raffle

Adds a raffle button to the assignee filter row of a Jira board. Clicking it opens a
full-screen slot machine; pulling its lever picks a random assignee and filters the
board to them. Nobody is drawn twice until everyone has had a turn, then a new round
starts.

Draw state is stored per board in `chrome.storage.local`, so two boards keep
independent rounds and a reload does not restart one.

## The draw

Clicking the dice opens a vintage Vegas one-armed bandit over the page: chrome shell,
bulb-lit crown, three reels and an arm you drag down (or hit Enter on). The handle
swings past horizontal on its pivot, so the ball finishes below the mount like a real
bandit's; release past 60% of its travel and it latches, anything shorter springs
back. The reels stop left to right 420ms apart.

**Half the pulls miss.** The reels land mismatched, the strip reads NO MATCH, and the
handle re-arms for another go. A miss is decided before the draw, so it costs nobody
their turn. On a win the three faces match, the payline lights, the award plate names
the winner, confetti bursts and the cabinet jolts; roughly a third of winning spins
hang the last reel a frame short first. The machine stays open either way, so you can
keep pulling for the next assignee until you close it. A gold arc around the button
tracks how much of the round is used up, and the button keeps the winner's avatar in
Jira's own selected-avatar treatment (white gap, brand-blue ring) with a dice badge
marking it as the raffle's pick. Gold is reserved for the round-progress arc.

**Nothing is drawn until a pull actually lands.** Opening the cabinet, missing, or
closing it again all leave storage untouched, so nobody's turn is burned by a change
of mind or a losing spin.
**The cabinet never dismisses itself** either: it stays up, win or not, until the ✕
in the top-right corner (or Esc) is used. Each reel animates to a single precomputed
offset (Web Animations API) that always ends on the already-picked assignee,
near-miss included: the animation never decides the winner, and the travel runs under
one deceleration curve so it never speeds back up before it stops. The cabinet is
inline SVG artwork (`utils/cabinet.ts`) with the live reels positioned in its window
cut-outs; it and the celebration overlays are appended to `document.body`, not to the
Vue container, so they survive Jira rebuilding the filter row mid-spin.

Sounds are synthesized with WebAudio (no audio files) and are **off by default**.
Under `prefers-reduced-motion: reduce` the cabinet still opens (it is the
interaction, not decoration) but the reels snap instead of spinning, with no blur,
near-miss, bulb flicker, confetti or jolt.

The jolt is applied to the cabinet, never to `document.body`: a transform on the body
would become the containing block for the fixed overlay and drag the whole machine
with it.

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
