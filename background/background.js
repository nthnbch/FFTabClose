/**
 * Tab Auto Closer - Background Script
 * 
 * This script runs in the background and periodically checks for tabs
 * that have been open for more than 12 hours (or user-specified time),
 * then closes them automatically.
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,        // Auto-closing is enabled by default
  closeAfterHours: 12,  // Close tabs after 12 hours by default
  excludePinnedTabs: true // Don't close pinned tabs by default
};

// Map to track when each tab was created
const tabOpenTimes = new Map();

// Initialize extension
function init() {
  // Load settings and set up the periodic check
  loadSettings().then(settings => {
    if (settings.enabled) {
      setupPeriodicCheck(settings);
    }
  });

  // Set up listeners for tab events
  setupTabListeners();

  // Perform an initial scan of existing tabs
  trackExistingTabs();
}

// Load user settings from storage
async function loadSettings() {
  try {
    const result = await browser.storage.local.get('settings');
    return result.settings || DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
}

// Set up periodic check for old tabs
function setupPeriodicCheck(settings) {
  // Clear any existing alarms
  browser.alarms.clearAll();
  
  // Create an alarm that will fire every hour
  browser.alarms.create('checkOldTabs', {
    periodInMinutes: 60 // Check once per hour
  });
  
  // Listen for the alarm
  browser.alarms.onAlarm.addListener(alarm => {
    if (alarm.name === 'checkOldTabs') {
      checkAndCloseOldTabs(settings);
    }
  });
}

// Set up listeners for tab events
function setupTabListeners() {
  // Track when new tabs are created
  browser.tabs.onCreated.addListener(tab => {
    tabOpenTimes.set(tab.id, Date.now());
  });

  // Remove tracking data when tabs are closed
  browser.tabs.onRemoved.addListener(tabId => {
    tabOpenTimes.delete(tabId);
  });

  // Listen for changes to settings
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      const newSettings = changes.settings.newValue;
      if (newSettings.enabled) {
        setupPeriodicCheck(newSettings);
      } else {
        browser.alarms.clearAll();
      }
    }
  });
}

// Track all existing tabs on startup
async function trackExistingTabs() {
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    
    tabs.forEach(tab => {
      // For existing tabs, we don't know when they were created
      // We'll use the current time as a starting point
      tabOpenTimes.set(tab.id, now);
    });
  } catch (error) {
    console.error('Error tracking existing tabs:', error);
  }
}

// Check for old tabs and close them
async function checkAndCloseOldTabs(settings) {
  try {
    const now = Date.now();
    const hourInMs = 3600000; // 1 hour in milliseconds
    const maxAgeMs = settings.closeAfterHours * hourInMs;
    
    // Get all tabs
    const tabs = await browser.tabs.query({});
    
    // Tabs to close
    const tabsToClose = [];
    
    for (const tab of tabs) {
      // Skip if tab is pinned and we're excluding pinned tabs
      if (settings.excludePinnedTabs && tab.pinned) {
        continue;
      }
      
      const openTime = tabOpenTimes.get(tab.id);
      if (openTime && (now - openTime) >= maxAgeMs) {
        tabsToClose.push(tab.id);
      }
    }
    
    // Close the old tabs
    if (tabsToClose.length > 0) {
      await browser.tabs.remove(tabsToClose);
      console.log(`Closed ${tabsToClose.length} tabs that were older than ${settings.closeAfterHours} hours`);
    }
  } catch (error) {
    console.error('Error checking and closing old tabs:', error);
  }
}

// Initialize the extension when the browser starts
init();