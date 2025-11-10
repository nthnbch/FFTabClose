/**
 * FFTabClose - Background Script
 * 
 * This script runs in the background and periodically checks for tabs
 * that have been open for more than 12 hours (or user-specified time),
 * then closes them automatically.
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,        // Auto-closing is enabled by default
  closeAfterHours: 0.016667,  // Close tabs after 1 minute by default (for testing)
  excludePinnedTabs: false    // Don't close pinned tabs by default, just discard them
};

// Map to track when each tab was created
const tabOpenTimes = new Map();

// Initialize extension
async function init() {
  console.log('FFTabClose: Initializing extension');
  
  // Load settings and set up the periodic check
  const settings = await loadSettings();
  console.log('FFTabClose: Settings loaded', settings);
  
  // Load saved tab timestamps from storage
  await loadTabTimestamps();
  
  if (settings.enabled) {
    setupPeriodicCheck(settings);
  } else {
    console.log('FFTabClose: Auto-closing is disabled');
  }

  // Set up listeners for tab events
  setupTabListeners();

  // Perform an initial scan of existing tabs
  await trackExistingTabs();
  
  // Set up global alarm listener (only once)
  browser.alarms.onAlarm.addListener(handleAlarm);
  
  console.log('FFTabClose: Initialization complete');
}

// Handle alarm events
async function handleAlarm(alarm) {
  console.log(`FFTabClose: Alarm triggered: ${alarm.name}`);
  
  if (alarm.name === 'checkOldTabs') {
    const settings = await loadSettings();
    if (settings.enabled) {
      await checkAndCloseOldTabs(settings);
    } else {
      console.log('FFTabClose: Auto-closing is disabled, skipping check');
    }
  }
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
  
  // Create an alarm that will fire every minute (for testing)
  browser.alarms.create('checkOldTabs', {
    periodInMinutes: 0.5 // Check every 30 seconds (for testing)
  });
  
  console.log(`Periodic check set up to run every 30 seconds with close after ${settings.closeAfterHours} hours (${settings.closeAfterHours * 60} minutes)`);
}

// Set up listeners for tab events
function setupTabListeners() {
  console.log('FFTabClose: Setting up tab event listeners');
  
  // Track when new tabs are created
  browser.tabs.onCreated.addListener(async tab => {
    console.log(`FFTabClose: New tab created: ${tab.id} (${tab.title})`);
    tabOpenTimes.set(tab.id, Date.now());
    await saveTabTimestamps();
  });

  // Remove tracking data when tabs are closed
  browser.tabs.onRemoved.addListener(async tabId => {
    console.log(`FFTabClose: Tab removed: ${tabId}`);
    tabOpenTimes.delete(tabId);
    await saveTabTimestamps();
  });

  // Listen for changes to settings
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      console.log('FFTabClose: Settings changed', changes.settings.newValue);
      const newSettings = changes.settings.newValue;
      if (newSettings.enabled) {
        setupPeriodicCheck(newSettings);
      } else {
        browser.alarms.clearAll();
        console.log('FFTabClose: Alarms cleared due to disabled setting');
      }
    }
  });
  
  console.log('FFTabClose: Tab event listeners set up');
}

// Track all existing tabs on startup
async function trackExistingTabs() {
  try {
    console.log('FFTabClose: Tracking existing tabs');
    const tabs = await browser.tabs.query({});
    console.log(`FFTabClose: Found ${tabs.length} existing tabs`);
    
    const now = Date.now();
    let updated = false;
    let newTabsCount = 0;
    
    tabs.forEach(tab => {
      // Only set timestamp if we don't already have one
      if (!tabOpenTimes.has(tab.id)) {
        tabOpenTimes.set(tab.id, now);
        updated = true;
        newTabsCount++;
        console.log(`FFTabClose: Set timestamp for tab ${tab.id} (${tab.title})`);
      }
    });
    
    console.log(`FFTabClose: Set timestamps for ${newTabsCount} new tabs`);
    
    // Save timestamps to storage if we updated any
    if (updated) {
      await saveTabTimestamps();
    }
  } catch (error) {
    console.error('FFTabClose: Error tracking existing tabs:', error);
  }
}

// Save tab timestamps to storage
async function saveTabTimestamps() {
  try {
    console.log(`FFTabClose: Saving ${tabOpenTimes.size} tab timestamps to storage`);
    
    // Convert Map to object for storage
    const timestampObj = {};
    tabOpenTimes.forEach((timestamp, tabId) => {
      timestampObj[tabId] = timestamp;
    });
    
    await browser.storage.local.set({ tabTimestamps: timestampObj });
    console.log('FFTabClose: Tab timestamps saved to storage');
  } catch (error) {
    console.error('FFTabClose: Error saving tab timestamps:', error);
  }
}

// Load tab timestamps from storage
async function loadTabTimestamps() {
  try {
    console.log('FFTabClose: Loading tab timestamps from storage');
    const result = await browser.storage.local.get('tabTimestamps');
    
    if (result.tabTimestamps) {
      // Convert object back to Map
      Object.entries(result.tabTimestamps).forEach(([tabId, timestamp]) => {
        tabOpenTimes.set(parseInt(tabId), timestamp);
      });
      console.log(`FFTabClose: Loaded ${tabOpenTimes.size} tab timestamps from storage`);
      
      // Log some examples for debugging
      let count = 0;
      for (const [tabId, timestamp] of tabOpenTimes.entries()) {
        const date = new Date(timestamp);
        console.log(`FFTabClose: Tab ${tabId} timestamp: ${date.toISOString()} (${timestamp})`);
        count++;
        if (count >= 5) break; // Just show a few examples
      }
    } else {
      console.log('FFTabClose: No saved timestamps found in storage');
    }
  } catch (error) {
    console.error('FFTabClose: Error loading tab timestamps:', error);
  }
}

// Check for old tabs and close them
async function checkAndCloseOldTabs(settings) {
  try {
    console.log('FFTabClose: Checking for old tabs to close...');
    
    const now = Date.now();
    const hourInMs = 3600000; // 1 hour in milliseconds
    const maxAgeMs = settings.closeAfterHours * hourInMs;
    
    console.log(`FFTabClose: Max age threshold: ${settings.closeAfterHours} hours (${maxAgeMs}ms)`);
    
    // Get all tabs across all spaces/containers
    const tabs = await browser.tabs.query({});
    console.log(`FFTabClose: Found ${tabs.length} total tabs`);
    
    // Log current timestamps
    console.log(`FFTabClose: Current tab timestamps: ${tabOpenTimes.size} entries`);
    
    // Tabs to close (non-pinned)
    const tabsToClose = [];
    // Tabs to discard (pinned)
    const tabsToDiscard = [];
    
    for (const tab of tabs) {
      const openTime = tabOpenTimes.get(tab.id);
      
      if (!openTime) {
        console.log(`FFTabClose: Tab ${tab.id} (${tab.title}) has no timestamp, setting to current time`);
        tabOpenTimes.set(tab.id, now);
        await saveTabTimestamps();
        continue;
      }
      
      const ageMs = now - openTime;
      const ageHours = ageMs / hourInMs;
      
      console.log(`FFTabClose: Tab ${tab.id} (${tab.title}) is ${ageHours.toFixed(2)} hours old (${ageMs}ms)`);
      
      if (ageMs >= maxAgeMs) {
        if (tab.pinned) {
          // Si les onglets épinglés sont exclus, on ne fait rien
          if (settings.excludePinnedTabs) {
            console.log(`FFTabClose: Tab ${tab.id} (${tab.title}) is pinned and excluded from processing`);
            continue;
          }
          
          // Pour les onglets épinglés, on les met en veille au lieu de les fermer
          console.log(`FFTabClose: Tab ${tab.id} (${tab.title}) is pinned and older than threshold, adding to discard list`);
          tabsToDiscard.push(tab.id);
        } else {
          // Les onglets non épinglés sont fermés normalement
          console.log(`FFTabClose: Tab ${tab.id} (${tab.title}) is older than threshold, adding to close list`);
          tabsToClose.push(tab.id);
        }
      }
    }
    
    // Close the non-pinned old tabs
    if (tabsToClose.length > 0) {
      console.log(`FFTabClose: Closing ${tabsToClose.length} non-pinned tabs that were older than ${settings.closeAfterHours} hours`);
      await browser.tabs.remove(tabsToClose);
    } else {
      console.log(`FFTabClose: No non-pinned tabs found older than ${settings.closeAfterHours} hours to close`);
    }
    
    // Discard (suspend) the pinned old tabs
    if (tabsToDiscard.length > 0) {
      console.log(`FFTabClose: Discarding ${tabsToDiscard.length} pinned tabs that were older than ${settings.closeAfterHours} hours`);
      
      for (const tabId of tabsToDiscard) {
        try {
          await browser.tabs.discard(tabId);
          console.log(`FFTabClose: Successfully discarded tab ${tabId}`);
        } catch (err) {
          console.error(`FFTabClose: Error discarding tab ${tabId}:`, err);
        }
      }
    } else {
      console.log(`FFTabClose: No pinned tabs found older than ${settings.closeAfterHours} hours to discard`);
    }
  } catch (error) {
    console.error('FFTabClose: Error checking and processing old tabs:', error);
  }
}

// Initialize the extension when the browser starts
init();console.log('Script de debug')
