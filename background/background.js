/**
 * FFTabClose - Background Script V5.3
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
 * - Zen folders are Firefox tab groups: tab.groupId (FF 139+) is >= 0 for tabs
 *   inside a folder. Such tabs are treated like pinned ones (slept, never closed).
 * - Zen "empty tab" placeholders are about:blank → skipped by isInternalUrl()
 *
 * SAFETY MODEL (never lose tabs by accident):
 * - The clock is paused while the browser is closed / the machine asleep
 *   (heartbeat gap), so a restart never makes every tab "old" at once.
 * - A tab's age starts when you LEAVE it, not when you opened it.
 * - Max MAX_CLOSE_PER_CYCLE closes per cycle, never empties a window.
 * - Closed tabs are archived (Arc-style) and can be restored from the popup.
 */

// ─── Configuration par défaut ───────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabled: true,
  closeAfterMinutes: 720,
  discardPinnedTabs: true,
  excludeActiveTab: true,
  excludeAudibleTabs: true,
  excludedDomains: [],        // whitelist: domains ("github.com") or URLs ("site.com/docs", "https://x.com/a*")
  reviewBeforeClose: true,    // show a review window before closing tabs
  reviewGraceSeconds: 60,     // time left to react before tabs are really closed
  delayMinutes: 60,           // "Delay" button snooze
  checkIntervalMinutes: 1
};

const MAX_CLOSE_PER_CYCLE = 5;      // gradual cleanup, never a mass close
const STARTUP_GRACE_MS = 30 * 1000; // let session restore finish before acting
const GAP_THRESHOLD_MS = 3 * 60 * 1000; // heartbeat gap = browser closed / asleep
const ARCHIVE_LIMIT = 1000;

// ─── Tab Data Manager ───────────────────────────────────────────────────────
class TabDataManager {
  constructor() {
    this.tabData = new Map();
    this.initialized = false;
    this._saveDebounce = null;
    this.lastSaved = 0;
  }

  async init() {
    if (this.initialized) return;
    console.log('[FFTabClose] Initializing TabDataManager...');
    if (this.tabData.size === 0) await this.loadFromStorage(); // may be preloaded (clock pause)
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
      grouped: TabDataManager.isGrouped(tab),
      createdAt: now,
      lastActiveAt: now
    };
  }

  static isGrouped(tab) {
    return typeof tab.groupId === 'number' && tab.groupId >= 0;
  }

  // Move every timestamp forward (clock paused while browser was off/asleep)
  shiftTimestamps(ms) {
    if (ms <= 0) return;
    const now = Date.now();
    for (const info of this.tabData.values()) {
      info.lastActiveAt = Math.min(now, info.lastActiveAt + ms);
    }
    this.debouncedSave();
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
      existing.grouped = TabDataManager.isGrouped(tab);
      if (tab.hidden !== undefined) existing.hidden = tab.hidden;
      if (tab.active) existing.lastActiveAt = Date.now();
    } else {
      this.tabData.set(tab.id, this.createTabInfo(tab));
    }
    this.debouncedSave();
  }

  markActive(tabId, active = true) {
    const info = this.tabData.get(tabId);
    if (info) {
      info.lastActiveAt = Date.now();
      info.active = active;
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
      const missingIds = [...this.tabData.keys()].filter(id => !visibleTabIds.has(id));
      const checks = await Promise.all(missingIds.map(id =>
        browser.tabs.get(id).then(tab => ({ id, tab }), () => ({ id, tab: null }))
      ));
      const staleIds = [];
      for (const { id, tab } of checks) {
        if (!tab) { staleIds.push(id); continue; }
        // Exists but not returned by query → hidden (other Zen workspace)
        const existing = this.tabData.get(id);
        if (existing) {
          existing.hidden = true;
          existing.pinned = tab.pinned || false;
          existing.grouped = TabDataManager.isGrouped(tab);
          existing.windowId = tab.windowId;
          if (tab.url) existing.url = tab.url;
          if (tab.title) existing.title = tab.title;
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
          existing.grouped = TabDataManager.isGrouped(tab);
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
      this.lastSaved = result.lastSaved || 0;
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
    this.startedAt = Date.now();
    this.lastBeat = 0;
    this.pending = new Map();   // tabId → tabInfo awaiting user review
    this.reviewDeadline = 0;
    this.reviewTimer = null;
    this.reviewWindowId = null;
  }

  async init() {
    console.log('[FFTabClose] ═══════════════════════════════════════');
    console.log('[FFTabClose] Starting FFTabClose V5.3...');

    await this.detectZenBrowser();
    await this.loadConfig();
    await this.tabs.loadFromStorage();
    await this.loadHeartbeat();
    await this.heartbeat();            // pause the clock for the time the browser was off
    await this.tabs.init();
    this.setupListeners();

    if (this.config.enabled) {
      await this.startAlarm();
      // First cycle only after session restore had time to settle
      setTimeout(() => this.processOldTabs(), STARTUP_GRACE_MS + 1000);
    }

    console.log(`[FFTabClose] Ready! ${this.isZenBrowser ? '(Zen Browser)' : '(Firefox)'}`);
    console.log(`[FFTabClose] Tracking ${this.tabs.tabData.size} tabs, timer=${this.config.closeAfterMinutes}min`);
    console.log('[FFTabClose] ═══════════════════════════════════════');
  }

  // ─── Clock pause (browser closed / machine asleep) ────────────────────
  async loadHeartbeat() {
    try {
      const { heartbeat } = await browser.storage.local.get('heartbeat');
      this.lastBeat = heartbeat || Date.now();
    } catch (e) {
      this.lastBeat = Date.now();
    }
  }

  // Called on every alarm tick. If the gap since the previous beat is far
  // larger than the check interval, the browser was closed or the machine
  // asleep: that time must not count towards a tab's age.
  async heartbeat() {
    const now = Date.now();
    const gap = now - this.lastBeat;
    const expected = this.config.checkIntervalMinutes * 60 * 1000;
    if (gap > GAP_THRESHOLD_MS && gap > expected * 2) {
      const pause = gap - expected;
      this.tabs.shiftTimestamps(pause);
      console.log(`[FFTabClose] ⏸️ Clock paused for ${Math.round(pause / 60000)} min (browser closed / asleep)`);
    }
    this.lastBeat = now;
    try { await browser.storage.local.set({ heartbeat: now }); } catch (e) { /* ignore */ }
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
    const updateFilter = { properties: ['title', 'url', 'pinned', 'audible', 'discarded', 'hidden'] };
    try {
      browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.tabs.updateTab(tab), updateFilter);
    } catch (e) {
      browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => this.tabs.updateTab(tab));
    }

    // Tab removed
    browser.tabs.onRemoved.addListener((tabId) => {
      this.tabs.removeTab(tabId);
    });

    // Tab activated — the tab we LEAVE starts its countdown now (Arc behaviour:
    // a tab you kept open for 13h must not be closed the second you leave it)
    browser.tabs.onActivated.addListener((activeInfo) => {
      if (activeInfo.previousTabId !== undefined) {
        this.tabs.markActive(activeInfo.previousTabId, false);
      }
      this.tabs.markActive(activeInfo.tabId, true);
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
        await this.heartbeat();
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
          this.processOldTabs({ force: true })
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        case 'getArchive':
          this.getArchive().then(archive => sendResponse({ archive }));
          return true;
        case 'restoreArchived':
          this.restoreFromArchive(message.id)
            .then(ok => sendResponse({ success: ok }))
            .catch(err => sendResponse({ success: false, error: err.message }));
          return true;
        case 'deleteArchived':
          this.deleteFromArchive(message.ids).then(() => sendResponse({ success: true }));
          return true;
        case 'clearArchive':
          browser.storage.local.set({ archive: [] }).then(() => sendResponse({ success: true }));
          return true;
        case 'getReview':
          sendResponse(this.getReviewState());
          return false;
        case 'reviewAction':
          this.handleReviewAction(message.type, message.id)
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
    await this.heartbeat();
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
  async processOldTabs({ force = false } = {}) {
    if (this.isProcessing) return;
    if (!this.config.enabled) return;
    // Don't act while the browser is still restoring its session
    if (!force && Date.now() - this.startedAt < STARTUP_GRACE_MS) return;

    this.isProcessing = true;

    try {
      await this.tabs.syncWithBrowserTabs();

      // One query: includes tabs hidden by Zen workspaces
      const liveTabs = await browser.tabs.query({});
      const activeTabIds = new Set();
      const tabsPerWindow = new Map();
      for (const tab of liveTabs) {
        if (tab.active) activeTabIds.add(tab.id);
        tabsPerWindow.set(tab.windowId, (tabsPerWindow.get(tab.windowId) || 0) + 1);
      }
      // Active tabs are "in use right now": keep their countdown at zero
      for (const id of activeTabIds) this.tabs.markActive(id, true);

      const now = Date.now();
      const maxAge = this.config.closeAfterMinutes * 60 * 1000;
      const tabsToClose = [];
      const tabsToDiscard = [];

      for (const tabInfo of this.tabs.getAll()) {
        if (now - tabInfo.lastActiveAt < maxAge) continue;
        if (this.pending.has(tabInfo.id)) continue;
        if (activeTabIds.has(tabInfo.id)) continue;
        if (this.config.excludeAudibleTabs && tabInfo.audible) continue;
        if (this.isInternalUrl(tabInfo.url)) continue;
        if (this.isDomainExcluded(tabInfo.url)) continue;

        // Arc behaviour: pinned / essentials / folder tabs → sleep, others → close
        if (tabInfo.pinned || tabInfo.grouped) {
          if (this.config.discardPinnedTabs && !tabInfo.discarded) tabsToDiscard.push(tabInfo);
        } else {
          tabsToClose.push(tabInfo);
        }
      }

      // Oldest first, then apply safety limits
      tabsToClose.sort((a, b) => a.lastActiveAt - b.lastActiveAt);

      // Never empty a window: keep its most recently used tab
      const closeByWindow = new Map();
      for (const t of tabsToClose) {
        if (!closeByWindow.has(t.windowId)) closeByWindow.set(t.windowId, []);
        closeByWindow.get(t.windowId).push(t);
      }
      let idsToClose = [];
      for (const [windowId, list] of closeByWindow) {
        const total = tabsPerWindow.get(windowId) || list.length;
        idsToClose.push(...(list.length >= total ? list.slice(0, -1) : list));
      }
      idsToClose = idsToClose.sort((a, b) => a.lastActiveAt - b.lastActiveAt);

      if (idsToClose.length > MAX_CLOSE_PER_CYCLE) {
        console.warn(`[FFTabClose] ⚠️ ${idsToClose.length} tabs eligible — closing only ${MAX_CLOSE_PER_CYCLE} this cycle`);
        idsToClose = idsToClose.slice(0, MAX_CLOSE_PER_CYCLE);
      }

      console.log(`[FFTabClose] Cycle: ${idsToClose.length} close, ${tabsToDiscard.length} discard`);

      // ─── Close normal tabs ─────────────────────────────────────────────
      if (this.config.reviewBeforeClose) {
        this.queueForReview(idsToClose);
      } else {
        await this.closeTabs(idsToClose);
      }

      // ─── Sleep pinned / folder tabs ────────────────────────────────────
      for (const tabInfo of tabsToDiscard) {
        try {
          await browser.tabs.discard(tabInfo.id);
          tabInfo.discarded = true;
        } catch (error) {
          console.warn(`[FFTabClose] Could not discard tab ${tabInfo.id}:`, error.message);
        }
      }

      await this.tabs.saveToStorage();
    } catch (error) {
      console.error('[FFTabClose] Error in processOldTabs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // ─── Closing (archived first, so tabs can be restored) ─────────────────
  async closeTabs(list) {
    for (const tab of list) {
      try {
        // Last-second check: the user may have just switched to it
        const fresh = await browser.tabs.get(tab.id);
        if (fresh.active || (this.config.excludeAudibleTabs && fresh.audible)) continue;
        if (this.isExcluded(fresh.url)) continue;
        await this.archiveTab(tab, fresh);
        await browser.tabs.remove(tab.id);
        this.tabs.removeTab(tab.id);
      } catch (e) {
        console.warn(`[FFTabClose] Could not close tab ${tab.id}:`, e.message);
        this.tabs.removeTab(tab.id); // already gone
      }
    }
  }

  // ─── Review window (ignore / delay / exclude before closing) ───────────
  queueForReview(list) {
    if (list.length === 0) return;
    for (const t of list) this.pending.set(t.id, t);
    this.reviewDeadline = Date.now() + this.config.reviewGraceSeconds * 1000;
    clearTimeout(this.reviewTimer);
    this.reviewTimer = setTimeout(() => this.finalizeReview(), this.config.reviewGraceSeconds * 1000);
    this.openReviewWindow();
  }

  async openReviewWindow() {
    try {
      if (this.reviewWindowId !== null) {
        try {
          await browser.windows.update(this.reviewWindowId, { focused: true });
          return;
        } catch (e) { this.reviewWindowId = null; }
      }
      const win = await browser.windows.create({
        url: browser.runtime.getURL('popup/review.html'),
        type: 'popup', width: 480, height: 600
      });
      this.reviewWindowId = win.id;
      browser.windows.onRemoved.addListener(function onGone(id) {
        if (id === ffTabClose.reviewWindowId) {
          ffTabClose.reviewWindowId = null;
          browser.windows.onRemoved.removeListener(onGone);
        }
      });
    } catch (e) {
      console.warn('[FFTabClose] Review window failed, closing directly:', e.message);
      await this.finalizeReview();
    }
  }

  getReviewState() {
    return {
      deadline: this.reviewDeadline,
      tabs: [...this.pending.values()].map(t => ({ id: t.id, title: t.title, url: t.url }))
    };
  }

  async finalizeReview() {
    clearTimeout(this.reviewTimer);
    const list = [...this.pending.values()];
    this.pending.clear();
    await this.closeTabs(list);
    await this.tabs.saveToStorage();
  }

  async handleReviewAction(type, id) {
    if (type === 'closeAll') return this.finalizeReview();
    if (type === 'ignoreAll') {
      for (const tid of [...this.pending.keys()]) await this.handleReviewAction('ignore', tid);
      return;
    }
    const info = this.pending.get(id);
    if (!info) return;
    const live = this.tabs.tabData.get(id);
    const maxAge = this.config.closeAfterMinutes * 60 * 1000;
    switch (type) {
      case 'ignore': // restart the full countdown
        if (live) live.lastActiveAt = Date.now();
        break;
      case 'delay': // eligible again after delayMinutes
        if (live) live.lastActiveAt = Math.min(Date.now(), Date.now() - maxAge + this.config.delayMinutes * 60 * 1000);
        break;
      case 'excludeDomain':
      case 'excludeUrl': {
        const entry = type === 'excludeDomain' ? this.hostOf(info.url) : this.stripScheme(info.url);
        if (entry) await this.addExclusion(entry);
        break;
      }
      case 'closeNow':
        this.pending.delete(id);
        await this.closeTabs([info]);
        this.afterReviewChange();
        return;
    }
    this.pending.delete(id);
    this.tabs.debouncedSave();
    this.afterReviewChange();
  }

  afterReviewChange() {
    if (this.pending.size === 0) clearTimeout(this.reviewTimer);
  }

  async addExclusion(entry) {
    const list = this.config.excludedDomains || [];
    if (!list.some(e => e.toLowerCase() === entry.toLowerCase())) list.push(entry);
    this.config.excludedDomains = list;
    await browser.storage.sync.set({ config: this.config });
  }

  // ─── Archive (Arc-style "Archived tabs") ────────────────────────────────
  async archiveTab(info, fresh) {
    try {
      const { archive = [] } = await browser.storage.local.get('archive');
      archive.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: fresh.title || info.title || fresh.url,
        url: fresh.url || info.url,
        cookieStoreId: info.cookieStoreId,
        closedAt: Date.now()
      });
      await browser.storage.local.set({ archive: archive.slice(0, ARCHIVE_LIMIT) });
    } catch (e) {
      console.warn('[FFTabClose] Archive failed:', e.message);
    }
  }

  async getArchive() {
    const { archive = [] } = await browser.storage.local.get('archive');
    let changed = false;
    for (const e of archive) {
      if (!e.id) { e.id = `${e.closedAt}-${Math.random().toString(36).slice(2, 8)}`; changed = true; }
    }
    if (changed) await browser.storage.local.set({ archive });
    return archive;
  }

  async restoreFromArchive(id) {
    const archive = await this.getArchive();
    const index = archive.findIndex(e => e.id === id);
    const entry = archive[index];
    if (!entry) return false;
    const props = { url: entry.url, active: false };
    if (entry.cookieStoreId && entry.cookieStoreId !== 'firefox-default') {
      props.cookieStoreId = entry.cookieStoreId;
    }
    try {
      await browser.tabs.create(props);
    } catch (e) {
      delete props.cookieStoreId; // container may no longer exist
      await browser.tabs.create(props);
    }
    archive.splice(index, 1);
    await browser.storage.local.set({ archive });
    return true;
  }

  async deleteFromArchive(ids) {
    const drop = new Set(ids);
    const archive = (await this.getArchive()).filter(e => !drop.has(e.id));
    await browser.storage.local.set({ archive });
  }

  // ─── URL helpers ────────────────────────────────────────────────────────
  isInternalUrl(url) {
    if (!url) return true;
    return url.startsWith('about:') ||
           url.startsWith('chrome:') ||
           url.startsWith('moz-extension:') ||
           url.startsWith('data:');
  }

  stripScheme(url) {
    return (url || '').replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/#.*$/, '').replace(/\/+$/, '');
  }

  hostOf(url) {
    try { return new URL(url).hostname.toLowerCase(); } catch (e) { return ''; }
  }

  // Whitelist entries: "github.com" (domain + subdomains), "github.com/me/repo"
  // (URL prefix), "https://site.com/page", or a trailing "*" for a raw prefix.
  isExcluded(url) {
    const rules = this.config.excludedDomains;
    if (!url || !rules || rules.length === 0) return false;
    const host = this.hostOf(url);
    const plain = this.stripScheme(url).toLowerCase();
    return rules.some(raw => {
      const rule = this.stripScheme((raw || '').trim()).toLowerCase().replace(/^\*\./, '');
      if (!rule) return false;
      if (rule.endsWith('*')) return plain.startsWith(rule.slice(0, -1));
      if (!rule.includes('/')) return host === rule || host.endsWith('.' + rule);
      if (!plain.startsWith(rule)) return false;
      const next = plain.charAt(rule.length);
      return next === '' || next === '/' || next === '?';
    });
  }

  isDomainExcluded(url) { return this.isExcluded(url); }

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
      if (age >= maxAge && !activeTabIds.has(tab.id) && !this.isInternalUrl(tab.url) &&
          !this.isDomainExcluded(tab.url) && !(this.config.excludeAudibleTabs && tab.audible)) {
        if (tab.pinned || tab.grouped) {
          if (!tab.discarded) oldProtected++;
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
      action: (tab.pinned || tab.grouped) ? 'discard' : 'close'
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