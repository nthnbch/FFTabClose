# Source Code Submission for Mozilla Add-ons Review

## 📦 **IMPORTANT: This extension requires NO source code submission**

According to Mozilla's [Source Code Submission guidelines](https://extensionworkshop.com/documentation/publish/source-code-submission/), source code submission is only required when:

- ❌ Code minifiers (uglifyJS, Google Closure Compiler) - **NOT USED**
- ❌ Bundling tools (browserify, webpack) - **NOT USED**  
- ❌ Template engines (handlebars, css2js) - **NOT USED**
- ❌ Custom pre-processing tools - **NOT USED**

## ✅ **FFTabClose Uses NO Build Process**

This extension is built with:
- ✅ **Vanilla JavaScript** - No transpilation needed
- ✅ **Plain HTML/CSS** - No preprocessing
- ✅ **Static JSON** - No generation or templating
- ✅ **SVG Icons** - No compilation needed
- ✅ **Manual file copying** - Simple build script

## 📋 **If Source Code Is Still Required**

Despite not needing source code submission, if Mozilla requests it, here's what to provide:

### 1. Source Code Package Contents
Create a ZIP file containing:
```
FFTabClose-source.zip
├── README-BUILD.md           # This file
├── install.sh               # Installation script  
├── build.sh                 # Build script
├── manifest.json            # Extension manifest
├── background.js            # Background script
├── popup.html              # Popup interface
├── popup.css               # Popup styles  
├── popup.js                # Popup logic
├── icons/                  # Extension icons
│   ├── icon-16.svg
│   ├── icon-32.svg
│   ├── icon-48.svg
│   └── icon-128.svg
├── _locales/               # Internationalization
│   ├── en/messages.json    # English (default)
│   ├── fr/messages.json    # French
│   ├── es/messages.json    # Spanish
│   ├── de/messages.json    # German
│   ├── it/messages.json    # Italian
│   ├── pt/messages.json    # Portuguese
│   ├── ru/messages.json    # Russian
│   ├── ja/messages.json    # Japanese
│   ├── zh_CN/messages.json # Chinese Simplified
│   ├── pl/messages.json    # Polish
│   ├── ar/messages.json    # Arabic
│   ├── tr/messages.json    # Turkish
│   ├── ko/messages.json    # Korean
│   ├── nl/messages.json    # Dutch
│   └── id/messages.json    # Indonesian
├── LICENSE                 # MIT License
└── README.md              # Project documentation
```

### 2. Build Instructions for Mozilla Reviewers

#### System Requirements
- **OS**: Ubuntu 24.04 LTS (Mozilla default reviewer environment)
- **RAM**: 10GB (only ~50MB needed for this build)
- **CPU**: 6 cores (only 1 core needed for this build)
- **Disk**: 35GB free (only ~5MB needed for this build)
- **Tools**: bash, zip, git (standard system tools)

#### Build Commands
```bash
# 1. Extract source code
unzip FFTabClose-source.zip
cd FFTabClose

# 2. Run installation script (validates environment)
chmod +x install.sh
./install.sh

# 3. Build extension
chmod +x build.sh  
./build.sh

# 4. Verify output
ls -la dist/fftabclose-v1.0.0.xpi
unzip -l dist/fftabclose-v1.0.0.xpi
```

#### Expected Build Output
- **Package**: `dist/fftabclose-v1.0.0.xpi`
- **Size**: ~50KB
- **Files**: Exactly 55 files
- **Build time**: <10 seconds
- **No differences** between source and built files (simple copy)

### 3. Build Verification

#### File Integrity Check
```bash
# All source files should be identical to built files
diff -r . build/ --exclude=build --exclude=dist --exclude=.git

# Should output: NO differences (exit code 0)
```

#### Package Contents Verification
```bash
unzip -l dist/fftabclose-v1.0.0.xpi
# Should show exactly these files:
# - manifest.json
# - background.js  
# - popup.html, popup.css, popup.js
# - icons/ (4 SVG files)
# - _locales/ (15 directories with messages.json)
# - README.md
```

### 4. Security & Compliance Notes

#### Code Transparency
- ✅ **Human-readable**: All JavaScript is plain ES6+
- ✅ **No obfuscation**: Zero code transformation
- ✅ **No minification**: Variable names preserved
- ✅ **No bundling**: Each file serves one purpose
- ✅ **Static content**: No dynamic code generation

#### Privacy Compliance  
- ✅ **Local-only**: No network requests made
- ✅ **No tracking**: Zero analytics or telemetry
- ✅ **Minimal data**: Only tab timestamps stored locally
- ✅ **No external dependencies**: Self-contained extension

#### Open Source Tools Only
- ✅ **bash**: Standard Unix shell
- ✅ **zip**: Standard archiving utility
- ✅ **git**: Open source version control
- ❌ **No commercial tools** used

### 5. Contact Information

If reviewers have questions about the build process:

- **GitHub**: https://github.com/nthnbch/FFTabClose
- **Issues**: https://github.com/nthnbch/FFTabClose/issues
- **Developer**: bubu (nathan.swiss)

### 6. Final Notes for Mozilla Reviewers

This extension represents the **simplest possible Firefox extension**:
- No build complexity
- No external dependencies  
- No code transformation
- Direct file-to-file mapping between source and output

The "build process" is essentially just copying files to a staging directory and creating a ZIP archive. There should be **zero differences** between source files and the extension package contents.

---

**Extension Version**: 1.0.0  
**Submission Date**: January 2025  
**Build Complexity**: Minimal (file copy + zip)  
**Review Difficulty**: Low (vanilla JavaScript, no obfuscation)
