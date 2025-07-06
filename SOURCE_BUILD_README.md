# FFTabClose - Source Code Build Instructions for Mozilla Add-ons Review

## 📋 Overview

This document provides complete step-by-step instructions to build FFTabClose extension from source code for Mozilla Add-ons Store review. **This extension uses NO minification, bundling, or obfuscation** - it's built with vanilla JavaScript, HTML, and CSS only.

## 🖥️ System Requirements

### Operating System
- **Ubuntu 24.04 LTS** (Mozilla reviewer default environment)
- **macOS** (primary development environment)
- **Linux** (Ubuntu 18.04+ or equivalent)  
- **Windows** (Windows 10+ with WSL recommended)

### Required Software

#### Core Requirements (Minimal)
- **Bash shell** (version 4.0+)
- **zip utility** (for packaging)
- **Git** (for repository cloning)

#### Optional Tools (Not Required for Build)
- **jq** (for JSON validation only)
- **Node.js** (not used in build process, available if needed)

### ⚠️ Important Note
**This extension requires NO build process dependencies**:
- ❌ No npm install needed
- ❌ No Node.js build step
- ❌ No webpack, browserify, or bundlers
- ❌ No minification or transpilation
- ❌ No third-party libraries

## 🚀 Automated Build Process

### Step 1: Install Prerequisites (Ubuntu 24.04 LTS)
```bash
# Update system
sudo apt update

# Install required tools (usually already available)
sudo apt install -y git zip bash

# Optional: Install jq for JSON validation
sudo apt install -y jq
```

### Step 2: Clone Repository
```bash
git clone https://github.com/nthnbch/FFTabClose.git
cd FFTabClose
```

### Step 3: Run Installation Script
```bash
# Make install script executable
chmod +x install.sh

# Run installation (creates build environment)
./install.sh
```

### Step 4: Run Build Script  
```bash
# Make build script executable
chmod +x build.sh

# Build extension
./build.sh
```

### Step 5: Verify Output
The built extension will be available at:
- **Package**: `dist/fftabclose-v1.0.0.xpi` (approximately 50KB)
- **Build directory**: `build/` (contains all source files)
- **File count**: Exactly 55 files

## 🚀 Quick Build (Automated)

### Step 1: Clone Repository
```bash
git clone https://github.com/nthnbch/FFTabClose.git
cd FFTabClose
```

### Step 2: Run Build Script
```bash
chmod +x build.sh
./build.sh
```

### Step 3: Locate Output
The built extension will be available at:
- **Package**: `dist/fftabclose-v1.0.0.xpi`
- **Build directory**: `build/`

## 🔧 Manual Build Instructions

### Step 1: Prepare Environment
```bash
# Ensure you're in the project directory
cd FFTabClose

# Create build directories
mkdir -p build
mkdir -p dist
```

### Step 2: Copy Source Files
```bash
# Copy core extension files
cp manifest.json build/
cp background.js build/
cp popup.html build/
cp popup.css build/
cp popup.js build/

# Copy icons
mkdir -p build/icons
cp icons/*.svg build/icons/

# Copy localization files
cp -r _locales build/

# Copy documentation (optional)
cp README.md build/
```

### Step 3: Validate Files (Optional)
```bash
# Validate JSON files if jq is available
if command -v jq &> /dev/null; then
    jq . manifest.json > /dev/null && echo "✅ manifest.json is valid"
    
    # Validate all messages.json files
    for file in _locales/*/messages.json; do
        jq . "$file" > /dev/null && echo "✅ $file is valid"
    done
fi
```

### Step 4: Create XPI Package
```bash
cd build
zip -r ../dist/fftabclose-v1.0.0.xpi . -x "*.DS_Store*" "*.git*"
cd ..
```

### Step 5: Verify Package
```bash
# Check package contents
unzip -l dist/fftabclose-v1.0.0.xpi

# Verify package size
ls -lh dist/fftabclose-v1.0.0.xpi
```

## 📁 Source Code Structure

```
FFTabClose/
├── manifest.json          # Extension manifest (Manifest V2)
├── background.js           # Background script logic
├── popup.html             # Popup interface HTML
├── popup.css              # Popup interface styles
├── popup.js               # Popup interface JavaScript
├── icons/                 # Extension icons
│   ├── icon-16.svg
│   ├── icon-32.svg
│   ├── icon-48.svg
│   └── icon-128.svg
├── _locales/              # Internationalization
│   ├── en/messages.json   # English (default)
│   ├── fr/messages.json   # French
│   ├── es/messages.json   # Spanish
│   ├── de/messages.json   # German
│   ├── it/messages.json   # Italian
│   ├── pt/messages.json   # Portuguese
│   ├── ru/messages.json   # Russian
│   ├── ja/messages.json   # Japanese
│   ├── zh_CN/messages.json # Chinese Simplified
│   ├── pl/messages.json   # Polish
│   ├── ar/messages.json   # Arabic
│   ├── tr/messages.json   # Turkish
│   ├── ko/messages.json   # Korean
│   ├── nl/messages.json   # Dutch
│   └── id/messages.json   # Indonesian
├── build.sh               # Automated build script
├── README.md              # Project documentation
├── PRIVACY_POLICY.md      # Privacy policy
└── LICENSE                # MIT License
```

## 🔍 Build Verification

### Expected Output Files
After successful build, verify these files exist in `build/`:

```
build/
├── manifest.json
├── background.js
├── popup.html
├── popup.css
├── popup.js
├── icons/
│   ├── icon-16.svg
│   ├── icon-32.svg
│   ├── icon-48.svg
│   └── icon-128.svg
├── _locales/
│   └── [15 language directories with messages.json]
└── README.md
```

### Package Validation
```bash
# Package should be approximately 50KB
# Should contain exactly 55 files
# No external dependencies or transpiled code
```

## 🛠️ Development Dependencies

### None Required
This extension is built using **vanilla JavaScript, HTML, and CSS** only:
- ✅ No Node.js build process
- ✅ No npm dependencies
- ✅ No webpack or bundlers
- ✅ No transpilation (ES6+ → ES5)
- ✅ No minification or obfuscation

### Why No Build Process?
- **Firefox Web Extensions API**: Native browser APIs used
- **Modern JavaScript**: ES6+ features supported natively in Firefox 109+
- **Vanilla CSS**: No preprocessors needed
- **Static JSON**: Localization files are standard JSON
- **SVG Icons**: Vector graphics, no compilation needed

## 🧪 Testing the Built Extension

### Install in Firefox
1. Open Firefox
2. Navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select `dist/fftabclose-v1.0.0.xpi`

### Verify Functionality
1. ✅ Extension icon appears in toolbar
2. ✅ Popup opens with interface
3. ✅ Settings can be changed and saved
4. ✅ Manual "close tabs now" works
5. ✅ Statistics display correctly
6. ✅ Internationalization works (change Firefox language)

## 🔒 Security Notes

### Code Transparency
- **No obfuscation**: All JavaScript is human-readable
- **No external resources**: Extension is completely self-contained
- **No remote code**: All code executes locally
- **Minimal permissions**: Only `tabs`, `storage`, and `alarms`

### Privacy Compliance
- **No data collection**: Extension doesn't transmit any data
- **Local storage only**: All data stays on user's device
- **No analytics**: No tracking or telemetry code

## 📞 Support

For build issues or questions:
- **GitHub Issues**: https://github.com/nthnbch/FFTabClose/issues
- **Documentation**: README.md in repository
- **Source Code**: All files are in plain text/JSON

---

**Build Date**: January 6, 2025  
**Extension Version**: 1.0.0  
**Target Platform**: Firefox 109+ / Zen Browser
