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
const STORAGE_STATS_KEY = 'fftabclose_stats'; // For storing stats

// Global state
let tabTimestamps = new Map();
let alarmName = 'fftabclose_check';
let currentConfig = { ...DEFAULT_CONFIG };
let lastClosedCount = 0; // Track last closed count

/**
 * Initialize extension on startup/install
 */
async function initialize() {
  try {
    await loadConfiguration();
    await loadTabTimestamps();
    await initializeExistingTabs();
    await setupAlarm();
    console.log('FFTabClose: Extension initialized successfully.');
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
      currentConfig = { ...DEFAULT_CONFIG, ...result[STORAGE_CONFIG_KEY] };
      console.log('FFTabClose: Configuration loaded.', currentConfig);
    } else {
      console.log('FFTabClose: No configuration found, using defaults.');
      currentConfig = { ...DEFAULT_CONFIG };
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
    console.log('FFTabClose: Configuration saved.');
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
      // Ensure timestamps are numbers
      for (const key in storedTimestamps) {
        if (typeof storedTimestamps[key] === 'number') {
          tabTimestamps.set(key, storedTimestamps[key]);
        }
      }
      console.log(`FFTabClose: Loaded ${tabTimestamps.size} timestamps.`);
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
      if (tab.id && !tabTimestamps.has(tab.id.toString())) {
        registerTab(tab.id, now);
      }
    }
    
    await saveTabTimestamps();
    console.log(`FFTabClose: Initialized ${tabs.length} existing tabs.`);
  } catch (error) {
    console.error('FFTabClose: Failed to initialize existing tabs:', error);
  }
}

/**
 * Register a tab with current timestamp
 */
function registerTab(tabId, timestamp = null) {
  if (typeof tabId !== 'number' || tabId <= 0) {
    // console.warn('FFTabClose: Invalid tabId for registration:', tabId);
    return;
  }
  
  const now = timestamp || Date.now();
  tabTimestamps.set(tabId.toString(), now);
}

/**
 * Unregister a tab
 */
function unregisterTab(tabId) {
  if (typeof tabId === 'number') {
    tabTimestamps.delete(tabId.toString());
  }
}

/**
 * Setup periodic alarm for checking tabs
 */
async function setupAlarm() {
  try {
    // Clear any existing alarm before creating a new one
    await browser.alarms.clear(alarmName);
    if (currentConfig.enabled) {
      browser.alarms.create(alarmName, {
        delayInMinutes: 1,
        periodInMinutes: 1
      });
      console.log(`FFTabClose: Alarm created. Close time: ${currentConfig.autoCloseTime / 60000} minutes.`);
    } else {
      console.log('FFTabClose: Extension is disabled, alarm not set.');
    }
  } catch (error) {
    console.error('FFTabClose: Failed to setup alarm:', error);
  }
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
  if (count > 0) {
    await browser.browserAction.setBadgeText({ text: count.toString() });
    await browser.browserAction.setBadgeBackgroundColor({ color: '#dc3545' });
  }
}

/**
 * Clear notification badge
 */
async function clearNotificationBadge() {
    await browser.browserAction.setBadgeText({ text: '' });
}

/**
 * Get extension statistics
 */
async function getStats() {
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    let normalTabs = 0;
    let eligibleTabs = 0;
    let pinnedTabs = 0;
    let pinnedToDiscard = 0;

    for (const tab of tabs) {
      if (tab.pinned) {
        pinnedTabs++;
      } else {
        normalTabs++;
      }
      
      const action = getTabAction(tab, now);
      if (action === 'close') {
        eligibleTabs++;
      } else if (action === 'discard') {
        pinnedToDiscard++;
      }
    }
    
    return {
      success: true,
      stats: {
        totalTabs: tabs.length,
        normalTabs,
        eligibleTabs,
        totalPinnedTabs: pinnedTabs,
        pinnedTabsToDiscard: pinnedToDiscard,
        lastClosedCount
      }
    };
  } catch (error) {
    console.error('FFTabClose: Failed to get stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Handle messages from popup
 */
async function handleMessage(message) {
  console.log("FFTabClose: Message received", message);
  switch (message.action) {
    case 'getConfig':
      return { success: true, config: currentConfig };
    
    case 'setConfig':
      currentConfig = { ...currentConfig, ...message.config };
      await saveConfiguration();
      // Re-evaluate the alarm state if 'enabled' status changed
      await setupAlarm();
      return { success: true };
      
    case 'getStats':
      return await getStats();
      
    case 'manualClose':
      return await manualCloseOldTabs();
      
    default:
      return { success: false, error: 'Unknown action' };
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

// --- Event Listeners ---

// Initialize on first install or when the extension is updated.
browser.runtime.onInstalled.addListener(initialize);
// Initialize when the browser starts.
browser.runtime.onStartup.addListener(initialize);

// Tab events - optimized for minimal overhead
browser.tabs.onCreated.addListener((tab) => {
  if (tab.id) {
    registerTab(tab.id);
    saveTabTimestamps(); // Save immediately
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Update timestamp if URL changes, to prevent closing a tab being used.
  if (changeInfo.url) {
    registerTab(tabId);
    saveTabTimestamps();
  }
});

browser.tabs.onActivated.addListener((activeInfo) => {
  registerTab(activeInfo.tabId);
  saveTabTimestamps();
});

browser.tabs.onRemoved.addListener((tabId) => {
  unregisterTab(tabId);
  saveTabTimestamps();
});

// Alarm for periodic checks
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === alarmName) {
    checkAndCloseTabs();
  }
});

// Message handling from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // handleMessage is async, so we need to return a promise.
  handleMessage(message).then(sendResponse).catch(error => {
    console.error("FFTabClose: Error handling message:", error);
    sendResponse({ success: false, error: error.message });
  });
  return true; // Indicate that the response is sent asynchronously.
});
