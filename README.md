# Jira Assignee Raffle

Adds a **Raffle** button to the filter row of a Jira board. Clicking it opens a
full-screen slot machine; pulling its lever picks a random assignee and filters the
board to them. Nobody is drawn twice until everyone has had a turn, then a new round
starts. After the win a timer bar counts how long that person talks, so a standup
finishes with a per-person breakdown.

Round state is stored per board in `chrome.storage.local`, so two boards keep
independent rounds and a reload does not restart one (or lose a running clock). The
button carries the round counter (`3/7`) and nothing else: the winner is named by the
machine and by the board filter, so it is not repeated on a filter control.

## The draw

Clicking the dice opens a vintage Vegas one-armed bandit over the page: chrome shell,
bulb-lit crown, three reels and an arm you drag down (or hit Enter on). The handle
swings past horizontal on its pivot, so the ball finishes below the mount like a real
bandit's; release past 60% of its travel and it latches, anything shorter springs
back. The reels stop left to right 420ms apart.

**Some pulls miss** (half of them by default, see Win chance). The reels land
mismatched, the strip reads NO MATCH, and the handle re-arms for another go. A miss
is decided before the draw, so it costs nobody their turn. On a win the three faces
match, the payline lights, the award plate names the winner, confetti bursts and the
cabinet jolts; roughly a third of winning spins hang the last reel a frame short
first.

**Nothing is drawn until a pull actually lands.** Opening the cabinet, missing, or
closing it again all leave storage untouched, so nobody's turn is burned by a change
of mind or a losing spin.
**A losing pull never dismisses the cabinet**: only a win does, and only after the
auto-close delay (5s by default, or never if it is off), so the board comes back in
time for the winner to talk. Reaching for the lever again cancels that timer, so
another pull is always possible. Esc and the ✕ in the top-right close it by hand at
any point. Each reel animates to a single precomputed
offset (Web Animations API) that always ends on the already-picked assignee,
near-miss included: the animation never decides the winner, and the travel runs under
one deceleration curve so it never speeds back up before it stops. The cabinet is
inline SVG artwork (`utils/cabinet.ts`) with the live reels positioned in its window
cut-outs; it and the celebration overlays are appended to `document.body`, not to the
Vue container, so they survive Jira rebuilding the filter row mid-spin.

Sounds are synthesized with WebAudio (no audio files) and are **on by default**;
the popup mutes them.
With animations reduced (either from the popup or, on System, from
`prefers-reduced-motion: reduce`) the cabinet still opens — it is the interaction,
not decoration — but the reels snap instead of spinning, with no blur, near-miss,
bulb flicker, confetti or jolt.

The jolt is applied to the cabinet, never to `document.body`: a transform on the body
would become the containing block for the fixed overlay and drag the whole machine
with it.

## The timer

A win closes the cabinet and puts the winner on the clock: a bar at the bottom of the
board with their avatar, name, a running `mm:ss`, pause and stop. Drawing the next
person banks the elapsed time against the current one and starts the new clock, so a
normal standup needs no extra clicks.

Elapsed time is a `Date.now()` difference rather than an incremented counter: a
background tab throttles intervals and would under-report whoever is talking. The
running clock lives in storage, so a mid-standup reload picks it back up.

Stopping the clock on the **last** person in the round swaps the bar for a recap:
everyone, their time, longest first, with the round total. That has to happen on stop
rather than on the next draw, because the last person has no next draw to bank them.
A new round clears the previous round's times.

## Popup

The toolbar popup is settings only:

| Setting | Options | Default |
| --- | --- | --- |
| Win chance | Always / Usually / Even / Rare | Even (half the pulls miss) |
| Auto-close after a win | Off / 3s / 5s / 10s | 5s |
| Animations | Full / Reduced / System | System |
| Sound effects | on / off | on |

Plus **Reset all rounds**, which clears drawn state and banked times for every board.
Settings live in `chrome.storage.local` behind one read and one `storage.onChanged`
listener (`utils/settings.ts`), and the content script picks changes up with no
reload. Every default is defined there and nowhere else.

## Develop

```bash
npm install
npm run dev      # loads a dev browser with the extension
npm run compile  # type check
npm test         # raffle, reel and timer maths
npm run build    # -> .output/chrome-mv3
```

Load `.output/chrome-mv3` via `chrome://extensions` → Developer mode → Load unpacked.

## How it hooks into Jira

Jira exposes the assignee filter as real checkboxes whose id/value is the Atlassian
account id, so the extension keys off account ids instead of avatar image URLs
(those carry expiring parameters).

| Purpose | Selector |
| --- | --- |
| Mount anchor (filter row) | parent of `[data-testid="filters.ui.filters.assignee.stateless.assignee-filter"]`, falling back to its `> div` avatar strip |
| Avatars in the row | `input[type="checkbox"][id^="assignee-"]` |
| "+N" overflow toggle | `[data-testid="filters.ui.filters.assignee.stateless.show-more-button.assignee-filter-show-more"]` |
| Overflow menu entries | `[role="menuitemcheckbox"]` (id = account id) |

Jira rebuilds the filter row after every toggle, so elements are re-read after each
click rather than cached, and a `MutationObserver` remounts the button when Jira
re-renders or you switch boards.

If a Jira update breaks the button, these selectors are the place to look.
