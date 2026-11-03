# FFTabClose

Automatically close inactive tabs in Firefox and Zen Browser, modelled on the behaviour of Arc Browser. Regular tabs are closed after a configurable delay. Pinned tabs, Zen essentials and tabs inside folders are put to sleep instead, so they stay in the sidebar but free their memory.

## Features

- Closes regular tabs after a configurable delay (1 minute to 24 hours, or custom).
- Puts pinned tabs, essentials and folder tabs to sleep (`tabs.discard()`), never closes them.
- Never touches the active tab, tabs playing audio, or internal pages.
- Works across all Zen workspaces.
- Domain exclusions.
- Archive of recently closed tabs, restorable from the popup.
- Settings apply immediately; no data leaves the browser.

## Behaviour

| Tab type | Action after the delay |
|---|---|
| Regular tab | Closed (and archived) |
| Pinned, essential, or in a folder | Put to sleep |
| Active tab | Untouched |
| Tab playing audio | Untouched |
| Excluded domain | Untouched |

The delay starts when you leave a tab, not when you open it.

## Safety

The extension is designed so that a mistake cannot wipe out your session:

- The clock is paused while the browser is closed or the computer is asleep, so a restart never makes every tab expire at once.
- Nothing is processed for 30 seconds after startup, to let session restore finish.
- At most 5 tabs are closed per cycle, oldest first.
- The last tab of a window is never closed.
- Each tab is re-checked just before closing; a tab you just switched to is spared.
- Closed tabs are kept in the popup's Archive (last 100) and can be reopened with one click.

## Installation

From Firefox Add-ons: install the extension from addons.mozilla.org and click its toolbar icon to configure it.

From source:

1. Clone this repository.
2. Open `about:debugging`, choose "This Firefox" (or "This Zen").
3. Click "Load Temporary Add-on..." and select `manifest.json`.

## Configuration

Open the popup from the toolbar icon:

- **Delay**: time before a tab is closed or put to sleep.
- **Sleep protected tabs**: sleep pinned, essential and folder tabs instead of leaving them untouched.
- **Protect audio tabs**: skip tabs that are playing sound.
- **Excluded domains**: one per line; subdomains are included.
- **Process now**: run a cleanup cycle immediately.

## How it works

1. Each tab carries a `lastActiveAt` timestamp, updated when you leave it.
2. An alarm runs every minute and evaluates all tracked tabs.
3. Eligible regular tabs are archived and closed; eligible protected tabs are discarded.
4. Timestamps are persisted in `storage.local` and recovered by URL after a restart, since tab IDs change.

### Zen Browser notes

- Tabs in inactive workspaces are hidden. They are tracked through events and verified with `tabs.get()` rather than assumed closed.
- Essentials are pinned tabs under the hood, so they are protected automatically.
- Zen folders are tab groups. Tabs with a `groupId` are treated like pinned tabs (requires Firefox 139+ APIs).

## Technical details

- Manifest V2, Firefox 109+.
- Persistent background script; permissions: `tabs`, `storage`, `alarms`.
- No network requests, no telemetry, no access to page content.

## Version history

- **5.3**: Clock pause while browser is closed or asleep, delay counted from when a tab is left, folder tabs slept rather than closed, 5-closes-per-cycle cap, restorable archive, lighter event handling.
- **5.2**: Zen compatibility fix, auto-save, live statistics, safety cap.
- **5.0**: Rewrite around `tabs.discard()`, global processing, domain exclusions.

## License

MIT
