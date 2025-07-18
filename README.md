# FFTabClose - Auto Tab Closer

<div align="center">

![FFTabClose Logo](icons/icon-128.svg)

**Automatically close or discard idle tabs after a configurable time period**

[![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white)](https://addons.mozilla.org/fr/firefox/addon/fftabclose-auto-tab-closer/)
[![Zen Browser](https://img.shields.io/badge/Zen-Browser-blue?style=for-the-badge)](https://zen-browser.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-3.0.0-green.svg?style=for-the-badge)](https://github.com/nthnbch/FFTabClose/releases)

> I created FFTabClose to bring an Arc Browser-like feature to Firefox and Zen Browser - automatic tab cleanup. As someone who accumulates dozens of tabs throughout the day, I needed a way to automatically close or unload unused tabs while preserving important ones. This extension saves memory and keeps your browser tidy without manual management.

</div>

## 🌟 Features

- **⏱️ Automatic Tab Management**: Configurable timer (1 minute to 48 hours)
- **📌 Smart Tab Protection**: Handles pinned tabs intelligently by discarding them instead of closing
- **🔊 Media-Aware**: Tabs playing audio are never closed
- **🖥️ Cross-Workspace Support**: Works across all browser windows, containers, and workspaces
- **🌐 Domain Rules**: Custom settings for specific websites
- **💤 Tab Discarding**: Unload pinned tabs from memory while keeping them visible
- **💾 Persistent Settings**: Your preferences and tab timers are saved between browser sessions
- **📊 Real-time Stats**: Compact, optimized stats showing total tabs, eligible tabs, and oldest tab age
- **🌍 Multi-language**: 12+ languages covering global Firefox users
- **🎨 Adaptive Design**: Clean interface with automatic dark mode support
- **♿ Accessibility**: Enhanced keyboard navigation and screen reader support
- **🔒 Privacy-focused**: No data collection, works completely offline

## 🚀 Installation

### Firefox Add-ons Store (Recommended)
1. Go to the [FFTabClose Firefox Add-on page](https://addons.mozilla.org/fr/firefox/addon/fftabclose-auto-tab-closer/)
2. Click "Add to Firefox"
3. Follow the prompts to complete installation

### Zen Browser
FFTabClose is compatible with Zen Browser and can be installed through Firefox add-on compatibility.

### Manual Installation (Developer)
1. Download the latest [release](https://github.com/nthnbch/FFTabClose/releases)
2. Open Firefox/Zen Browser
3. Navigate to `about:debugging` (Firefox) 
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select the downloaded `.xpi` file

### Build from Source
```bash
git clone https://github.com/nthnbch/FFTabClose.git
cd FFTabClose
# Using npm (recommended)
npm install
npm run build
# The XPI file will be created in the dist/ folder

# OR manually with zip
zip -r -FS ../fftabclose.xpi manifest.json background.js browser-polyfill.min.js popup/ info/ icons/ _locales/ --exclude '*.DS_Store'
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

1. **Current Active Tab**: Always protected in all windows
2. **Audio/Video Tabs**: Always protected (never closed)
3. **Pinned Tabs**: Always discarded instead of closed
4. **Multi-Window Aware**: Identifies and protects active tabs in each window
5. **Container/Workspace Support**: Works with Firefox containers and Zen workspaces
6. **Regular Tabs**: Closed if older than the selected time limit

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
- **1 minute** - Testing mode (quick cleanup)
- **15 minutes** - Quick cleanup
- **30 minutes** - Short sessions
- **1-2 hours** - Work sessions
- **4-8 hours** - Extended work periods
- **12 hours** - Daily cleanup (default)
- **24 hours** - Long-term projects
- **48 hours** - Extended projects

### Tab Protection Behavior
- **Pinned Tabs**: Automatically discarded instead of closed to save memory
- **Audio Tabs**: Always protected from closing when playing sound
- **Active Tabs**: Always protected in all windows and workspaces
- **Domain Rules**: Custom settings by website domain (new in v3.0)

### Manual Actions
- **Real-time Stats**: Compact display showing total tabs, eligible tabs, and oldest tab age
- **Domain Rules Management**: Add, edit, and remove domain-specific rules

## 🔧 Technical Details

### Permissions Required
- `tabs` - Read tab information, close and discard tabs
- `storage` - Save user preferences and tab timestamps
- `alarms` - Schedule periodic tab checks
- `contextualIdentities` - Support for Firefox containers
- `cookies` - Required for container integration (to access tabs in different containers)

### Browser Compatibility
- **Firefox**: 109.0+
- **Zen Browser**: All versions
- **LibreWolf**: Compatible
- **Manifest**: V3 (Current Firefox standard)

### Architecture
- **Background Script**: Monitoring, tab management, and settings
- **Popup Interface**: User settings and manual controls
- **Storage**: Local preferences with persistence
- **i18n**: Full internationalization support

## 🌍 Supported Languages

FFTabClose v2.0 includes translations for 12 languages covering global Firefox users:

| Language | Code | Region |
|----------|------|--------|
| English | `en` | Global (Default) |
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
├── manifest.json           # Extension manifest (V3)
├── background.js           # Main background script
├── domain-rules.js         # Domain rules management
├── browser-polyfill.min.js # Browser compatibility layer
├── package.json            # Project metadata and build scripts
├── build.sh                # Build script for creating XPI package
├── popup/                  # User interface
│   ├── popup.html          # Popup HTML
│   ├── popup.js            # Popup logic
│   ├── popup.css           # Popup styles
│   ├── domain-rule-dialog.html # Domain rule dialog
│   ├── domain-rule-dialog.js   # Domain rule dialog logic
│   └── domain-rules-ui.js      # Domain rules UI management
├── info/                   # Information page
│   ├── info.html           # Help and about page
│   ├── info.js             # Info page script
│   └── info.css            # Info page styles
├── icons/                  # Extension icons
│   ├── icon-16.svg
│   ├── icon-32.svg
│   ├── icon-48.svg
│   ├── icon-128.svg
│   └── png/                # PNG versions of icons
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
└── _locales/               # Internationalization
    ├── en/messages.json    # English (default)
    ├── fr/messages.json    # French
    ├── es/messages.json    # Spanish
    ├── de/messages.json    # German
    ├── it/messages.json    # Italian
    ├── ja/messages.json    # Japanese
    ├── zh_CN/messages.json # Chinese (Simplified)
    ├── pt/messages.json    # Portuguese
    ├── ru/messages.json    # Russian
    ├── nl/messages.json    # Dutch
    ├── pl/messages.json    # Polish
    ├── ar/messages.json    # Arabic
    └── tr/messages.json    # Turkish
    └── tr/messages.json    # Turkish
```

## 📋 Contributing

Contributions are welcome! Please follow these guidelines:

### Adding a New Language
1. Copy `_locales/en/messages.json` to `_locales/[language_code]/messages.json`
2. Translate all message values (keep description and placeholders unchanged)
3. Submit a pull request to the GitHub repository

### Reporting Bugs
Please [file an issue on GitHub](https://github.com/nthnbch/FFTabClose/issues) with:
1. Browser name and version
2. Extension version
3. Steps to reproduce the issue
4. Expected vs. actual behavior
5. Any relevant console logs (if available)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 Security Features (v3.0.0)

With version 3.0.0, we've enhanced our security features and updated to Manifest V3:

1. **Manifest V3 Update**: Updated to the latest extension manifest format for improved security
2. **Content Security Policy (CSP)**: Strict CSP headers to prevent code injection attacks
3. **Data Sanitization**: Robust DOM-based HTML sanitization to protect against XSS vulnerabilities
4. **Input Validation**: Thorough validation of all user inputs and extension messages
5. **Secure Messaging**: Verified message origin and content structure for inter-script communication
6. **Sensitive Data Protection**: Enhanced logging with comprehensive data redaction
7. **Error Recovery**: Improved error handling with graceful degradation
8. **Link Security**: All links use proper rel="noopener noreferrer" attributes
9. **Content Security Headers**: Implementation of X-XSS-Protection and X-Content-Type-Options
10. **Accessibility**: Enhanced keyboard navigation and screen reader support
11. **Update Changelog**: Detailed version tracking for all security and feature changes

These improvements strictly follow Mozilla's security guidelines and modern web security best practices, ensuring your browsing data remains secure while using FFTabClose.

## 🔒 Privacy

FFTabClose is fully committed to your privacy:
- No data is collected or transmitted outside your browser
- All processing happens locally in your browser
- No remote resources are loaded or required
- No analytics or tracking of any kind
- No cookies used except for technical container support

## 🙏 Acknowledgements

- All contributors to the FFTabClose project
- The Firefox and Zen Browser extension communities
- Users who provided valuable feedback and suggestions
- Firefox container feature developers

---

Made with ❤️ by [bubu](https://nathan.swiss) © 2025
