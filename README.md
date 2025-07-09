# FFTabClose - Auto Tab Closer

<div align="center">

![FFTabClose Logo](icons/icon-128.svg)

**Automatically close or discard idle tabs after a configurable time period**

[![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white)](https://addons.mozilla.org/)
[![Zen Browser](https://img.shields.io/badge/Zen-Browser-blue?style=for-the-badge)](https://zen-browser.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

## 🌟 Features

- **⏱️ Automatic Tab Management**: Configurable timer (15 minutes to 48 hours)
- **📌 Smart Tab Protection**: Handles pinned and essential tabs intelligently
- **🔊 Media-Aware**: Option to protect tabs playing audio/video
- **💤 Tab Discarding**: Option to discard (unload) pinned tabs instead of closing them
- **💾 Persistent Settings**: Your preferences and tab timers are saved between browser sessions
- **🔄 Manual Control**: Close old tabs anytime with one click
- **📊 Real-time Stats**: Monitor total tabs, eligible tabs, and oldest tab age
- **🌍 Multi-language**: 10 languages covering global Firefox users
- **🎨 Adaptive Design**: Clean interface with automatic dark mode support
- **🔒 Privacy-focused**: No data collection, works completely offline

## 🚀 Installation

### Firefox Add-ons Store (Recommended)
*Coming soon - under review*

### Manual Installation (Temporary)
1. Download the latest [release](https://github.com/bubu/FFTabClose/releases)
2. Open Firefox/Zen Browser
3. Navigate to `about:debugging` (Firefox) or equivalent in Zen Browser
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select the downloaded `.xpi` file

### Build from Source
```bash
git clone https://github.com/bubu/FFTabClose.git
cd FFTabClose
chmod +x build.sh
./build.sh
```

## 📖 How It Works

### ⏰ Timer System
FFTabClose keeps track of when each tab was last active:

- **Tab Creation**: New tabs get a timestamp when created
- **Tab Interaction**: Timestamp updates when you interact with a tab
- **Persistence**: Timestamps survive browser restarts
- **Regular Checks**: The extension periodically checks for old tabs

### 🔄 Tab Processing Logic

For each tab, the extension follows these rules:

1. **Current Active Tab**: Always protected
2. **Audio/Video Tabs**: Protected if option enabled
3. **Pinned Tabs**: Either protected or discarded (based on settings)
4. **Essential Tabs**: Protected (Zen Browser spaces/workspaces)
5. **Regular Tabs**: Closed if older than the selected time limit

### 💤 Tab Discarding vs Closing

| Action | What Happens | Memory | Tab Visibility | Data Loss |
|--------|--------------|--------|----------------|-----------|
| **Close** | Tab removed completely | ✅ Freed | ❌ Gone | ⚠️ Possible |
| **Discard** | Tab unloaded from memory | ✅ Freed | ✅ Stays visible | ✅ None |

**Benefits of Discarding:**
- 🧠 **Memory Efficient**: Frees up RAM by unloading content
- 👀 **Tab Persistence**: Tab stays in your tab bar with title/favicon  
- 🔄 **Automatic Reload**: Page reloads when you click the tab
- 📌 **Ideal for Pinned Tabs**: Keep important tabs visible without memory cost

## 🎛️ Configuration Options

### Time Settings
Choose how long tabs should remain open when inactive:
- **15 minutes** - Quick cleanup
- **30 minutes** - Short sessions
- **1-2 hours** - Work sessions
- **4-8 hours** - Extended work periods
- **12 hours** - Daily cleanup
- **24-48 hours** - Long-term projects

### Tab Protection Options
- **Discard Pinned Tabs**: Unload pinned tabs from memory instead of closing
- **Exclude Audio Tabs**: Prevent tabs playing audio from being closed

### Manual Actions
- **Close Old Tabs Now**: Immediate cleanup based on current settings
- **Real-time Stats**: Monitor tab counts and oldest tab age

## 🔧 Technical Details

### Permissions Required
- `tabs` - Read tab information, close and discard tabs
- `storage` - Save user preferences
- `alarms` - Schedule periodic tab checks

### Browser Compatibility
- **Firefox**: 109.0+
- **Zen Browser**: All versions
- **Manifest**: V2 (Firefox standard)

### Architecture
- **Background Script**: Monitoring, tab management, and settings
- **Popup Interface**: User settings and manual controls
- **Storage**: Local preferences with persistence
- **i18n**: Full internationalization support

## 🌍 Supported Languages

FFTabClose v2.0 includes translations for 10 languages covering global Firefox users:

| Language | Code | Region |
|----------|------|--------|
| English | `en` | Global |
| French | `fr` | Europe/Americas |
| Spanish | `es` | Europe/Americas |
| German | `de` | Europe |
| Italian | `it` | Europe |
| Portuguese | `pt` | Europe/Americas |
| Russian | `ru` | Europe/Asia |
| Japanese | `ja` | Asia |
| Chinese (Simplified) | `zh_CN` | Asia |
| Polish | `pl` | Europe |
| Dutch | `nl` | Europe |
| Arabic | `ar` | MENA |
| Turkish | `tr` | Europe/Asia |

The extension automatically detects your browser's language.

## 🛠️ Project Structure

```
FFTabClose/
├── manifest.json         # Extension manifest
├── background.js         # Background script
├── popup/                # User interface
│   ├── popup.html        # Popup HTML
│   ├── popup.js          # Popup logic
│   └── popup.css         # Popup styles
├── info/                 # Information page
│   └── info.html         # Help and about page
├── icons/                # Extension icons
│   ├── icon-16.svg
│   ├── icon-32.svg
│   ├── icon-48.svg
│   └── icon-128.svg
├── _locales/             # Internationalization
│   ├── en/messages.json  # English (default)
│   ├── fr/messages.json  # French
│   ├── es/messages.json  # Spanish
│   └── ... (other languages)
└── build/                # Build output
```

## 📋 Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Adding a New Language
1. Copy `_locales/en/messages.json` to `_locales/[language_code]/messages.json`
2. Translate all message values (keep description and placeholders unchanged)
3. Submit a pull request

### Reporting Bugs
Please file an issue on GitHub with:
1. Browser version
2. Extension version
3. Steps to reproduce
4. Expected vs. actual behavior

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔒 Privacy

FFTabClose respects your privacy:
- No data is collected or transmitted
- All processing happens locally in your browser
- No remote resources are loaded
- No analytics or tracking

## 🙏 Acknowledgements

- All contributors to the FFTabClose project
- The Firefox and Zen Browser extension communities
- Users who provided feedback and suggestions

---

<div align="center">
Made with ❤️ for a cleaner browsing experience
</div>
