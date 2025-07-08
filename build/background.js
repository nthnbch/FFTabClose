/**
 * FFTabClose - Auto Tab Closer for Firefox
 * Background Script for Manifest V2
 * Automatically closes non-pinned tabs after configurable timeout
 */

// Default configuration
const DEFAULT_CONFIG = {
  autoCloseTime: 12 * 60 * 60 * 1000, // 12 hours default (production ready)
  enabled: true,
  excludePinned: false, // Allow processing pinned tabs
  excludeAudible: true,
  discardPinned: true // Discard pinned tabs instead of closing them
};

// Storage keys
const STORAGE_CONFIG_KEY = 'fftabclose_config';
const STORAGE_TIMESTAMPS_KEY = 'fftabclose_timestamps';

// Global state
let tabTimestamps = new Map();
let alarmName = 'fftabclose_check';
let currentConfig = { ...DEFAULT_CONFIG };

/**
 * Initialize extension on startup/install
 */
async function initialize() {
  try {
    await loadConfiguration();
    await loadTabTimestamps();
    await initializeExistingTabs();
    await setupAlarm();
  } catch (error) {
    console.error('FFTabClose: Failed to initialize extension:', error);
  }
}

/**
 * Load configuration from storage
 */
async function loadConfiguration() {
  try {
    const result = await browser.storage.sync.get(STORAGE_CONFIG_KEY);
    if (result[STORAGE_CONFIG_KEY]) {
      const storedConfig = result[STORAGE_CONFIG_KEY];
      
      // Validation et sanitisation des données stockées
      const sanitizedConfig = {};
      
      // Validation autoCloseTime
      if (typeof storedConfig.autoCloseTime === 'number' && 
          storedConfig.autoCloseTime >= 120000 && 
          storedConfig.autoCloseTime <= 172800000) {
        sanitizedConfig.autoCloseTime = storedConfig.autoCloseTime;
      }
      
      // Validation boolean values
      if (typeof storedConfig.enabled === 'boolean') {
        sanitizedConfig.enabled = storedConfig.enabled;
      }
      if (typeof storedConfig.excludePinned === 'boolean') {
        sanitizedConfig.excludePinned = storedConfig.excludePinned;
      }
      if (typeof storedConfig.excludeAudible === 'boolean') {
        sanitizedConfig.excludeAudible = storedConfig.excludeAudible;
      }
      if (typeof storedConfig.discardPinned === 'boolean') {
        sanitizedConfig.discardPinned = storedConfig.discardPinned;
      }
      
      currentConfig = { ...DEFAULT_CONFIG, ...sanitizedConfig };
    }
  } catch (error) {
    console.warn('FFTabClose: Failed to load config, using defaults:', error);
    currentConfig = { ...DEFAULT_CONFIG };
  }
}

/**
 * Save configuration to storage
 */
async function saveConfiguration() {
  try {
    await browser.storage.sync.set({ [STORAGE_CONFIG_KEY]: currentConfig });
  } catch (error) {
    console.error('FFTabClose: Failed to save config:', error);
  }
}

/**
 * Load tab timestamps from storage
 */
async function loadTabTimestamps() {
  try {
    const result = await browser.storage.local.get(STORAGE_TIMESTAMPS_KEY);
    if (result[STORAGE_TIMESTAMPS_KEY]) {
      const storedTimestamps = result[STORAGE_TIMESTAMPS_KEY];
      
      // Validation et sanitisation des timestamps
      const sanitizedTimestamps = new Map();
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 jours maximum
      
      for (const [tabId, timestamp] of Object.entries(storedTimestamps)) {
        // Validation du tabId (doit être un nombre)
        const numericTabId = parseInt(tabId);
        if (isNaN(numericTabId) || numericTabId <= 0) {
          continue;
        }
        
        // Validation du timestamp
        if (typeof timestamp === 'number' && 
            timestamp > 0 && 
            timestamp <= now &&
            (now - timestamp) <= maxAge) {
          sanitizedTimestamps.set(tabId, timestamp);
        }
      }
      
      tabTimestamps = sanitizedTimestamps;
    }
  } catch (error) {
    console.warn('FFTabClose: Failed to load timestamps:', error);
    tabTimestamps = new Map();
  }
}

/**
 * Save tab timestamps to storage
 */
async function saveTabTimestamps() {
  try {
    const timestampsObject = Object.fromEntries(tabTimestamps);
    await browser.storage.local.set({ [STORAGE_TIMESTAMPS_KEY]: timestampsObject });
  } catch (error) {
    console.error('FFTabClose: Failed to save timestamps:', error);
  }
}

/**
 * Initialize timestamps for existing tabs
 */
async function initializeExistingTabs() {
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    
    for (const tab of tabs) {
      // Register ALL tabs, including pinned ones
      registerTab(tab.id, now);
    }
    
    await saveTabTimestamps();
  } catch (error) {
    console.error('FFTabClose: Failed to initialize existing tabs:', error);
  }
}

/**
 * Register a tab with current timestamp
 */
function registerTab(tabId, timestamp = null) {
  // Validation du tabId
  if (typeof tabId !== 'number' || tabId <= 0) {
    console.warn('FFTabClose: Invalid tabId for registration:', tabId);
    return;
  }
  
  const now = timestamp || Date.now();
  
  // Validation du timestamp
  if (typeof now !== 'number' || now <= 0) {
    console.warn('FFTabClose: Invalid timestamp for registration:', now);
    return;
  }
  
  tabTimestamps.set(tabId.toString(), now);
}

/**
 * Unregister a tab
 */
function unregisterTab(tabId) {
  tabTimestamps.delete(tabId.toString());
}

/**
 * Setup periodic alarm for checking tabs
 */
async function setupAlarm() {
  if (!currentConfig.enabled) {
    return;
  }
  
  try {
    await browser.alarms.clear(alarmName);
    await browser.alarms.create(alarmName, { periodInMinutes: 1 });
    setupBackupInterval();
  } catch (error) {
    console.error('FFTabClose: Failed to setup alarm:', error);
    setupBackupInterval();
  }
}

/**
 * Setup backup interval as fallback if alarms don't work
 */
function setupBackupInterval() {
  if (window.ffTabCloseInterval) {
    clearInterval(window.ffTabCloseInterval);
  }
  
  // Set up a 1-minute interval as backup
  window.ffTabCloseInterval = setInterval(() => {
    checkAndCloseTabs();
  }, 60000); // 1 minute
}

/**
 * Check and close/discard expired tabs
 */
async function checkAndCloseTabs() {
  if (!currentConfig.enabled) {
    console.log('FFTabClose: Auto-closing disabled, skipping check.');
    return;
  }

  console.log('FFTabClose: Running scheduled check for old tabs...');
  const now = Date.now();
  const tabsToClose = [];
  const tabsToDiscard = [];

  try {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      const action = getTabAction(tab, now);
      if (action === 'close') {
        tabsToClose.push(tab.id);
      } else if (action === 'discard') {
        tabsToDiscard.push(tab.id);
      }
    }

    if (tabsToClose.length > 0) {
      console.log(`FFTabClose: Closing ${tabsToClose.length} tabs.`);
      try {
        await browser.tabs.remove(tabsToClose);
        console.log('FFTabClose: Successfully closed tabs:', tabsToClose);
      } catch (error) {
        console.error(`FFTabClose: Error closing tabs in batch: ${error}. Trying individually.`);
        for (const tabId of tabsToClose) {
          try {
            await browser.tabs.remove(tabId);
          } catch (e) {
            console.error(`FFTabClose: Failed to close tab ${tabId}:`, e);
          }
        }
      }
    }

    if (tabsToDiscard.length > 0) {
      console.log(`FFTabClose: Discarding ${tabsToDiscard.length} tabs.`);
      try {
        await browser.tabs.discard(tabsToDiscard);
        console.log('FFTabClose: Successfully discarded tabs:', tabsToDiscard);
      } catch (error) {
        console.error(`FFTabClose: Error discarding tabs in batch: ${error}. Trying individually.`);
        for (const tabId of tabsToDiscard) {
          try {
            await browser.tabs.discard(tabId);
          } catch (e) {
            console.error(`FFTabClose: Failed to discard tab ${tabId}:`, e);
          }
        }
      }
    }

    if (tabsToClose.length === 0 && tabsToDiscard.length === 0) {
      console.log('FFTabClose: No tabs to close or discard at this time.');
    }

  } catch (error) {
    console.error('FFTabClose: Failed during tab check:', error);
  }
}


/**
 * Determine what action to take for a tab (close, discard, or none)
 */
function getTabAction(tab, now) {
  const timestamp = tabTimestamps.get(tab.id.toString());
  if (!timestamp) {
    // If a tab has no timestamp, it might be new. Register it.
    registerTab(tab.id, now);
    return 'none';
  }

  const age = now - timestamp;
  if (age < currentConfig.autoCloseTime) {
    return 'none'; // Not old enough
  }

  // Handle pinned tabs
  if (tab.pinned) {
    if (currentConfig.excludePinned) {
      return 'none'; // Excluded by user setting
    }
    if (currentConfig.discardPinned) {
      return 'discard'; // Discard instead of closing
    }
  }

  // Handle audible tabs
  if (currentConfig.excludeAudible && tab.audible) {
    return 'none'; // Excluded by user setting
  }

  // If we reach here, the tab is eligible for closing
  return 'close';
}

/**
 * Show notification badge
 */
async function showNotificationBadge(count) {
  try {
    await browser.browserAction.setBadgeText({ text: count.toString() });
    await browser.browserAction.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    // Clear badge after 3 seconds
    setTimeout(async () => {
      try {
        await browser.browserAction.setBadgeText({ text: '' });
      } catch (error) {
        console.warn('FFTabClose: Failed to clear badge:', error);
      }
    }, 3000);
  } catch (error) {
    console.warn('FFTabClose: Failed to show badge:', error);
  }
}

/**
 * Get extension statistics
 */
async function getStats() {
  try {
    // Get ALL tabs from ALL windows and workspaces - comprehensive approach
    let tabs = [];
    
    try {
      // Try to get all tabs directly first (works across all spaces in Zen Browser)
      tabs = await browser.tabs.query({});
    } catch (error) {
      console.warn('FFTabClose: Direct tab query failed in getStats, trying window-based approach:', error);
      
      // Fallback: get tabs from windows
      const allWindows = await browser.windows.getAll({
        populate: true, 
        windowTypes: ['normal', 'popup', 'panel', 'app', 'devtools']
      });
      
      for (const window of allWindows) {
        tabs.push(...window.tabs);
      }
    }
    
    const now = Date.now();
    
    let eligibleTabs = 0;
    let pinnedTabsToDiscard = 0;
    let totalPinnedTabs = 0;
    let normalTabs = 0;
    
    // Count ALL tabs across all spaces/windows
    for (const tab of tabs) {
      // Count pinned tabs separately
      if (tab.pinned) {
        totalPinnedTabs++;
      } else {
        normalTabs++;
      }
      
      const action = getTabAction(tab, now);
      if (action === 'close') {
        eligibleTabs++;
      } else if (action === 'discard') {
        pinnedTabsToDiscard++;
      }
    }
    
    return {
      totalTabs: tabs.length,
      normalTabs, // New: normal (non-pinned) tabs count
      eligibleTabs,
      pinnedTabsToDiscard,
      totalPinnedTabs, // New: total pinned tabs count
      enabled: currentConfig.enabled,
      autoCloseTime: Math.floor(currentConfig.autoCloseTime / (60 * 60 * 1000)) // in hours
    };
  } catch (error) {
    console.error('FFTabClose: Failed to get stats:', error);
    return null;
  }
}

/**
 * Handle messages from popup
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    // Validation stricte des entrées
    if (!message || typeof message !== 'object' || !message.action) {
      sendResponse({ success: false, error: 'Invalid message format' });
      return;
    }

    // Validation de l'origine du message (popup ou content script)
    // Les messages du popup n'ont pas de sender.tab, c'est normal

    switch (message.action) {
      case 'getConfig':
        sendResponse({ success: true, config: currentConfig });
        break;
        
      case 'updateConfig':
        if (!message.config || typeof message.config !== 'object') {
          sendResponse({ success: false, error: 'Invalid config format' });
          return;
        }
        
        // Validation des clés autorisées
        const allowedKeys = ['autoCloseTime', 'enabled', 'excludePinned', 'excludeAudible', 'discardPinned'];
        const configKeys = Object.keys(message.config);
        
        for (const key of configKeys) {
          if (!allowedKeys.includes(key)) {
            sendResponse({ success: false, error: `Invalid config key: ${key}` });
            return;
          }
        }
        
        // Validation des valeurs
        if (message.config.autoCloseTime !== undefined) {
          if (typeof message.config.autoCloseTime !== 'number' || 
              message.config.autoCloseTime < 120000 || // minimum 2 minutes
              message.config.autoCloseTime > 172800000) { // maximum 48 hours
            sendResponse({ success: false, error: 'Invalid autoCloseTime value' });
            return;
          }
        }
        
        currentConfig = { ...currentConfig, ...message.config };
        await saveConfiguration();
        setupAlarm(); // Restart alarm with new config
        sendResponse({ success: true });
        break;
        
      case 'getStats':
        const stats = await getStats();
        sendResponse({ success: true, stats });
        break;
        
      case 'checkNow':
        await checkAndCloseTabs();
        sendResponse({ success: true });
        break;
        
      case 'manualClose':
        // Manual close - process ALL eligible tabs, including active ones in other windows
        await manualCloseOldTabs();
        sendResponse({ success: true });
        break;
        
      case 'testMode':
        // Special test mode - mark all non-active tabs as old
        const testTabs = await browser.tabs.query({});
        const veryOldTime = Date.now() - (currentConfig.autoCloseTime + 60000); // 1 minute older than timeout
        
        for (const tab of testTabs) {
          if (!tab.active) {
            registerTab(tab.id, veryOldTime);
          }
        }
        
        await saveTabTimestamps();
        await checkAndCloseTabs();
        sendResponse({ success: true, message: 'Test mode activated and check executed' });
        break;
        
      case 'debugInfo':
        // Debug function to check current state
        const debugTabs = await browser.tabs.query({});
        const debugNow = Date.now();
        const debugInfo = {
          config: currentConfig,
          tabCount: debugTabs.length,
          timestamps: Object.fromEntries(tabTimestamps),
          tabDetails: debugTabs.map(tab => ({
            id: tab.id,
            title: tab.title.substring(0, 30),
            pinned: tab.pinned,
            active: tab.active,
            audible: tab.audible,
            timestamp: tabTimestamps.get(tab.id.toString()),
            age: tabTimestamps.get(tab.id.toString()) ? debugNow - tabTimestamps.get(tab.id.toString()) : 0,
            action: getTabAction(tab, debugNow)
          }))
        };
        sendResponse({ success: true, debugInfo });
        break;
        
      case 'resetStats':
        tabTimestamps.clear();
        await saveTabTimestamps();
        await initializeExistingTabs();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('FFTabClose: Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Manually close/discard old tabs - includes ALL eligible tabs
 * Used by the manual "Close now" button
 */
async function manualCloseOldTabs() {
  if (!currentConfig.enabled) {
    console.warn('FFTabClose: Manual close triggered but extension is disabled.');
    return { success: false, message: 'Extension is disabled.' };
  }

  console.log('FFTabClose: Manual close triggered. Finding and closing old tabs...');
  await checkAndCloseTabs(); // Reuse the main logic for simplicity and consistency
  return { success: true, message: 'Manual close process completed.' };
}

// Event Listeners

// Extension startup/install
browser.runtime.onStartup.addListener(initialize);
browser.runtime.onInstalled.addListener(initialize);

// Tab events - optimized for minimal overhead
browser.tabs.onCreated.addListener((tab) => {
  registerTab(tab.id);
  // Debounced save to avoid excessive storage writes
  clearTimeout(window.saveDebounce);
  window.saveDebounce = setTimeout(saveTabTimestamps, 1000);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    registerTab(tabId);
    clearTimeout(window.saveDebounce);
    window.saveDebounce = setTimeout(saveTabTimestamps, 1000);
  }
});

browser.tabs.onActivated.addListener((activeInfo) => {
  registerTab(activeInfo.tabId);
  clearTimeout(window.saveDebounce);
  window.saveDebounce = setTimeout(saveTabTimestamps, 1000);
});

browser.tabs.onRemoved.addListener((tabId) => {
  unregisterTab(tabId);
  clearTimeout(window.saveDebounce);
  window.saveDebounce = setTimeout(saveTabTimestamps, 1000);
});

// Alarm for periodic checks
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmName) {
    checkAndCloseTabs();
  }
});

// Message handling
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Indicate async response
});
