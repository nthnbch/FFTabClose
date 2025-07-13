/**
 * FFTabClose - Auto Tab Closer
 * Background script for automatic tab closure and management
 * 
 * Version 2.0.0
 * 
 * Notes sur Zen Browser et les espaces de travail (workspaces):
 * - Les espaces de travail dans Zen Browser sont similaires aux conteneurs Firefox
 * - Chaque espace de travail peut avoir ses propres onglets et ses propres conteneurs par défaut
 * - Les espaces de travail semblent correspondre à des fenêtres distinctes dans l'API tabs
 * - Pour accéder à tous les onglets dans tous les espaces, nous utilisons browser.tabs.query({})
 *   sans spécifier de fenêtre ou de conteneur spécifique
 */

// Constants
const DEFAULT_SETTINGS = {
  timeLimit: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
  discardPinnedTabs: true, // Toujours décharger les onglets épinglés au lieu de les fermer
  excludeAudioTabs: true,
  closeOnStart: true
};

const ALARM_NAME = 'checkTabsAlarm';
const CHECK_INTERVAL = 5; // Minutes between tab checks
const STORAGE_KEY = 'tabTimestamps';
const SETTINGS_KEY = 'settings';
const DEBUG_MODE = true; // Set to false to disable verbose logging

// State variables
let tabTimestamps = {};
let settings = {};

// Initialize
async function initialize() {
  // Log browser environment information for debugging
  try {
    const browserInfo = await browser.runtime.getBrowserInfo();
    const platformInfo = await browser.runtime.getPlatformInfo();
    
    if (DEBUG_MODE) {
      console.log(`Browser: ${browserInfo.name} ${browserInfo.version} (${browserInfo.buildID})`);
      console.log(`Platform: ${platformInfo.os} ${platformInfo.arch}`);
      console.log('Extension initialized');
    }
  } catch (error) {
    // getBrowserInfo might not be available in all browsers
    console.log('Could not detect browser details: ' + error.message);
  }

  // Load stored settings
  const storedSettings = await browser.storage.local.get(SETTINGS_KEY);
  settings = { ...DEFAULT_SETTINGS, ...(storedSettings[SETTINGS_KEY] || {}) };
  
  // Load tab timestamps
  const storedTimestamps = await browser.storage.local.get(STORAGE_KEY);
  tabTimestamps = storedTimestamps[STORAGE_KEY] || {};
  
  // Set up alarm for periodic tab checks
  browser.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL });
  
  // Record all current tabs across all windows/workspaces
  await recordAllCurrentTabs();
  
  // Check windows/workspaces count using tab windowIds instead of windows API
  const allTabs = await browser.tabs.query({});
  const uniqueWindowIds = [...new Set(allTabs.map(tab => tab.windowId))];
  if (DEBUG_MODE) {
    console.log(`Detected ${uniqueWindowIds.length} browser windows/workspaces`);
  }
  
  // Run initial check if enabled
  if (settings.closeOnStart) {
    processTabs();
  }
}

// Tab event listeners
async function recordAllCurrentTabs() {
  // Query all tabs in all windows to capture tabs from all workspaces
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  
  // Groupe les onglets par fenêtre (workspaces) pour le débogage
  const windowsMap = new Map();
  tabs.forEach(tab => {
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
    
    // Only set timestamp if not already tracked
    if (!tabTimestamps[tab.id]) {
      tabTimestamps[tab.id] = now;
    }
  });
  
  // Log des détails sur les espaces de travail en mode DEBUG
  if (DEBUG_MODE) {
    console.log(`Recorded ${tabs.length} tabs across ${windowsMap.size} windows/workspaces`);
    windowsMap.forEach((windowTabs, windowId) => {
      console.log(`Workspace/Window ${windowId}: ${windowTabs.length} tabs`);
      
      // Vérifier si certains onglets ont des cookieStoreId différents (conteneurs)
      const cookieStoreIds = [...new Set(windowTabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      if (cookieStoreIds.length > 0) {
        console.log(`Window ${windowId} has tabs with cookie stores: ${cookieStoreIds.join(', ')}`);
      }
    });
  }
  
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
  // Query all tabs across all windows/workspaces
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  const timeLimit = settings.timeLimit;
  
  // Get all active tabs (one per window)
  const activeTabs = await browser.tabs.query({ active: true });
  const activeTabIds = activeTabs.map(tab => tab.id);
  
  // Group tabs by window for better logging
  const windowsMap = new Map();
  tabs.forEach(tab => {
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
  });
  
  if (DEBUG_MODE) {
    console.log(`Processing ${tabs.length} tabs across ${windowsMap.size} windows/workspaces`);
    console.log(`Active tabs: ${activeTabIds.length} (one per window/workspace)`);
    
    // Log container info if available
    const containersMap = new Map();
    tabs.forEach(tab => {
      if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
        if (!containersMap.has(tab.cookieStoreId)) {
          containersMap.set(tab.cookieStoreId, 0);
        }
        containersMap.set(tab.cookieStoreId, containersMap.get(tab.cookieStoreId) + 1);
      }
    });
    
    if (containersMap.size > 0) {
      console.log('Container tabs detected:');
      containersMap.forEach((count, containerId) => {
        console.log(`Container ${containerId}: ${count} tabs`);
      });
    }
  }
  
  // Counter des actions effectuées
  let closedCount = 0;
  let discardedCount = 0;
  let skippedCount = 0;
  
  // Process each tab
  for (const tab of tabs) {
    // Skip processing if:
    // - Tab is active in any window (currently in use)
    // - Tab ID doesn't have a timestamp (new or untracked)
    // - Tab doesn't have a timestamp that exceeds the limit
    if (
      activeTabIds.includes(tab.id) ||
      !tabTimestamps[tab.id] ||
      (now - tabTimestamps[tab.id] < timeLimit)
    ) {
      skippedCount++;
      continue;
    }

    // Handle audio tabs - toujours les exclure selon les spécifications
    if (tab.audible) {
      skippedCount++;
      continue;
    }
    
    // Handle pinned tabs - toujours les décharger mais ne pas les fermer
    if (tab.pinned) {
      // Only discard if not already discarded
      if (!tab.discarded) {
        try {
          await browser.tabs.discard(tab.id);
          discardedCount++;
          if (DEBUG_MODE) {
            console.log(`Discarded pinned tab ${tab.id}: ${tab.title} in window ${tab.windowId}${tab.cookieStoreId ? ' (container: ' + tab.cookieStoreId + ')' : ''}`);
          }
        } catch (error) {
          console.error(`Error discarding pinned tab ${tab.id}:`, error);
        }
      } else {
        skippedCount++; // Already discarded
      }
      continue;
    }
    
    // Close regular tabs that exceed the time limit
    try {
      await browser.tabs.remove(tab.id);
      delete tabTimestamps[tab.id];
      closedCount++;
      if (DEBUG_MODE) {
        console.log(`Closed tab ${tab.id}: ${tab.title} in window ${tab.windowId}${tab.cookieStoreId ? ' (container: ' + tab.cookieStoreId + ')' : ''}`);
      }
    } catch (error) {
      console.error(`Error closing tab ${tab.id}:`, error);
    }
  }
  
  if (DEBUG_MODE) {
    console.log(`Tabs processed: ${closedCount} closed, ${discardedCount} discarded, ${skippedCount} skipped`);
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
  // Query all tabs across all windows/workspaces
  const tabs = await browser.tabs.query({});
  const now = Date.now();
  
  // Get all active tabs (one per window)
  const activeTabs = await browser.tabs.query({ active: true });
  const activeTabIds = activeTabs.map(tab => tab.id);
  
  // Group tabs by window (workspace)
  const windowsMap = new Map();
  tabs.forEach(tab => {
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
  });
  
  // Collect containers if present
  const containersSet = new Set();
  tabs.forEach(tab => {
    if (tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
      containersSet.add(tab.cookieStoreId);
    }
  });
  
  let eligibleCount = 0;
  let oldestTabAge = 0;
  
  tabs.forEach(tab => {
    // Skip active tabs in any window
    if (activeTabIds.includes(tab.id)) {
      return;
    }
    
    // Skip pinned tabs that are already discarded
    if (tab.pinned && tab.discarded) {
      return;
    }
    
    // Skip audio tabs
    if (tab.audible) {
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
    oldestTabAge: Math.floor(oldestTabAge / (60 * 1000)), // Convert to minutes
    workspaceCount: windowsMap.size, // Nombre d'espaces de travail basé sur windowId
    containersCount: containersSet.size, // Nombre de conteneurs différents
    workspaceSummary: Array.from(windowsMap.entries()).map(([windowId, tabs]) => {
      return {
        windowId,
        tabCount: tabs.length,
        activeTab: tabs.find(tab => tab.active)?.title || 'none'
      };
    })
  };
}

// Settings management
async function updateSettings(newSettings) {
  // Conserver les comportements par défaut pour discardPinnedTabs et excludeAudioTabs
  const updatedSettings = { 
    ...settings, 
    ...newSettings,
    // Forcer ces paramètres selon les spécifications
    discardPinnedTabs: true,
    excludeAudioTabs: true
  };
  
  settings = updatedSettings;
  await browser.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

async function getSettings() {
  return settings;
}

// Debugging and logging
function logDebugInfo() {
  if (!DEBUG_MODE) {
    return;
  }
  
  // Log browser and workspace information using tabs API
  browser.tabs.query({}).then(tabs => {
    const windowsMap = new Map();
    const containersMap = new Map();
    
    // Group tabs by windowId
    tabs.forEach(tab => {
      // Groupe par fenêtre
      if (!windowsMap.has(tab.windowId)) {
        windowsMap.set(tab.windowId, []);
      }
      windowsMap.get(tab.windowId).push(tab);
      
      // Groupe par conteneur
      const containerId = tab.cookieStoreId || 'default';
      if (!containersMap.has(containerId)) {
        containersMap.set(containerId, []);
      }
      containersMap.get(containerId).push(tab);
    });
    
    console.log(`FFTabClose debug info:`);
    console.log(`Total tabs: ${tabs.length}`);
    console.log(`Workspaces detected: ${windowsMap.size}`);
    
    if (containersMap.size > 1) {
      console.log(`Containers detected: ${containersMap.size - 1}`); // -1 pour exclure 'default'
    }
    
    console.log(`\nWorkspace details:`);
    windowsMap.forEach((windowTabs, windowId) => {
      console.log(`Workspace ${windowId}: ${windowTabs.length} tabs`);
      console.log(`  Active tab: ${windowTabs.find(tab => tab.active)?.title || 'none'}`);
      
      // Vérifier les conteneurs dans cette fenêtre
      const windowContainers = [...new Set(windowTabs.map(tab => tab.cookieStoreId).filter(id => id && id !== 'firefox-default'))];
      if (windowContainers.length > 0) {
        console.log(`  Containers: ${windowContainers.join(', ')}`);
      }
    });
    
    if (containersMap.size > 1) {
      console.log(`\nContainer details:`);
      containersMap.forEach((containerTabs, containerId) => {
        if (containerId !== 'default') {
          console.log(`Container ${containerId}: ${containerTabs.length} tabs`);
        }
      });
    }
  }).catch(error => {
    console.error(`Error retrieving tabs:`, error);
  });
  
  // Log current settings
  console.log(`\nCurrent settings:`, settings);
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
logDebugInfo();
