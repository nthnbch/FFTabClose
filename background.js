/**
 * FFTabClose - Auto Tab Closer for Firefox
 * Background Script for Manifest V2
 * Automatically closes non-pinned tabs after configurable timeout
 */

// Default configuration
const DEFAULT_CONFIG = {
  autoCloseTime: 12 * 60 * 60 * 1000, // 12 hours default
  enabled: true,
  excludePinned: true,
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
  await loadConfiguration();
  await loadTabTimestamps();
  await initializeExistingTabs();
  setupAlarm();
  console.log('FFTabClose: Extension initialized');
}

/**
 * Load configuration from storage
 */
async function loadConfiguration() {
  try {
    const result = await browser.storage.sync.get(STORAGE_CONFIG_KEY);
    if (result[STORAGE_CONFIG_KEY]) {
      currentConfig = { ...DEFAULT_CONFIG, ...result[STORAGE_CONFIG_KEY] };
    }
  } catch (error) {
    console.warn('FFTabClose: Failed to load config, using defaults:', error);
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
      tabTimestamps = new Map(Object.entries(result[STORAGE_TIMESTAMPS_KEY]));
    }
  } catch (error) {
    console.warn('FFTabClose: Failed to load timestamps:', error);
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
      if (!tab.pinned) {
        registerTab(tab.id, now);
      }
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
  const now = timestamp || Date.now();
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
function setupAlarm() {
  if (!currentConfig.enabled) return;
  
  // Clear existing alarm
  browser.alarms.clear(alarmName);
  
  // Create new alarm (check every 5 minutes)
  browser.alarms.create(alarmName, { periodInMinutes: 5 });
}

/**
 * Check and close/discard expired tabs
 */
async function checkAndCloseTabs() {
  if (!currentConfig.enabled) return;
  
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    const tabsToClose = [];
    const tabsToDiscard = [];
    
    for (const tab of tabs) {
      const action = await getTabAction(tab, now);
      if (action === 'close') {
        tabsToClose.push(tab.id);
      } else if (action === 'discard') {
        tabsToDiscard.push(tab.id);
      }
    }
    
    let totalProcessed = 0;
    
    // Close regular expired tabs
    if (tabsToClose.length > 0) {
      await browser.tabs.remove(tabsToClose);
      
      // Remove from timestamps
      tabsToClose.forEach(tabId => unregisterTab(tabId));
      
      console.log(`FFTabClose: Closed ${tabsToClose.length} expired tab(s)`);
      totalProcessed += tabsToClose.length;
    }
    
    // Discard pinned expired tabs
    if (tabsToDiscard.length > 0) {
      for (const tabId of tabsToDiscard) {
        try {
          await browser.tabs.discard(tabId);
          // Reset timestamp for discarded tabs so they get a fresh start
          registerTab(tabId, now);
        } catch (error) {
          console.warn(`FFTabClose: Failed to discard tab ${tabId}:`, error);
        }
      }
      
      console.log(`FFTabClose: Discarded ${tabsToDiscard.length} pinned tab(s)`);
      totalProcessed += tabsToDiscard.length;
    }
    
    if (totalProcessed > 0) {
      await saveTabTimestamps();
      
      // Show notification badge
      await showNotificationBadge(totalProcessed);
    }
    
  } catch (error) {
    console.error('FFTabClose: Error checking tabs:', error);
  }
}

/**
 * Determine what action to take for a tab (close, discard, or none)
 */
async function getTabAction(tab, now) {
  // Never touch active tab
  if (tab.active) return 'none';
  
  // Check if tab is expired
  const timestamp = tabTimestamps.get(tab.id.toString());
  if (!timestamp) {
    // Register tab if not found
    registerTab(tab.id, now);
    return 'none';
  }
  
  const age = now - timestamp;
  if (age <= currentConfig.autoCloseTime) {
    return 'none';
  }
  
  // Tab is expired, determine action based on type
  
  // Handle pinned tabs
  if (tab.pinned) {
    if (currentConfig.excludePinned) {
      return 'none'; // Don't touch pinned tabs if excluded
    } else if (currentConfig.discardPinned) {
      return 'discard'; // Discard pinned tabs instead of closing
    } else {
      return 'close'; // Close pinned tabs (if user really wants to)
    }
  }
  
  // Handle audible tabs
  if (currentConfig.excludeAudible && tab.audible) {
    return 'none';
  }
  
  // Regular non-pinned tabs get closed
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
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    
    let eligibleTabs = 0;
    let pinnedTabsToDiscard = 0;
    let oldestTabAge = 0;
    
    for (const tab of tabs) {
      if (!tab.active) {
        const action = await getTabAction(tab, now);
        if (action === 'close') {
          eligibleTabs++;
        } else if (action === 'discard') {
          pinnedTabsToDiscard++;
        }
        
        const timestamp = tabTimestamps.get(tab.id.toString());
        if (timestamp) {
          const age = now - timestamp;
          oldestTabAge = Math.max(oldestTabAge, age);
        }
      }
    }
    
    return {
      totalTabs: tabs.length,
      eligibleTabs,
      pinnedTabsToDiscard,
      oldestTabAge: Math.floor(oldestTabAge / (60 * 1000)), // in minutes
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
    switch (message.action) {
      case 'getConfig':
        sendResponse({ success: true, config: currentConfig });
        break;
        
      case 'updateConfig':
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

// Event Listeners

// Extension startup/install
browser.runtime.onStartup.addListener(initialize);
browser.runtime.onInstalled.addListener(initialize);

// Tab events
browser.tabs.onCreated.addListener((tab) => {
  if (!tab.pinned) {
    registerTab(tab.id);
    saveTabTimestamps();
  }
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    if (!tab.pinned) {
      registerTab(tabId);
      saveTabTimestamps();
    }
  }
});

browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then(tab => {
    if (!tab.pinned) {
      registerTab(activeInfo.tabId);
      saveTabTimestamps();
    }
  }).catch(error => {
    console.warn('FFTabClose: Failed to get active tab:', error);
  });
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

// Message handling
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Indicate async response
});
