/**
 * FFTabClose - Background Script V5.0
 * 
 * Extension Firefox/Zen pour fermer automatiquement les onglets après un délai
 * configurable. Comportement identique à Arc Browser :
 * 
 * - Onglets normaux (non-pinned, non-essentials, hors dossiers) → FERMÉS
 * - Onglets pinned / essentials / dans des dossiers → DISCARDÉS (mis en pause)
 * - Fonctionne sur TOUS les workspaces/spaces/fenêtres
 * - L'onglet actif n'est jamais touché
 * - Les onglets jouant de l'audio ne sont jamais touchés
 */

// ─── Configuration par défaut ───────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabled: true,
  closeAfterMinutes: 720,        // 12h par défaut
  discardPinnedTabs: true,       // Mettre en veille (discard) les pinned/essentials
  excludeActiveTab: true,        // Ne jamais toucher l'onglet actif
  excludeAudibleTabs: true,      // Ne pas toucher les onglets avec audio
  excludedDomains: [],           // Domaines exclus
  checkIntervalMinutes: 1        // Vérification toutes les minutes
};

// ─── Tab Data Manager ───────────────────────────────────────────────────────
class TabDataManager {
  constructor() {
    this.tabData = new Map();
    this.initialized = false;
    this._saveDebounce = null;
  }

  async init() {
    if (this.initialized) return;
    
    console.log('[FFTabClose] Initializing TabDataManager...');
    await this.loadFromStorage();
    await this.syncWithBrowserTabs();
    this.initialized = true;
    console.log(`[FFTabClose] TabDataManager ready — tracking ${this.tabData.size} tabs`);
  }

  // ─── Tab info structure ──────────────────────────────────────────────────
  createTabInfo(tab) {
    const now = Date.now();
    return {
      id: tab.id,
      url: tab.url || '',
      title: tab.title || '',
      windowId: tab.windowId,
      cookieStoreId: tab.cookieStoreId || 'firefox-default',
      pinned: tab.pinned || false,
      active: tab.active || false,
      audible: tab.audible || false,
      discarded: tab.discarded || false,
      // Zen Browser specific: check if tab is in a group
      groupId: tab.groupId || null,
      createdAt: now,
      lastActiveAt: now
    };
  }

  // ─── Update or insert tab data ───────────────────────────────────────────
  updateTab(tab) {
    const existing = this.tabData.get(tab.id);
    
    if (existing) {
      existing.url = tab.url || existing.url;
      existing.title = tab.title || existing.title;
      existing.windowId = tab.windowId;
      existing.pinned = tab.pinned || false;
      existing.active = tab.active || false;
      existing.audible = tab.audible || false;
      existing.discarded = tab.discarded || false;
      existing.groupId = tab.groupId || null;
      
      // Reset timer when tab becomes active
      if (tab.active) {
        existing.lastActiveAt = Date.now();
      }
    } else {
      this.tabData.set(tab.id, this.createTabInfo(tab));
    }
    
    this.debouncedSave();
  }

  // ─── Mark tab as active (timer reset) ────────────────────────────────────
  markActive(tabId) {
    const info = this.tabData.get(tabId);
    if (info) {
      info.lastActiveAt = Date.now();
      info.active = true;
      this.debouncedSave();
    }
  }

  // ─── Remove tab data ────────────────────────────────────────────────────
  removeTab(tabId) {
    this.tabData.delete(tabId);
    this.debouncedSave();
  }

  // ─── Get all tab data ───────────────────────────────────────────────────
  getAll() {
    return Array.from(this.tabData.values());
  }

  // ─── Sync with actual browser tabs ──────────────────────────────────────
  async syncWithBrowserTabs() {
    try {
      // Query ALL tabs across ALL windows
      const browserTabs = await browser.tabs.query({});
      const browserTabIds = new Set(browserTabs.map(t => t.id));
      
      // Remove stale entries (tabs that no longer exist)
      for (const tabId of this.tabData.keys()) {
        if (!browserTabIds.has(tabId)) {
          this.tabData.delete(tabId);
        }
      }
      
      // Add or update all current tabs
      for (const tab of browserTabs) {
        if (!this.tabData.has(tab.id)) {
          // New tab — add it
          this.tabData.set(tab.id, this.createTabInfo(tab));
        } else {
          // Existing — update metadata but KEEP lastActiveAt
          const existing = this.tabData.get(tab.id);
          existing.url = tab.url || existing.url;
          existing.title = tab.title || existing.title;
          existing.windowId = tab.windowId;
          existing.pinned = tab.pinned || false;
          existing.active = tab.active || false;
          existing.audible = tab.audible || false;
          existing.discarded = tab.discarded || false;
          existing.groupId = tab.groupId || null;
        }
      }
      
      await this.saveToStorage();
    } catch (error) {
      console.error('[FFTabClose] Error syncing tabs:', error);
    }
  }

  // ─── Debounced save (avoid hammering storage) ───────────────────────────
  debouncedSave() {
    if (this._saveDebounce) clearTimeout(this._saveDebounce);
    this._saveDebounce = setTimeout(() => this.saveToStorage(), 2000);
  }

  // ─── Persist to storage ─────────────────────────────────────────────────
  async saveToStorage() {
    try {
      const data = {};
      for (const [tabId, info] of this.tabData) {
        data[tabId] = info;
      }
      await browser.storage.local.set({ tabData: data, lastSaved: Date.now() });
    } catch (error) {
      console.error('[FFTabClose] Error saving to storage:', error);
    }
  }

  // ─── Load from storage ──────────────────────────────────────────────────
  async loadFromStorage() {
    try {
      const result = await browser.storage.local.get(['tabData', 'lastSaved']);
      if (result.tabData) {
        this.tabData.clear();
        for (const [tabId, info] of Object.entries(result.tabData)) {
          this.tabData.set(parseInt(tabId), info);
        }
        console.log(`[FFTabClose] Loaded ${this.tabData.size} tabs from storage`);
      }
    } catch (error) {
      console.error('[FFTabClose] Error loading from storage:', error);
    }
  }
}

// ─── Main Extension Manager ─────────────────────────────────────────────────
class FFTabCloseManager {
  constructor() {
    this.tabs = new TabDataManager();
    this.config = { ...DEFAULT_CONFIG };
    this.alarmName = 'ffTabCloseCheck';
    this.isProcessing = false;
    this.isZenBrowser = false;
  }

  // ─── Initialize ─────────────────────────────────────────────────────────
  async init() {
    console.log('[FFTabClose] ═══════════════════════════════════════');
    console.log('[FFTabClose] Starting FFTabClose V5.0...');
    
    await this.detectZenBrowser();
    await this.loadConfig();
    await this.tabs.init();
    this.setupListeners();
    
    if (this.config.enabled) {
      await this.startAlarm();
      // Run once immediately on startup
      setTimeout(() => this.processOldTabs(), 5000);
    }
    
    console.log(`[FFTabClose] Ready! ${this.isZenBrowser ? '(Zen Browser)' : '(Firefox)'}`);
    console.log('[FFTabClose] ═══════════════════════════════════════');
  }

  // ─── Detect Zen Browser ─────────────────────────────────────────────────
  async detectZenBrowser() {
    try {
      const info = await browser.runtime.getBrowserInfo();
      this.isZenBrowser = info.name.toLowerCase().includes('zen') ||
                          info.vendor.toLowerCase().includes('zen');
    } catch (e) {
      try {
        this.isZenBrowser = navigator.userAgent.includes('Zen');
      } catch (e2) {
        this.isZenBrowser = false;
      }
    }
    
    if (this.isZenBrowser) {
      console.log('[FFTabClose] 🟣 Zen Browser detected — workspace mode enabled');
    }
  }

  // ─── Config management ──────────────────────────────────────────────────
  async loadConfig() {
    try {
      const result = await browser.storage.sync.get('config');
      if (result.config) {
        this.config = { ...DEFAULT_CONFIG, ...result.config };
      }
      console.log('[FFTabClose] Config:', JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('[FFTabClose] Error loading config:', error);
    }
  }

  async saveConfig() {
    try {
      await browser.storage.sync.set({ config: this.config });
    } catch (error) {
      console.error('[FFTabClose] Error saving config:', error);
    }
  }

  // ─── Event listeners ───────────────────────────────────────────────────
  setupListeners() {
    // Tab created
    browser.tabs.onCreated.addListener((tab) => {
      this.tabs.updateTab(tab);
    });

    // Tab updated (URL change, title change, etc.)
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Update on meaningful changes
      if (changeInfo.status === 'complete' || 
          changeInfo.title !== undefined ||
          changeInfo.url !== undefined ||
          changeInfo.pinned !== undefined ||
          changeInfo.audible !== undefined ||
          changeInfo.discarded !== undefined) {
        this.tabs.updateTab(tab);
      }
    });

    // Tab removed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.tabs.removeTab(tabId);
    });

    // Tab activated (user switches to a tab) — this resets the timer
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      // Mark the newly active tab
      this.tabs.markActive(activeInfo.tabId);
      
      // Mark all other tabs in same window as inactive
      try {
        const tabs = await browser.tabs.query({ windowId: activeInfo.windowId });
        for (const tab of tabs) {
          if (tab.id !== activeInfo.tabId) {
            const info = this.tabs.tabData.get(tab.id);
            if (info) info.active = false;
          }
        }
      } catch (e) {
        // Ignore errors during deactivation tracking
      }
    });

    // Window focus changed
    browser.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId !== browser.windows.WINDOW_ID_NONE) {
        try {
          const activeTabs = await browser.tabs.query({ windowId, active: true });
          if (activeTabs[0]) {
            this.tabs.markActive(activeTabs[0].id);
          }
        } catch (e) {
          // Ignore
        }
      }
    });

    // Alarm (periodic check)
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === this.alarmName) {
        await this.processOldTabs();
      }
    });

    // Config changes (from popup or sync)
    browser.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'sync' && changes.config) {
        console.log('[FFTabClose] Config changed, reloading...');
        await this.loadConfig();
        if (this.config.enabled) {
          await this.startAlarm();
        } else {
          await this.stopAlarm();
        }
      }
    });

    // Messages from popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'getStats':
          this.getStats().then(stats => sendResponse({ stats }));
          return true;
          
        case 'getConfig':
          sendResponse({ config: this.config });
          return false;

        case 'forceProcess':
          this.processOldTabs()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;

        case 'getTabList':
          this.getDetailedTabList().then(list => sendResponse({ tabs: list }));
          return true;
      }
    });
  }

  // ─── Alarm management ──────────────────────────────────────────────────
  async startAlarm() {
    await browser.alarms.clear(this.alarmName);
    await browser.alarms.create(this.alarmName, {
      periodInMinutes: this.config.checkIntervalMinutes
    });
    console.log(`[FFTabClose] ⏰ Alarm set — checking every ${this.config.checkIntervalMinutes} min`);
  }

  async stopAlarm() {
    await browser.alarms.clear(this.alarmName);
    console.log('[FFTabClose] ⏰ Alarm stopped');
  }

  // ─── CORE: Process old tabs (Arc Browser behavior) ─────────────────────
  async processOldTabs() {
    if (this.isProcessing) return;
    if (!this.config.enabled) return;
    
    this.isProcessing = true;
    
    try {
      console.log('[FFTabClose] ─── Processing cycle start ───');
      
      // Sync with real browser state first
      await this.tabs.syncWithBrowserTabs();
      
      const now = Date.now();
      const maxAge = this.config.closeAfterMinutes * 60 * 1000;
      
      // Get ALL active tabs (to exclude them)
      const activeTabs = await browser.tabs.query({ active: true });
      const activeTabIds = new Set(activeTabs.map(t => t.id));
      
      // Count tabs per window to avoid closing the last tab
      const tabsPerWindow = new Map();
      const allBrowserTabs = await browser.tabs.query({});
      for (const tab of allBrowserTabs) {
        tabsPerWindow.set(tab.windowId, (tabsPerWindow.get(tab.windowId) || 0) + 1);
      }
      
      const tabsToClose = [];      // Normal tabs → close
      const tabsToDiscard = [];    // Pinned/essential/grouped → discard
      
      for (const tabInfo of this.tabs.getAll()) {
        const age = now - tabInfo.lastActiveAt;
        
        // Not old enough yet
        if (age < maxAge) continue;
        
        // Never touch the active tab
        if (this.config.excludeActiveTab && activeTabIds.has(tabInfo.id)) continue;
        
        // Never touch tabs playing audio
        if (this.config.excludeAudibleTabs && tabInfo.audible) continue;
        
        // Never touch internal browser pages
        if (this.isInternalUrl(tabInfo.url)) continue;
        
        // Check domain exclusions
        if (this.isDomainExcluded(tabInfo.url)) continue;
        
        // ─── Arc Browser behavior decision ───────────────────────────
        // Pinned tabs, essential tabs, tabs in groups/folders → DISCARD
        // Everything else → CLOSE
        
        const isProtected = tabInfo.pinned || tabInfo.groupId;
        
        if (isProtected) {
          // Protected tabs → discard (put to sleep), don't close
          if (this.config.discardPinnedTabs && !tabInfo.discarded) {
            tabsToDiscard.push(tabInfo);
          }
        } else {
          // Normal unprotected tabs → close them
          tabsToClose.push(tabInfo);
        }
      }
      
      console.log(`[FFTabClose] Found: ${tabsToClose.length} to close, ${tabsToDiscard.length} to discard`);
      
      // ─── Close normal tabs ──────────────────────────────────────────
      if (tabsToClose.length > 0) {
        // Group by window to handle "last tab" protection
        const closeByWindow = new Map();
        for (const tab of tabsToClose) {
          if (!closeByWindow.has(tab.windowId)) {
            closeByWindow.set(tab.windowId, []);
          }
          closeByWindow.get(tab.windowId).push(tab);
        }
        
        const idsToClose = [];
        
        for (const [windowId, tabs] of closeByWindow) {
          const totalInWindow = tabsPerWindow.get(windowId) || 1;
          
          if (tabs.length >= totalInWindow) {
            // Would close ALL tabs in this window — keep one (most recent)
            tabs.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
            // Skip the first one (most recently active), close the rest
            for (let i = 1; i < tabs.length; i++) {
              idsToClose.push(tabs[i].id);
            }
            console.log(`[FFTabClose] Window ${windowId}: keeping 1 tab to avoid empty window`);
          } else {
            for (const tab of tabs) {
              idsToClose.push(tab.id);
            }
          }
        }
        
        if (idsToClose.length > 0) {
          try {
            await browser.tabs.remove(idsToClose);
            console.log(`[FFTabClose] ✅ Closed ${idsToClose.length} tabs`);
            
            for (const id of idsToClose) {
              this.tabs.removeTab(id);
            }
          } catch (error) {
            console.error('[FFTabClose] Error closing tabs:', error);
            // Try one by one as fallback
            for (const id of idsToClose) {
              try {
                await browser.tabs.remove(id);
                this.tabs.removeTab(id);
              } catch (e) {
                console.warn(`[FFTabClose] Could not close tab ${id}:`, e.message);
              }
            }
          }
        }
      }
      
      // ─── Discard (sleep) protected tabs ─────────────────────────────
      if (tabsToDiscard.length > 0) {
        for (const tabInfo of tabsToDiscard) {
          try {
            // Use the native Firefox API to discard (unload from memory)
            // The tab stays in the tab bar but is unloaded
            await browser.tabs.discard(tabInfo.id);
            
            // Update our tracking data
            tabInfo.discarded = true;
            tabInfo.lastActiveAt = Date.now(); // Reset timer after discard
            
            console.log(`[FFTabClose] 💤 Discarded tab ${tabInfo.id}: ${tabInfo.title}`);
          } catch (error) {
            // tabs.discard can fail if tab is active or recently created
            console.warn(`[FFTabClose] Could not discard tab ${tabInfo.id}:`, error.message);
          }
        }
        
        await this.tabs.saveToStorage();
      }
      
      console.log('[FFTabClose] ─── Processing cycle end ───');
      
    } catch (error) {
      console.error('[FFTabClose] Error in processOldTabs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // ─── URL helpers ────────────────────────────────────────────────────────
  isInternalUrl(url) {
    if (!url) return true;
    return url.startsWith('about:') ||
           url.startsWith('chrome:') ||
           url.startsWith('moz-extension:') ||
           url.startsWith('data:') ||
           url === 'about:blank' ||
           url === 'about:newtab' ||
           url === 'about:home';
  }

  isDomainExcluded(url) {
    if (!url || !this.config.excludedDomains || this.config.excludedDomains.length === 0) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      return this.config.excludedDomains.some(domain => {
        const d = domain.toLowerCase().trim();
        return hostname === d || hostname.endsWith('.' + d);
      });
    } catch (e) {
      return false;
    }
  }

  // ─── Stats for popup ───────────────────────────────────────────────────
  async getStats() {
    const allTabs = this.tabs.getAll();
    const now = Date.now();
    const maxAge = this.config.closeAfterMinutes * 60 * 1000;
    
    const activeTabs = await browser.tabs.query({ active: true });
    const activeTabIds = new Set(activeTabs.map(t => t.id));
    
    let oldNormal = 0;
    let oldProtected = 0;
    
    for (const tab of allTabs) {
      const age = now - tab.lastActiveAt;
      if (age >= maxAge && !activeTabIds.has(tab.id) && !this.isInternalUrl(tab.url)) {
        if (tab.pinned || tab.groupId) {
          oldProtected++;
        } else {
          oldNormal++;
        }
      }
    }
    
    return {
      totalTabs: allTabs.length,
      pinnedTabs: allTabs.filter(t => t.pinned).length,
      groupedTabs: allTabs.filter(t => t.groupId).length,
      discardedTabs: allTabs.filter(t => t.discarded).length,
      oldTabsToClose: oldNormal,
      oldTabsToDiscard: oldProtected,
      enabled: this.config.enabled,
      closeAfterMinutes: this.config.closeAfterMinutes,
      isZenBrowser: this.isZenBrowser
    };
  }

  // ─── Detailed tab list for popup ────────────────────────────────────────
  async getDetailedTabList() {
    const allTabs = this.tabs.getAll();
    const now = Date.now();
    const maxAge = this.config.closeAfterMinutes * 60 * 1000;
    
    return allTabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      pinned: tab.pinned,
      groupId: tab.groupId,
      discarded: tab.discarded,
      audible: tab.audible,
      age: now - tab.lastActiveAt,
      isOld: (now - tab.lastActiveAt) >= maxAge,
      action: tab.pinned || tab.groupId ? 'discard' : 'close'
    })).sort((a, b) => b.age - a.age);
  }
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────
const ffTabClose = new FFTabCloseManager();

ffTabClose.init().catch(error => {
  console.error('[FFTabClose] FATAL:', error);
});

// Expose for debugging
if (typeof globalThis !== 'undefined') {
  globalThis.ffTabClose = ffTabClose;
}