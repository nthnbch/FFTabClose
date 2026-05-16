/**
 * FFTabClose - Background Script V5.2
 * 
 * Extension Firefox/Zen pour fermer automatiquement les onglets.
 * Comportement identique à Arc Browser.
 * 
 * ZEN BROWSER SPECIFICS:
 * - browser.tabs.query({}) only returns tabs from the ACTIVE workspace
 * - Tabs in other workspaces are "hidden" and invisible to WebExtensions
 * - We track tabs via onCreated/onActivated events so we see ALL tabs
 * - We must NOT delete tracked tabs just because query() doesn't return them
 * - "Essentials" in Zen = pinned tabs (tab.pinned = true)
 * - tab.groupId does NOT exist in Firefox/Zen (Chrome-only API)
 * - Zen tab folders are not exposed via WebExtensions API
 */

// ─── Configuration par défaut ───────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabled: true,
  closeAfterMinutes: 720,
  discardPinnedTabs: true,
  excludeActiveTab: true,
  excludeAudibleTabs: true,
  excludedDomains: [],
  checkIntervalMinutes: 1
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
      hidden: tab.hidden || false,
      createdAt: now,
      lastActiveAt: now
    };
  }

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
      if (tab.hidden !== undefined) existing.hidden = tab.hidden;
      if (tab.active) existing.lastActiveAt = Date.now();
    } else {
      this.tabData.set(tab.id, this.createTabInfo(tab));
    }
    this.debouncedSave();
  }

  markActive(tabId) {
    const info = this.tabData.get(tabId);
    if (info) {
      info.lastActiveAt = Date.now();
      info.active = true;
      this.debouncedSave();
    }
  }

  removeTab(tabId) {
    this.tabData.delete(tabId);
    this.debouncedSave();
  }

  getAll() {
    return Array.from(this.tabData.values());
  }

  // ─── Sync with browser ──────────────────────────────────────────────────
  // IMPORTANT: On Zen Browser, browser.tabs.query({}) only returns tabs
  // from the ACTIVE workspace. Tabs in other workspaces are hidden.
  // We must NOT delete our tracked data for tabs that are simply in
  // another workspace. We only delete if the tab truly no longer exists
  // (i.e., browser.tabs.get() fails for that ID).
  async syncWithBrowserTabs() {
    try {
      // Get visible tabs (current workspace on Zen, all on Firefox)
      const visibleTabs = await browser.tabs.query({});
      const visibleTabIds = new Set(visibleTabs.map(t => t.id));

      // Build URL→timestamp index for restart recovery
      const urlTimestamps = new Map();
      for (const info of this.tabData.values()) {
        if (info.url && info.url !== '' && !info.url.startsWith('about:')) {
          const existing = urlTimestamps.get(info.url);
          if (!existing || info.lastActiveAt > existing) {
            urlTimestamps.set(info.url, info.lastActiveAt);
          }
        }
      }

      // Verify tracked tabs that are NOT in the visible query
      // They might be in another Zen workspace (still alive) or truly closed
      const staleIds = [];
      for (const tabId of this.tabData.keys()) {
        if (!visibleTabIds.has(tabId)) {
          try {
            // Try to get the tab — if it exists, it's just hidden (other workspace)
            const tab = await browser.tabs.get(tabId);
            // Tab exists! Update its metadata
            const existing = this.tabData.get(tabId);
            if (existing) {
              existing.hidden = true; // Mark as hidden (other workspace)
              existing.pinned = tab.pinned || false;
              if (tab.url) existing.url = tab.url;
              if (tab.title) existing.title = tab.title;
            }
          } catch (e) {
            // Tab truly doesn't exist anymore — mark for removal
            staleIds.push(tabId);
          }
        }
      }

      // Remove truly dead tabs
      for (const id of staleIds) {
        this.tabData.delete(id);
      }

      // Update visible tabs
      let restoredCount = 0;
      for (const tab of visibleTabs) {
        if (!this.tabData.has(tab.id)) {
          const newInfo = this.createTabInfo(tab);
          newInfo.hidden = false;
          // Restore timestamp from URL match (browser restart)
          const oldTimestamp = urlTimestamps.get(tab.url);
          if (oldTimestamp && !tab.active) {
            newInfo.lastActiveAt = oldTimestamp;
            restoredCount++;
          }
          this.tabData.set(tab.id, newInfo);
        } else {
          const existing = this.tabData.get(tab.id);
          existing.url = tab.url || existing.url;
          existing.title = tab.title || existing.title;
          existing.windowId = tab.windowId;
          existing.pinned = tab.pinned || false;
          existing.active = tab.active || false;
          existing.audible = tab.audible || false;
          existing.discarded = tab.discarded || false;
          existing.hidden = false; // It's visible now
        }
      }

      if (restoredCount > 0) {
        console.log(`[FFTabClose] Restored timestamps for ${restoredCount} tabs`);
      }
      if (staleIds.length > 0) {
        console.log(`[FFTabClose] Cleaned ${staleIds.length} dead tabs`);
      }

      await this.saveToStorage();
    } catch (error) {
      console.error('[FFTabClose] Error syncing tabs:', error);
    }
  }

  debouncedSave() {
    if (this._saveDebounce) clearTimeout(this._saveDebounce);
    this._saveDebounce = setTimeout(() => this.saveToStorage(), 2000);
  }

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

  async init() {
    console.log('[FFTabClose] ═══════════════════════════════════════');
    console.log('[FFTabClose] Starting FFTabClose V5.2...');

    await this.detectZenBrowser();
    await this.loadConfig();
    await this.tabs.init();
    this.setupListeners();

    if (this.config.enabled) {
      await this.startAlarm();
      setTimeout(() => this.processOldTabs(), 5000);
    }

    console.log(`[FFTabClose] Ready! ${this.isZenBrowser ? '(Zen Browser)' : '(Firefox)'}`);
    console.log(`[FFTabClose] Tracking ${this.tabs.tabData.size} tabs, timer=${this.config.closeAfterMinutes}min`);
    console.log('[FFTabClose] ═══════════════════════════════════════');
  }

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
      console.log('[FFTabClose] 🟣 Zen Browser detected');
    }
  }

  async loadConfig() {
    try {
      const result = await browser.storage.sync.get('config');
      if (result.config) {
        this.config = { ...DEFAULT_CONFIG, ...result.config };
      }
    } catch (error) {
      console.error('[FFTabClose] Error loading config:', error);
    }
  }

  // ─── Event listeners ───────────────────────────────────────────────────
  setupListeners() {
    // Tab created — captures tabs from ALL workspaces as they're created
    browser.tabs.onCreated.addListener((tab) => {
      console.log(`[FFTabClose] Tab created: ${tab.id} "${tab.title || '(loading)'}" pinned=${tab.pinned}`);
      this.tabs.updateTab(tab);
    });

    // Tab updated
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' ||
          changeInfo.title !== undefined ||
          changeInfo.url !== undefined ||
          changeInfo.pinned !== undefined ||
          changeInfo.audible !== undefined ||
          changeInfo.discarded !== undefined ||
          changeInfo.hidden !== undefined) {
        this.tabs.updateTab(tab);
      }
    });

    // Tab removed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.tabs.removeTab(tabId);
    });

    // Tab activated — resets the timer for this tab
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      this.tabs.markActive(activeInfo.tabId);
      // Mark other tabs in same window as inactive
      try {
        const tabs = await browser.tabs.query({ windowId: activeInfo.windowId });
        for (const tab of tabs) {
          if (tab.id !== activeInfo.tabId) {
            const info = this.tabs.tabData.get(tab.id);
            if (info) info.active = false;
          }
        }
      } catch (e) { /* ignore */ }
    });

    // Window focus
    browser.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId !== browser.windows.WINDOW_ID_NONE) {
        try {
          const activeTabs = await browser.tabs.query({ windowId, active: true });
          if (activeTabs[0]) this.tabs.markActive(activeTabs[0].id);
        } catch (e) { /* ignore */ }
      }
    });

    // Alarm
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === this.alarmName) {
        await this.processOldTabs();
      }
    });

    // Config changes
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

  async startAlarm() {
    await browser.alarms.clear(this.alarmName);
    await browser.alarms.create(this.alarmName, {
      delayInMinutes: this.config.checkIntervalMinutes,
      periodInMinutes: this.config.checkIntervalMinutes
    });
    console.log(`[FFTabClose] ⏰ Alarm set — every ${this.config.checkIntervalMinutes} min`);
  }

  async stopAlarm() {
    await browser.alarms.clear(this.alarmName);
    console.log('[FFTabClose] ⏰ Alarm stopped');
  }

  // ─── CORE: Process old tabs ─────────────────────────────────────────────
  async processOldTabs() {
    if (this.isProcessing) return;
    if (!this.config.enabled) return;

    this.isProcessing = true;

    try {
      console.log('[FFTabClose] ─── Processing cycle start ───');

      // Sync with real browser state
      await this.tabs.syncWithBrowserTabs();

      const now = Date.now();
      const maxAge = this.config.closeAfterMinutes * 60 * 1000;

      // Fresh query for active tabs
      const activeTabs = await browser.tabs.query({ active: true });
      const activeTabIds = new Set(activeTabs.map(t => t.id));

      // Count visible tabs per window (for "don't empty a window" safety)
      const visibleTabs = await browser.tabs.query({});
      const totalVisibleCount = visibleTabs.length;
      const tabsPerWindow = new Map();
      for (const tab of visibleTabs) {
        tabsPerWindow.set(tab.windowId, (tabsPerWindow.get(tab.windowId) || 0) + 1);
      }
      // Set of IDs that browser.tabs.query can see right now
      const visibleTabIds = new Set(visibleTabs.map(t => t.id));

      const tabsToClose = [];
      const tabsToDiscard = [];

      for (const tabInfo of this.tabs.getAll()) {
        const age = now - tabInfo.lastActiveAt;

        // Not old enough
        if (age < maxAge) continue;

        // Never touch the active tab
        if (this.config.excludeActiveTab && activeTabIds.has(tabInfo.id)) continue;

        // Never touch tabs playing audio
        if (this.config.excludeAudibleTabs && tabInfo.audible) continue;

        // Never touch internal pages
        if (this.isInternalUrl(tabInfo.url)) continue;

        // Domain exclusions
        if (this.isDomainExcluded(tabInfo.url)) continue;

        // Arc Browser behavior:
        // Pinned (includes Zen essentials) → DISCARD
        // Normal → CLOSE
        if (tabInfo.pinned) {
          if (this.config.discardPinnedTabs && !tabInfo.discarded) {
            tabsToDiscard.push(tabInfo);
          }
        } else {
          tabsToClose.push(tabInfo);
        }
      }

      console.log(`[FFTabClose] Found: ${tabsToClose.length} to close, ${tabsToDiscard.length} to discard`);

      // SAFETY: cap at 3 per cycle if closing >50% of visible tabs
      if (tabsToClose.length > 0 && totalVisibleCount > 0) {
        // Only count tabs we can actually see for the ratio
        const visibleToClose = tabsToClose.filter(t => visibleTabIds.has(t.id));
        const closeRatio = visibleToClose.length / totalVisibleCount;
        if (closeRatio > 0.5 && visibleToClose.length > 3) {
          console.warn(`[FFTabClose] ⚠️ SAFETY: Would close ${visibleToClose.length}/${totalVisibleCount} visible tabs — limiting to 3`);
          tabsToClose.sort((a, b) => a.lastActiveAt - b.lastActiveAt);
          tabsToClose.splice(3);
        }
      }

      // ─── Close normal tabs ────────────────────────────────────────
      if (tabsToClose.length > 0) {
        // Fresh active check right before closing
        const freshActive = await browser.tabs.query({ active: true });
        const freshActiveIds = new Set(freshActive.map(t => t.id));

        const closeByWindow = new Map();
        for (const tab of tabsToClose) {
          if (freshActiveIds.has(tab.id)) continue;

          // We need the windowId — for hidden tabs, verify it exists first
          const wId = tab.windowId;
          if (!closeByWindow.has(wId)) closeByWindow.set(wId, []);
          closeByWindow.get(wId).push(tab);
        }

        const idsToClose = [];
        for (const [windowId, tabs] of closeByWindow) {
          const totalInWindow = tabsPerWindow.get(windowId) || 1;
          if (tabs.length >= totalInWindow) {
            tabs.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
            for (let i = 1; i < tabs.length; i++) idsToClose.push(tabs[i].id);
            console.log(`[FFTabClose] Window ${windowId}: keeping 1 tab`);
          } else {
            for (const tab of tabs) idsToClose.push(tab.id);
          }
        }

        for (const id of idsToClose) {
          try {
            await browser.tabs.remove(id);
            this.tabs.removeTab(id);
            console.log(`[FFTabClose] ✅ Closed tab ${id}`);
          } catch (e) {
            console.warn(`[FFTabClose] Could not close tab ${id}:`, e.message);
            // Tab might not exist anymore — clean up
            this.tabs.removeTab(id);
          }
        }
      }

      // ─── Discard (sleep) pinned tabs ──────────────────────────────
      if (tabsToDiscard.length > 0) {
        for (const tabInfo of tabsToDiscard) {
          try {
            await browser.tabs.discard(tabInfo.id);
            tabInfo.discarded = true;
            tabInfo.lastActiveAt = Date.now();
            console.log(`[FFTabClose] 💤 Discarded tab ${tabInfo.id}: ${tabInfo.title}`);
          } catch (error) {
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
           url.startsWith('data:');
  }

  isDomainExcluded(url) {
    if (!url || !this.config.excludedDomains || this.config.excludedDomains.length === 0) return false;
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return this.config.excludedDomains.some(domain => {
        const d = domain.toLowerCase().trim();
        return hostname === d || hostname.endsWith('.' + d);
      });
    } catch (e) {
      return false;
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────
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
        if (tab.pinned) {
          oldProtected++;
        } else {
          oldNormal++;
        }
      }
    }

    return {
      totalTabs: allTabs.length,
      pinnedTabs: allTabs.filter(t => t.pinned).length,
      discardedTabs: allTabs.filter(t => t.discarded).length,
      hiddenTabs: allTabs.filter(t => t.hidden).length,
      oldTabsToClose: oldNormal,
      oldTabsToDiscard: oldProtected,
      enabled: this.config.enabled,
      closeAfterMinutes: this.config.closeAfterMinutes,
      isZenBrowser: this.isZenBrowser
    };
  }

  async getDetailedTabList() {
    const allTabs = this.tabs.getAll();
    const now = Date.now();
    const maxAge = this.config.closeAfterMinutes * 60 * 1000;

    return allTabs.map(tab => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      pinned: tab.pinned,
      hidden: tab.hidden,
      discarded: tab.discarded,
      audible: tab.audible,
      age: now - tab.lastActiveAt,
      isOld: (now - tab.lastActiveAt) >= maxAge,
      action: tab.pinned ? 'discard' : 'close'
    })).sort((a, b) => b.age - a.age);
  }
}

// ─── Bootstrap ──────────────────────────────────────────────────────────────
const ffTabClose = new FFTabCloseManager();
ffTabClose.init().catch(error => {
  console.error('[FFTabClose] FATAL:', error);
});

if (typeof globalThis !== 'undefined') {
  globalThis.ffTabClose = ffTabClose;
}