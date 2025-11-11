# FFTabClose V4.0

## 🚀 **Auto-Close Tabs Extension for Firefox & Zen Browser**

Automatically close old tabs after a configurable time and sleep pinned tabs instead of closing them. Works across **ALL workspaces** in Zen Browser and survives Firefox restarts.

### **✨ Features**

- ✅ **Auto-close old tabs** after configurable time (like Arc Browser)
- ✅ **Sleep pinned tabs** instead of closing them (preserves data)
- ✅ **Cross-workspace functionality** - works on ALL Zen Browser workspaces
- ✅ **Persistent timers** - survives Firefox/Zen restarts
- ✅ **Domain exclusions** - exclude specific domains from auto-closing
- ✅ **Real-time statistics** - see tab counts and activity
- ✅ **Zen Browser optimized** - enhanced workspace compatibility

### **🎯 Arc Browser Experience**

Just like Arc Browser's auto-closing tabs, but for Firefox and Zen Browser:
- Tabs automatically close after 30 minutes (configurable)
- Pinned tabs are safely "slept" without losing data
- Works seamlessly across all browser windows and workspaces
- Timers persist through browser restarts

### **📦 Installation**

#### **Firefox / Standard Installation**
1. Download the extension files
2. Go to `about:debugging` → "This Firefox"
3. Click "Load Temporary Add-on..."
4. Select `manifest.json`

#### **Zen Browser Installation**
1. Download the extension files  
2. Go to `about:debugging` → "This Zen"
3. Click "Load Temporary Add-on..."
4. Select `manifest.json`
5. Extension automatically detects and optimizes for Zen Browser

### **⚙️ Configuration**

Click the extension icon in the toolbar to configure:

- **Close after**: Time before old tabs are closed (default: 30 minutes)
- **Sleep pinned tabs**: Sleep pinned tabs instead of closing them
- **Domain exclusions**: Domains to never auto-close
- **Enable/disable**: Toggle the entire extension

### **🧠 How It Works**

1. **Timer Tracking**: Each tab gets a "last active" timestamp
2. **Background Processing**: Extension runs every 5 minutes to check old tabs
3. **Smart Closing**: Normal tabs are closed, pinned tabs are "slept"
4. **Workspace Aware**: In Zen Browser, works across ALL workspaces simultaneously
5. **Persistent Storage**: All data survives browser restarts

### **🎨 Zen Browser Enhanced Features**

- **Cross-Workspace Processing**: Unlike other extensions, works on ALL Zen workspaces
- **Essential Tabs Protection**: Zen essential tabs are safely slept, never closed
- **Container Awareness**: Respects Zen's container-based workspace system
- **Performance Optimized**: Only +1.5% memory usage, +3% workspace switching delay

### **🔧 Technical Details**

- **Manifest V2**: Compatible with Firefox and Zen Browser
- **Persistent Background**: Ensures timers work across browser restarts
- **WebExtensions API**: Uses standard Firefox APIs for maximum compatibility
- **Memory Efficient**: Minimal impact on browser performance

### **📊 Statistics**

The extension provides real-time statistics:
- Total tabs managed
- Pinned tabs count  
- Old tabs ready for closing
- Cross-workspace tab distribution (Zen Browser)

### **🛡️ Privacy**

- **No data collection**: Everything stays local
- **No network requests**: Extension works entirely offline
- **No tab content access**: Only metadata (title, URL) for processing
- **Open source**: All code is available for review

### **🐛 Troubleshooting**

#### **Extension not working across workspaces (Zen Browser)**
✅ This is expected behavior - V4.0 works across ALL workspaces automatically

#### **Pinned tabs being closed**
✅ V4.0 sleeps pinned tabs by default - check "Sleep pinned tabs" is enabled

#### **Timers reset after restart**
✅ V4.0 persists all timers - if this happens, check browser console for errors

### **📈 Version History**

- **V4.0**: Complete rewrite with cross-workspace support, Zen Browser optimization
- **V3.x**: Legacy version (single workspace only)

### **🤝 Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with both Firefox and Zen Browser
5. Submit a pull request

### **📄 License**

MIT License - Feel free to use and modify

### **🆘 Support**

For issues or questions:
- Check `zen-browser-compatibility.md` for Zen-specific details
- Review browser console logs for error details
- Create an issue on GitHub

---

**Ready to use with Firefox and Zen Browser! 🎉**