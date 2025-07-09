/**
 * FFTabClose - Auto Tab Closer
 * Background script for automatic tab closure and management
 * 
 * Version 2.0.0
 */

// Constants
const DEFAULT_SETTINGS = {
  timeLimit: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
  discardPinnedTabs: false,
  excludeAudioTabs: true,
  closeOnStart: false
};

const ALARM_NAME = 'checkTabsAlarm';
const CHECK_INTERVAL = 5; // Minutes between tab checks
const STORAGE_KEY = 'tabTimestamps';
const SETTINGS_KEY = 'settings';

// State variables
let tabTimestamps = {};
let settings = {};

// Initialize
async function initialize() {
  // Load stored settings
  const storedSettings = await browser.storage.local.get(SETTINGS_KEY);
  settings = { ...DEFAULT_SETTINGS, ...(storedSettings[SETTINGS_KEY] || {}) };
  
  // Load tab timestamps
  const storedTimestamps = await browser.storage.local.get(STORAGE_KEY);
  tabTimestamps = storedTimestamps[STORAGE_KEY] || {};
  
  // Set up alarm for periodic tab checks
  browser.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL });
  
  // Record all current tabs 
  recordAllCurrentTabs();
  
  // Run initial check if enabled
  if (settings.closeOnStart) {
    processTabs();
  }
}

// Tab event listeners
async function recordAllCurrentTabs() {
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  
  tabs.forEach(tab => {
    // Only set timestamp if not already tracked
    if (!tabTimestamps[tab.id]) {
      tabTimestamps[tab.id] = now;
    }
  });
  
  // Save the updated timestamps
  await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
}

async function handleTabCreated(tab) {
  // Set timestamp for new tab
  tabTimestamps[tab.id] = Date.now();
  await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
}

async function handleTabActivated(activeInfo) {
  // Update timestamp when tab is activated
  tabTimestamps[activeInfo.tabId] = Date.now();
  await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
}

async function handleTabRemoved(tabId) {
  // Remove timestamp for closed tab
  if (tabTimestamps[tabId]) {
    delete tabTimestamps[tabId];
    await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
  }
}

async function handleTabUpdated(tabId, changeInfo) {
  // Update timestamp when tab is reloaded or URL changes
  if (changeInfo.status === 'complete' || changeInfo.url) {
    tabTimestamps[tabId] = Date.now();
    await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
  }
}

// Main tab processing function
async function processTabs() {
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  const timeLimit = settings.timeLimit;
  const activeTab = (await browser.tabs.query({ active: true, currentWindow: true }))[0];
  
  // Process each tab
  for (const tab of tabs) {
    // Skip processing if:
    // - Tab is active (currently in use)
    // - Tab ID doesn't have a timestamp (new or untracked)
    // - Tab doesn't have a timestamp that exceeds the limit
    if (
      (activeTab && tab.id === activeTab.id) ||
      !tabTimestamps[tab.id] ||
      (now - tabTimestamps[tab.id] < timeLimit)
    ) {
      continue;
    }

    // Handle audio tabs
    if (tab.audible && settings.excludeAudioTabs) {
      continue;
    }
    
    // Handle pinned tabs
    if (tab.pinned) {
      if (settings.discardPinnedTabs) {
        // Only discard if not already discarded
        if (!tab.discarded) {
          await browser.tabs.discard(tab.id);
        }
      }
      continue;
    }
    
    // Close regular tabs that exceed the time limit
    await browser.tabs.remove(tab.id);
    delete tabTimestamps[tab.id];
  }
  
  // Save the updated timestamps after processing
  await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
}

// Manual close action triggered from popup
async function closeOldTabs() {
  await processTabs();
  return getTabStats();
}

// Get current tab statistics
async function getTabStats() {
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  let eligibleCount = 0;
  let oldestTabAge = 0;
  
  tabs.forEach(tab => {
    // Skip active tab
    if (tab.active) {
      return;
    }
    
    // Skip pinned tabs unless set to discard
    if (tab.pinned && !settings.discardPinnedTabs) {
      return;
    }
    
    // Skip audio tabs if excluded
    if (tab.audible && settings.excludeAudioTabs) {
      return;
    }
    
    const timestamp = tabTimestamps[tab.id] || now;
    const age = now - timestamp;
    
    // Count tabs that will be affected
    if (age >= settings.timeLimit) {
      eligibleCount++;
    }
    
    // Track oldest tab age
    if (age > oldestTabAge) {
      oldestTabAge = age;
    }
  });
  
  return {
    totalTabs: tabs.length,
    eligibleTabs: eligibleCount,
    oldestTabAge: Math.floor(oldestTabAge / (60 * 1000)) // Convert to minutes
  };
}

// Settings management
async function updateSettings(newSettings) {
  settings = { ...settings, ...newSettings };
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

async function getSettings() {
  return settings;
}

// Event listeners
browser.tabs.onCreated.addListener(handleTabCreated);
browser.tabs.onActivated.addListener(handleTabActivated);
browser.tabs.onRemoved.addListener(handleTabRemoved);
browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    processTabs();
  }
});

// Message listener for communication with popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSettings') {
    return getSettings();
  } else if (message.action === 'updateSettings') {
    return updateSettings(message.settings);
  } else if (message.action === 'closeOldTabs') {
    return closeOldTabs();
  } else if (message.action === 'getTabStats') {
    return getTabStats();
  }
});

// Initialize on startup
initialize();
