# FFTabClose - Auto Tab Closer

<div align="center">

![FFTabClose Logo](icons/icon-128.svg)

**Automatically close non-pinned tabs after a configurable time period**

[![Firefox](https://img.shields.io/badge/Firefox-FF7139?style=for-the-badge&logo=Firefox-Browser&logoColor=white)](https://addons.mozilla.org/)
[![Zen Browser](https://img.shields.io/badge/Zen-Browser-blue?style=for-the-badge)](https://zen-browser.app/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

</div>

## 🌟 Features

- **🕒 Automatic Tab Closure**: Configurable timer (15 minutes to 48 hours)
- **📌 Smart Exclusions**: Never closes pinned tabs or tabs with audio
- **🎯 One-Click Action**: Manually close old tabs anytime
- **📊 Real-time Stats**: Monitor total tabs, eligible tabs, and oldest tab age
- **🌍 Multi-language**: English, French, Spanish, German support
- **🎨 Modern UI**: Beautiful, responsive interface with dark mode
- **🔒 Privacy-focused**: No data collection, works offline
- **⚡ Lightweight**: Minimal memory footprint

## 📸 Screenshots

| Light Mode | Dark Mode |
|------------|-----------|
| ![Light Mode](docs/screenshot-light.png) | ![Dark Mode](docs/screenshot-dark.png) |

## 🚀 Installation

### Firefox Add-ons Store (Recommended)
*Coming soon - under review*

### Manual Installation (Development)
1. Download the latest [release](https://github.com/your-username/FFTabClose/releases)
2. Open Firefox/Zen Browser
3. Navigate to `about:debugging`
4. Click "This Firefox"
5. Click "Load Temporary Add-on"
6. Select the downloaded `.xpi` file

### Build from Source
```bash
git clone https://github.com/your-username/FFTabClose.git
cd FFTabClose
chmod +x build.sh
./build.sh
```

## 🎛️ Configuration

### Time Settings
- **15 minutes** - Quick cleanup for active browsing
- **30 minutes** - Short sessions
- **1-2 hours** - Work sessions
- **4-8 hours** - Extended work periods
- **12 hours** - Default, daily cleanup
- **24-48 hours** - Long-term projects

### Exclusions
- **Pinned Tabs**: Always excluded (recommended)
- **Audio Tabs**: Tabs playing sound (recommended)

### Manual Actions
- **Close Old Tabs Now**: Immediate cleanup based on current settings
- **Real-time Stats**: Monitor tab counts and oldest tab age

## 🔧 Technical Details

### Permissions Required
- `tabs` - Read tab information and close tabs
- `storage` - Save user preferences
- `alarms` - Schedule automatic checks

### Browser Compatibility
- **Firefox**: 109.0+
- **Zen Browser**: All versions
- **Manifest**: V2 (Firefox standard)

### Architecture
- **Background Script**: Persistent monitoring and cleanup
- **Popup Interface**: User settings and manual controls
- **Storage**: Local preferences with sync capability
- **i18n**: Full internationalization support

## 🌍 Internationalization

FFTabClose supports multiple languages:

| Language | Code | Status |
|----------|------|--------|
| English | `en` | ✅ Complete |
| French | `fr` | ✅ Complete |
| Spanish | `es` | ✅ Complete |
| German | `de` | ✅ Complete |

Want to add your language? See [Contributing](#contributing).

## 🛠️ Development

### Prerequisites
- Node.js (optional, for development tools)
- Git
- Firefox/Zen Browser for testing

### Setup
```bash
# Clone repository
git clone https://github.com/your-username/FFTabClose.git
cd FFTabClose

# Install development dependencies (optional)
npm install

# Build extension
./build.sh

# Validate build
./validate.sh
```

### Project Structure
```
FFTabClose/
├── manifest.json          # Extension manifest
├── background.js          # Background service worker
├── popup.html            # Popup interface
├── popup.js              # Popup logic
├── popup.css             # Popup styles
├── icons/                # Extension icons
├── _locales/             # Internationalization
│   ├── en/messages.json
│   ├── fr/messages.json
│   ├── es/messages.json
│   └── de/messages.json
├── build/                # Build output
├── dist/                 # Distribution packages
├── build.sh              # Build script
├── validate.sh           # Validation script
└── docs/                 # Documentation
```

### Testing
1. Load the extension in Firefox (`about:debugging`)
2. Open multiple tabs
3. Wait for configured time period
4. Verify tabs are closed according to settings
5. Test manual actions and settings changes

## 📋 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Bug Reports
1. Check existing [issues](https://github.com/your-username/FFTabClose/issues)
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser version and OS

### 🌟 Feature Requests
1. Check existing [feature requests](https://github.com/your-username/FFTabClose/issues?q=is%3Aissue+label%3Aenhancement)
2. Create a new issue with:
   - Clear use case
   - Detailed description
   - Benefits and potential drawbacks

### 🔨 Code Contributions
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Test thoroughly
5. Commit with clear messages: `git commit -m 'Add amazing feature'`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Open a Pull Request

### 🌍 Translations
1. Copy `_locales/en/messages.json`
2. Create new folder: `_locales/[language-code]/`
3. Translate all strings
4. Test with your browser language
5. Submit a Pull Request

### Code Style
- Use modern JavaScript (ES6+)
- Follow existing code patterns
- Add comments for complex logic
- Test all changes thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icon design inspired by modern browser interfaces
- Built with Firefox WebExtensions API
- Thanks to the open-source community for feedback and contributions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/FFTabClose/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/FFTabClose/discussions)
- **Email**: support@example.com

---

<div align="center">

Made with ❤️ by the FFTabClose team

[⭐ Star us on GitHub](https://github.com/your-username/FFTabClose) • [🐛 Report a Bug](https://github.com/your-username/FFTabClose/issues) • [💡 Request Feature](https://github.com/your-username/FFTabClose/issues)

</div>
