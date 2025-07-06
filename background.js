/**
 * FFTabClose - Auto Tab Closer for Firefox
 * Background Script for Manifest V2
 * Automatically closes non-pinned tabs after configurable timeout
 */

// Default configuration
const DEFAULT_CONFIG = {
  autoCloseTime: 12 * 60 * 60 * 1000, // 12 hours default
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
  console.log('FFTabClose: Starting initialization...');
  await loadConfiguration();
  console.log('FFTabClose: Config loaded:', currentConfig);
  await loadTabTimestamps();
  console.log('FFTabClose: Timestamps loaded, count:', tabTimestamps.size);
  await initializeExistingTabs();
  setupAlarm();
  console.log('FFTabClose: Extension initialized successfully');
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
      // Register ALL tabs, including pinned ones
      registerTab(tab.id, now);
    }
    
    await saveTabTimestamps();
    console.log(`FFTabClose: Initialized timestamps for ${tabs.length} existing tabs`);
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
  if (!currentConfig.enabled) {
    console.log('FFTabClose: Extension disabled, skipping check');
    return;
  }
  
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    const tabsToClose = [];
    const tabsToDiscard = [];
    
    console.log(`FFTabClose: Checking ${tabs.length} tabs (timeout: ${currentConfig.autoCloseTime}ms)`);
    
    for (const tab of tabs) {
      const action = getTabAction(tab, now);
      console.log(`FFTabClose: Tab ${tab.id} (${tab.title.substring(0, 30)}...) - Action: ${action}`);
      
      if (action === 'close') {
        tabsToClose.push(tab.id);
      } else if (action === 'discard') {
        tabsToDiscard.push(tab.id);
      }
    }
    
    let totalProcessed = 0;
    
    // Close regular expired tabs
    if (tabsToClose.length > 0) {
      console.log(`FFTabClose: Closing ${tabsToClose.length} expired tabs`);
      await browser.tabs.remove(tabsToClose);
      
      // Remove from timestamps
      tabsToClose.forEach(tabId => unregisterTab(tabId));
      
      console.log(`FFTabClose: Closed ${tabsToClose.length} expired tab(s)`);
      totalProcessed += tabsToClose.length;
    }
    
    // Discard pinned expired tabs
    if (tabsToDiscard.length > 0) {
      console.log(`FFTabClose: Discarding ${tabsToDiscard.length} pinned tabs`);
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
    } else {
      console.log('FFTabClose: No tabs to process');
    }
    
  } catch (error) {
    console.error('FFTabClose: Error checking tabs:', error);
  }
}

/**
 * Determine what action to take for a tab (close, discard, or none)
 */
function getTabAction(tab, now) {
  // Never touch active tab
  if (tab.active) {
    console.log(`Tab ${tab.id} is active, skipping`);
    return 'none';
  }
  
  // Check if tab is expired
  const timestamp = tabTimestamps.get(tab.id.toString());
  if (!timestamp) {
    // Register tab if not found
    console.log(`Tab ${tab.id} has no timestamp, registering now`);
    registerTab(tab.id, now);
    return 'none';
  }
  
  const age = now - timestamp;
  const ageMinutes = Math.floor(age / (60 * 1000));
  const timeoutMinutes = Math.floor(currentConfig.autoCloseTime / (60 * 1000));
  
  console.log(`Tab ${tab.id}: age=${ageMinutes}min, timeout=${timeoutMinutes}min, pinned=${tab.pinned}, audible=${tab.audible}`);
  
  if (age <= currentConfig.autoCloseTime) {
    return 'none';
  }
  
  // Tab is expired, determine action based on type
  console.log(`Tab ${tab.id} is EXPIRED (${ageMinutes}min > ${timeoutMinutes}min)`);
  
  // Handle pinned tabs
  if (tab.pinned) {
    if (currentConfig.excludePinned) {
      console.log(`Tab ${tab.id} is pinned and excluded`);
      return 'none'; // Don't touch pinned tabs if excluded
    } else if (currentConfig.discardPinned) {
      console.log(`Tab ${tab.id} is pinned, will discard`);
      return 'discard'; // Discard pinned tabs instead of closing
    } else {
      console.log(`Tab ${tab.id} is pinned, will close`);
      return 'close'; // Close pinned tabs (if user really wants to)
    }
  }
  
  // Handle audible tabs
  if (currentConfig.excludeAudible && tab.audible) {
    console.log(`Tab ${tab.id} has audio and is excluded`);
    return 'none';
  }
  
  // Regular non-pinned tabs get closed
  console.log(`Tab ${tab.id} is regular tab, will close`);
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
        const action = getTabAction(tab, now);
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
        console.log('FFTabClose: Manual check triggered');
        await checkAndCloseTabs();
        sendResponse({ success: true });
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
        console.log('FFTabClose Debug Info:', debugInfo);
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

// Event Listeners

// Extension startup/install
browser.runtime.onStartup.addListener(initialize);
browser.runtime.onInstalled.addListener(initialize);

// Tab events
browser.tabs.onCreated.addListener((tab) => {
  // Register ALL new tabs, including pinned ones
  registerTab(tab.id);
  saveTabTimestamps();
  console.log(`FFTabClose: Registered new tab ${tab.id}`);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    // Register ALL updated tabs, including pinned ones
    registerTab(tabId);
    saveTabTimestamps();
    console.log(`FFTabClose: Updated timestamp for tab ${tabId}`);
  }
});

browser.tabs.onActivated.addListener((activeInfo) => {
  browser.tabs.get(activeInfo.tabId).then(tab => {
    // Register ALL activated tabs, including pinned ones
    registerTab(activeInfo.tabId);
    saveTabTimestamps();
    console.log(`FFTabClose: Updated timestamp for activated tab ${activeInfo.tabId}`);
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
