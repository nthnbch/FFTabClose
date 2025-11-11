# FFTabClose V4.0 - Quick Test Guide

## 🧪 **Quick Testing Steps**

### **1. Installation Test**
```bash
# Open Firefox or Zen Browser
# Go to about:debugging
# Load extension from manifest.json
# ✅ Should see "FFTabClose" in extensions list
```

### **2. Basic Functionality Test**
1. Open 3-4 tabs
2. Click FFTabClose icon → should show popup with statistics
3. Set "Close after" to 1 minute for quick testing
4. Wait 1-2 minutes
5. ✅ Tabs should start closing automatically

### **3. Pinned Tabs Test**
1. Pin 1-2 tabs (right-click → Pin Tab)
2. Enable "Sleep pinned tabs"
3. Wait for timer to expire
4. ✅ Pinned tabs should be "slept" (reloaded) not closed

### **4. Zen Browser Workspace Test** (Zen only)
1. Create multiple workspaces
2. Open tabs in different workspaces  
3. Switch between workspaces
4. ✅ Extension should work across ALL workspaces
5. ✅ Console should show "Zen Browser detected"

### **5. Persistence Test**
1. Configure settings
2. Close and restart browser
3. ✅ Settings should be preserved
4. ✅ Tab timers should continue from where they left off

## 🔧 **Debugging**

### **Console Logs to Look For:**
- `FFTabClose: Starting initialization...`
- `FFTabClose: Zen Browser detected` (Zen only)
- `FFTabClose: Found X tabs to close and Y tabs to discard`

### **Common Issues:**
- **No logs**: Extension not loaded properly
- **Tabs not closing**: Check if extension is enabled
- **Settings reset**: Check storage permissions in manifest

## ✅ **Success Criteria**
- Extension loads without errors
- Popup shows current statistics  
- Tabs auto-close after configured time
- Pinned tabs are slept, not closed
- Works across Zen workspaces (if applicable)
- Survives browser restart