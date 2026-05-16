# FFTabClose V5.2

## 🚀 Auto-Close Tabs Extension for Firefox & Zen Browser

Automatically close old tabs after a configurable time — like **Arc Browser**. Pinned tabs and essentials are safely put to sleep instead of being closed. Works across **all workspaces** in Zen Browser.

### ✨ Features

- 🗑️ **Auto-close normal tabs** after a configurable delay (1 min → 24h)
- 💤 **Sleep pinned/essential tabs** — unloaded from memory but stay in your tab bar
- 🛡️ **Never touch active or audio tabs** — your current tab is always safe
- 🌐 **All workspaces** — works across every Zen Browser workspace
- ⏱️ **Persistent timers** — survive browser restarts and sleep/wake
- 🚫 **Domain exclusions** — exclude specific sites from auto-closing
- 📊 **Live statistics** — see tab counts update in real-time
- ⚡ **Auto-save settings** — every change applies instantly

### 🎯 Arc Browser Behavior

| Tab type | What happens |
|---|---|
| Normal tabs | **Closed** after the configured delay |
| Pinned / Essentials | **Put to sleep** (discarded from memory, stay visible) |
| Active tab | **Never touched** |
| Tabs playing audio | **Never touched** |

### 📦 Installation

**From Firefox Add-ons:**
1. Install from [addons.mozilla.org](https://addons.mozilla.org)
2. Click the FFTabClose icon in the toolbar to configure

**From source (development):**
1. Clone this repo
2. Go to `about:debugging` → "This Firefox" / "This Zen"
3. Click "Load Temporary Add-on..." → select `manifest.json`

### ⚙️ Configuration

Click the extension icon to configure:

- **Timer**: 1 min (test) to 24 hours, or custom
- **Sleep pinned tabs**: Discard pinned/essential tabs instead of closing
- **Protect audio tabs**: Never touch tabs playing sound
- **Domain exclusions**: Sites to never close (one per line)
- **Force process**: Immediately run a cleanup cycle

### 🧠 How It Works

1. Every tab gets a `lastActiveAt` timestamp when you visit it
2. A background alarm runs every minute to check for old tabs
3. Tabs older than the configured delay are processed:
   - **Normal tabs** → closed
   - **Pinned tabs** → discarded (unloaded from memory)
4. Active tabs, audio tabs, and excluded domains are always protected
5. Safety: max 3 tabs closed per cycle if >50% would be affected

### 🟣 Zen Browser Compatibility

FFTabClose is specifically optimized for Zen Browser:

- **Cross-workspace**: Tracks tabs across ALL workspaces via events, since `browser.tabs.query()` only returns the active workspace
- **Essentials = Pinned**: Zen's essential tabs are pinned tabs under the hood — they're automatically protected
- **Hidden tabs**: Tabs in inactive workspaces are verified with `browser.tabs.get()` instead of being deleted
- **Auto-detection**: Extension detects Zen Browser automatically

### 🔧 Technical Details

- **Manifest V2** — compatible with Firefox 109+ and Zen Browser
- **Persistent background script** — timers survive restarts
- **`browser.tabs.discard()`** — native Firefox API for clean memory unloading
- **`browser.alarms`** — reliable timer that works through sleep/wake
- **URL-based timer recovery** — timestamps survive browser restarts even when tab IDs change
- **No data collection** — everything stays local, no network requests

### 🛡️ Privacy

- **No data collected** — zero telemetry, zero analytics
- **No network requests** — works entirely offline
- **No tab content access** — only uses metadata (title, URL)
- **Open source** — all code available for review

### 📈 Version History

- **V5.2**: Zen Browser compatibility fix, toggle fix, auto-save, live stats, safety cap
- **V5.0**: Complete rewrite — `browser.tabs.discard()`, global processing, domain exclusions
- **V4.x**: Legacy (broken sleep mechanism, single workspace)

### 📄 License

MIT License

---

**Compatible with Firefox & Zen Browser 🎉**