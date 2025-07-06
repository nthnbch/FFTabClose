# Contributing to FFTabClose

Thank you for your interest in contributing to FFTabClose! 🎉

## Quick Start

### 🐛 Found a Bug?
1. [Search existing issues](https://github.com/your-username/FFTabClose/issues)
2. If not found, [create a new issue](https://github.com/your-username/FFTabClose/issues/new)
3. Include: browser version, steps to reproduce, expected vs actual behavior

### 💡 Have an Idea?
1. [Check feature requests](https://github.com/your-username/FFTabClose/issues?q=label%3Aenhancement)
2. [Create a new feature request](https://github.com/your-username/FFTabClose/issues/new)
3. Describe: use case, benefits, implementation ideas

### 🔨 Want to Code?

#### Quick Setup
```bash
git clone https://github.com/your-username/FFTabClose.git
cd FFTabClose
./build.sh
```

#### Testing
1. Open Firefox → `about:debugging`
2. Click "Load Temporary Add-on"
3. Select `dist/fftabclose-v1.0.0.xpi`

#### Making Changes
1. Fork the repo
2. Create branch: `git checkout -b feature/your-feature`
3. Make changes
4. Test thoroughly
5. Commit: `git commit -m "Add your feature"`
6. Push: `git push origin feature/your-feature`
7. Create Pull Request

### 🌍 Add Translation

#### New Language
1. Copy `_locales/en/messages.json`
2. Create `_locales/[your-language]/messages.json`
3. Translate all strings
4. Test with your browser language
5. Submit PR

#### Supported Languages
- ✅ English (`en`)
- ✅ French (`fr`) 
- ✅ Spanish (`es`)
- ✅ German (`de`)
- 🚧 Your language here!

## Code Guidelines

### JavaScript
- Use modern ES6+ syntax
- Add JSDoc comments for functions
- Handle errors gracefully
- Test with console.log, then remove

### CSS
- Use CSS custom properties
- Support both light/dark modes
- Keep responsive design
- Follow existing naming conventions

### Commits
- Use clear, descriptive messages
- Start with verb: "Add", "Fix", "Update", "Remove"
- Reference issues: "Fixes #123"

## Project Structure

```
src/
├── manifest.json     # Extension config
├── background.js     # Background logic
├── popup.html        # UI structure  
├── popup.js          # UI logic
├── popup.css         # UI styles
├── icons/            # Extension icons
└── _locales/         # Translations
    ├── en/messages.json
    ├── fr/messages.json
    └── ...
```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Settings save/load correctly
- [ ] Tabs close at configured time
- [ ] Pinned tabs are excluded
- [ ] Audio tabs are excluded (if enabled)
- [ ] Manual "close now" works
- [ ] Stats update correctly
- [ ] UI works in light/dark mode
- [ ] All languages display correctly

## Need Help?

- 💬 [GitHub Discussions](https://github.com/your-username/FFTabClose/discussions)
- 📧 Email: contribute@example.com
- 📖 [Full Documentation](README.md)

## Recognition

All contributors will be:
- Listed in README.md
- Tagged in release notes  
- Given contributor badge

---

**Ready to contribute?** [Start with a good first issue](https://github.com/your-username/FFTabClose/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) 🚀
