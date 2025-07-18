/**
 * FFTabClose - Auto Tab Closer
 * Background script for automatic tab closure and management
 * 
 * Version 3.0.0
 * Last updated: 18 July 2025
 * 
 * Notes on Zen Browser and workspaces:
 * - Workspaces in Zen Browser are similar to Firefox containers
 * - Each workspace can have its own tabs and default containers
 * - Workspaces correspond to separate windows in the tabs API
 * - To access all tabs across all workspaces, we use browser.tabs.query({})
 *   without specifying a particular window or container
 */

// Import domain rules manager
import DomainRuleManager from './domain-rules.js';

// Constants
const DEFAULT_SETTINGS = {
  timeLimit: 12 * 60 * 60 * 1000, // 12 hours in milliseconds
  discardPinnedTabs: true, // Always unload pinned tabs instead of closing them
  excludeAudioTabs: true,
  closeOnStart: true
};

const ALARM_NAME = 'checkTabsAlarm';
// Short interval to better handle 1-minute timeout option
const CHECK_INTERVAL = 0.5; // Minutes between tab checks (0.5 = 30 seconds)
const STORAGE_KEY = 'tabTimestamps';
const SETTINGS_KEY = 'settings';
const DEBUG_MODE = false; // Set to false in production to disable verbose logging

// State variables
let tabTimestamps = {};
let settings = {};
const domainRules = new DomainRuleManager();

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
  
  // Load domain rules
  await domainRules.loadRules();
  
  // Set up alarm for periodic tab checks
  browser.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL });
  
  // First get all tabs in all windows
  // This is the most reliable method to detect all workspaces
  const allTabs = await browser.tabs.query({});
  const uniqueWindowIds = [...new Set(allTabs.map(tab => tab.windowId))];
  
  if (DEBUG_MODE) {
    console.log(`Detected ${allTabs.length} tabs across ${uniqueWindowIds.length} browser windows/workspaces`);
    
    // Analyze tab distribution by window
    uniqueWindowIds.forEach(windowId => {
      const windowTabs = allTabs.filter(tab => tab.windowId === windowId);
      console.log(`Window ${windowId}: ${windowTabs.length} tabs`);
    });
  }
  
  // Check for contextualIdentities feature (containers)
  let containersSupported = false;
  try {
    if (browser.contextualIdentities) {
      const containers = await browser.contextualIdentities.query({});
      containersSupported = true;
      if (DEBUG_MODE && containers.length > 0) {
        console.log(`Detected ${containers.length} containers:`);
        containers.forEach(container => {
          console.log(` - ${container.name} (${container.cookieStoreId})`);
        });
        
        // Check available cookieStoreIds (containers) in tabs
        const cookieStoreIds = [...new Set(allTabs.map(tab => tab.cookieStoreId).filter(Boolean))];
        if (cookieStoreIds.length > 0) {
          console.log(`Detected ${cookieStoreIds.length} containers in use: ${cookieStoreIds.join(', ')}`);
          
          // Analyze tab distribution by container
          cookieStoreIds.forEach(containerId => {
            const containerTabs = allTabs.filter(tab => tab.cookieStoreId === containerId);
            console.log(`Container ${containerId}: ${containerTabs.length} tabs`);
          });
        }
      }
    }
  } catch (error) {
    // The feature may not be available
    console.log("Container detection not available:", error.message);
  }
  
  // If containers are not supported, use an alternative method for workspaces
  if (!containersSupported && DEBUG_MODE) {
    console.log("Containers not supported. Using window-based workspace detection");
  }
  
  // Record all current tabs across all windows/workspaces
  await recordAllCurrentTabs();
  
  // Configure a specific timer to frequently update timestamps
  // This helps keep timestamps up-to-date, especially for the one-minute timer
  browser.alarms.create('updateTimestamps', { periodInMinutes: 0.25 }); // Every 15 seconds
  
  // Run initial check if enabled
  if (settings.closeOnStart) {
    processTabs();
  }
}

// Tab event listeners
async function recordAllCurrentTabs() {
  let tabs = [];
  const now = Date.now();
  
  try {
    // Main query to get ALL tabs in ALL windows and ALL containers
    // This is the most reliable method to ensure we capture everything
    tabs = await browser.tabs.query({});
    
    if (DEBUG_MODE) {
      console.log(`Recorded ${tabs.length} tabs across all windows and containers`);
      
      // Check distribution by window
      const windowIds = [...new Set(tabs.map(tab => tab.windowId))];
      console.log(`Tabs distributed across ${windowIds.length} windows/workspaces`);
      
      // Check distribution by container
      const cookieStoreIds = [...new Set(tabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      if (cookieStoreIds.length > 0) {
        console.log(`Tabs using ${cookieStoreIds.length} different containers`);
      }
    }
    
    // Secondary verification if needed - use containers API for reporting only
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        if (DEBUG_MODE && containers.length > 0) {
          console.log(`Available containers: ${containers.length}`);
          containers.forEach(container => {
            // Count tabs in this specific container
            const containerTabs = tabs.filter(tab => tab.cookieStoreId === container.cookieStoreId);
            console.log(` - ${container.name} (${container.cookieStoreId}): ${containerTabs.length} tabs`);
          });
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities for reporting:", error);
      }
    }
  } catch (error) {
    console.error("Error in primary tab query:", error);
    
    // In case of failure, try an alternative approach by window
    try {
      console.log("Trying fallback approach - querying by window");
      tabs = [];
      
      const windows = await browser.windows.getAll();
      for (const window of windows) {
        try {
          const windowTabs = await browser.tabs.query({ windowId: window.id });
          tabs = tabs.concat(windowTabs);
          console.log(`Retrieved ${windowTabs.length} tabs from window ${window.id}`);
        } catch (windowError) {
          console.error(`Error retrieving tabs from window ${window.id}:`, windowError);
        }
      }
    } catch (fallbackError) {
      console.error("Fallback approach failed:", fallbackError);
      return; // Cannot continue
    }
  }
  
  if (tabs.length === 0) {
    console.error("Critical error: No tabs found with any method");
    return; // Cannot continue without tabs
  }
  
  // Group tabs by window (workspaces) for debugging
  const windowsMap = new Map();
  const containerMap = new Map();
  
  // Create an entry for each window and container
  tabs.forEach(tab => {
    // Group by window
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
    
    // Group by container
    const containerId = tab.cookieStoreId || 'firefox-default';
    if (!containerMap.has(containerId)) {
      containerMap.set(containerId, []);
    }
    containerMap.get(containerId).push(tab);
    
    // Update the tab timestamp - IMPORTANT for closing
    tabTimestamps[tab.id] = tabTimestamps[tab.id] || now;
  });
  
  // Log workspace details in DEBUG mode
  if (DEBUG_MODE) {
    console.log(`Recorded details for ${tabs.length} tabs across ${windowsMap.size} windows/workspaces`);
    
    // Log by window
    windowsMap.forEach((windowTabs, windowId) => {
      console.log(`Workspace/Window ${windowId}: ${windowTabs.length} tabs`);
      
      // Check if some tabs have different cookieStoreIds (containers)
      const cookieStoreIds = [...new Set(windowTabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      if (cookieStoreIds.length > 0) {
        console.log(`Window ${windowId} has tabs with cookie stores: ${cookieStoreIds.join(', ')}`);
      }
    });
    
    // Log by container
    if (containerMap.size > 1) {
      console.log(`\nContainer breakdown:`);
      containerMap.forEach((containerTabs, containerId) => {
        console.log(`Container ${containerId}: ${containerTabs.length} tabs`);
        
        // Check which windows contain these tabs
        const windowIds = [...new Set(containerTabs.map(tab => tab.windowId))];
        console.log(`  Used in ${windowIds.length} windows: ${windowIds.join(', ')}`);
      });
    }
  }
  
  // Save the updated timestamps - CRUCIAL for tabs to be closed correctly
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

// Detection of workspace changes (windows)
async function handleWindowFocusChanged(windowId) {
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    if (DEBUG_MODE) {
      console.log('All browser windows lost focus');
    }
    return; // Nothing to do when all windows lose focus
  }
  
  if (DEBUG_MODE) {
    console.log(`Window/workspace ${windowId} gained focus`);
  }
  
  try {
    // Get tabs from the window that has focus
    const tabs = await browser.tabs.query({ windowId });
    
    if (DEBUG_MODE) {
      console.log(`Focused workspace has ${tabs.length} tabs`);
      
      // Check containers used in this window
      const containers = [...new Set(tabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      if (containers.length > 0) {
        console.log(`Workspace ${windowId} has containers: ${containers.join(', ')}`);
      }
    }
    
    // Find the active tab in this window
    const activeTab = tabs.find(tab => tab.active);
    if (activeTab) {
      // Update the timestamp of the active tab
      tabTimestamps[activeTab.id] = Date.now();
      await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
      
      if (DEBUG_MODE) {
        console.log(`Updated timestamp for active tab ${activeTab.id} in workspace ${windowId}`);
      }
    }
  } catch (error) {
    console.error(`Error handling window focus change:`, error);
    
    // In case of error, update timestamps of all tabs
    // to ensure the system continues to function
    await recordAllCurrentTabs();
  }
}

// Function to force update of tab timestamps
async function forceUpdateAllTabTimestamps() {
  if (DEBUG_MODE) {
    console.log("Force updating all tab timestamps");
  }
  
  let tabs = [];
  
  try {
    // Retrieve ALL tabs in all windows and all containers
    // This method is the most reliable to get all tabs
    tabs = await browser.tabs.query({});
    
    if (DEBUG_MODE) {
      console.log(`Found ${tabs.length} tabs to update timestamps`);
      
      // Analyze tab distribution for debugging
      const windowIds = [...new Set(tabs.map(tab => tab.windowId))];
      console.log(`Tabs distributed across ${windowIds.length} windows/workspaces`);
      
      const cookieStoreIds = [...new Set(tabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      if (cookieStoreIds.length > 0) {
        console.log(`Tabs using ${cookieStoreIds.length} different containers: ${cookieStoreIds.join(', ')}`);
      }
    }
  } catch (error) {
    console.error("Error retrieving tabs in forceUpdateAllTabTimestamps:", error);
    return; // Do not continue in case of critical error
  }
  
  if (tabs.length === 0) {
    console.error("No tabs found to update timestamps");
    return; // Do not continue without tabs
  }
  
  const now = Date.now();
  
  // Update only the timestamps of active tabs in each window
  let activeTabs = [];
  try {
    activeTabs = await browser.tabs.query({ active: true });
  } catch (error) {
    console.error("Error getting active tabs:", error);
    // En cas d'erreur, initialiser comme tableau vide
    activeTabs = [];
  }
  
  const activeTabIds = new Set(activeTabs.map(tab => tab.id));
  
  if (DEBUG_MODE) {
    console.log(`Found ${activeTabs.length} active tabs across all windows`);
    
    // Log details about active tabs
    activeTabs.forEach(tab => {
      const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
      console.log(`Active tab in window ${tab.windowId}${containerInfo}: ${tab.title}`);
    });
  }
  
  // Preserve existing timestamps for inactive tabs
  tabs.forEach(tab => {
    if (activeTabIds.has(tab.id)) {
      // Update active tabs
      tabTimestamps[tab.id] = now;
    } else if (!tabTimestamps[tab.id]) {
      // Initialize tabs without timestamp
      tabTimestamps[tab.id] = now;
    }
    // Other tabs keep their existing timestamp
  });
  
  await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
  
  if (DEBUG_MODE) {
    console.log(`Updated timestamps for ${activeTabIds.size} active tabs and ensured timestamps exist for all ${tabs.length} tabs`);
  }
}

// Main tab processing function
async function processTabs() {
  let tabs = [];
  const now = Date.now();
  const timeLimit = settings.timeLimit;
  
  try {
    // 1. Get all tabs first with a global query
    // This ensures we capture all tabs in all workspaces
    tabs = await browser.tabs.query({});
    
    if (DEBUG_MODE) {
      console.log(`Found ${tabs.length} tabs across all windows using global query`);
      
      // Analyze windows for debugging
      const windowIds = [...new Set(tabs.map(tab => tab.windowId))];
      console.log(`Tabs distributed across ${windowIds.length} windows/workspaces`);
    }
    
    // 2. Then try to get all available cookieStoreIds (containers/workspaces)
    // This is mainly for reporting and debugging
    let cookieStoreIds = ["firefox-default"]; // Always include the default container
    
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        // Add all custom containers
        const customContainerIds = containers.map(container => container.cookieStoreId);
        cookieStoreIds = cookieStoreIds.concat(customContainerIds);
        
        if (DEBUG_MODE) {
          console.log(`Found ${containers.length} containers/workspaces`);
          
          // Analyze containers in the found tabs
          const tabContainers = [...new Set(tabs.map(tab => tab.cookieStoreId).filter(Boolean))];
          console.log(`Tabs using ${tabContainers.length} different containers: ${tabContainers.join(', ')}`);
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities:", error);
      }
    }
    
    // 4. Safety check - if still no tabs, try one last method
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("Still no tabs found, trying to query by window");
      }
      
      // Get all windows
      const windows = await browser.windows.getAll();
      for (const window of windows) {
        const windowTabs = await browser.tabs.query({ windowId: window.id });
        tabs = tabs.concat(windowTabs);
      }
    }
  } catch (error) {
    console.error("Error collecting tabs in processTabs:", error);
    // As a last resort, use the simplest query
    try {
      tabs = await browser.tabs.query({});
    } catch (e) {
      console.error("Critical error, couldn't get any tabs:", e);
      return; // Cannot continue
    }
  }
  
  // Get all active tabs (one per window/container)
  // This is a critical step to avoid closing tabs currently in use
  let activeTabs = [];
  try {
    // Explicitly retrieve active tabs in all windows
    const allWindows = await browser.windows.getAll();
    
    if (DEBUG_MODE) {
      console.log(`Found ${allWindows.length} windows/workspaces to check for active tabs`);
    }
    
    // For each window, find the active tab
    for (const window of allWindows) {
      try {
        const windowActiveTabs = await browser.tabs.query({ 
          windowId: window.id,
          active: true 
        });
        
        if (windowActiveTabs.length > 0) {
          activeTabs = activeTabs.concat(windowActiveTabs);
        }
      } catch (windowError) {
        console.error(`Error getting active tab for window ${window.id}:`, windowError);
      }
    }
    
    // Double check with a global query as fallback
    if (activeTabs.length === 0) {
      console.warn("No active tabs found via window-specific queries, falling back to global query");
      activeTabs = await browser.tabs.query({ active: true });
    }
  } catch (error) {
    console.error("Error getting windows or active tabs:", error);
    // Ultimate fallback - simple global query
    try {
      activeTabs = await browser.tabs.query({ active: true });
    } catch (fallbackError) {
      console.error("Critical error getting active tabs:", fallbackError);
    }
  }
  
  // Use a Set to avoid potential duplicates
  const activeTabIds = new Set(activeTabs.map(tab => tab.id));
  
  if (DEBUG_MODE) {
    console.log(`Found ${activeTabs.length} active tabs across all windows/workspaces`);
    console.log(`Active tab IDs: ${Array.from(activeTabIds).join(', ')}`);
    
    // Log the active tabs for debugging
    activeTabs.forEach(tab => {
      const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
      console.log(`Active tab in window ${tab.windowId}${containerInfo}: "${tab.title}" (ID: ${tab.id})`);
    });
    
    // Check if there are tabs without a window (rare case but possible)
    const tabsWithoutWindow = activeTabs.filter(tab => !tab.windowId);
    if (tabsWithoutWindow.length > 0) {
      console.warn(`Found ${tabsWithoutWindow.length} active tabs without window ID`);
    }
  }
  
  // Group tabs by window and container for better logging
  const windowsMap = new Map();
  const containerMap = new Map();
  
  tabs.forEach(tab => {
    // Group by window
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
    
    // Group by container
    const containerId = tab.cookieStoreId || 'firefox-default';
    if (!containerMap.has(containerId)) {
      containerMap.set(containerId, []);
    }
    containerMap.get(containerId).push(tab);
    
    // Ensure each tab has a timestamp
    if (!tabTimestamps[tab.id]) {
      tabTimestamps[tab.id] = now;
    }
  });
  
  if (DEBUG_MODE) {
    console.log(`Processing ${tabs.length} tabs across ${windowsMap.size} windows`);
    console.log(`Processing ${tabs.length} tabs across ${containerMap.size} containers/workspaces`);
    console.log(`Active tabs: ${activeTabIds.length} (one per window/workspace)`);
    
    // Log container info
    containerMap.forEach((containerTabs, containerId) => {
      console.log(`Container ${containerId}: ${containerTabs.length} tabs`);
    });
  }
  
  // Counter for actions performed
  let closedCount = 0;
  let discardedCount = 0;
  let skippedCount = 0;
  
  // Debug log to better understand tab processing
  if (DEBUG_MODE) {
    console.log(`Starting processing of ${tabs.length} tabs with time limit of ${timeLimit/60000} minutes`);
    console.log(`Active tab IDs (${activeTabIds.length}): ${JSON.stringify(Array.from(activeTabIds))}`);
    
    // Analyze tabs by window for debugging
    const tabsByWindow = {};
    tabs.forEach(t => {
      if (!tabsByWindow[t.windowId]) tabsByWindow[t.windowId] = [];
      tabsByWindow[t.windowId].push({id: t.id, active: t.active, title: t.title});
    });
    console.log(`Tabs by window: ${JSON.stringify(tabsByWindow)}`);
  }

  // Process each tab
  for (const tab of tabs) {
    // Check domain rules
    const { shouldProcess, timeout } = domainRules.shouldProcessTab(tab, timeLimit);
    
    // If the domain is configured to never be closed, move to the next tab
    if (!shouldProcess) {
      if (DEBUG_MODE) {
        console.log(`Tab ${tab.id}: "${tab.title}" is protected by domain rule - skipping`);
      }
      continue;
    }
    
    // Check the tab age (using the domain-specific timeout if defined)
    const tabAge = now - (tabTimestamps[tab.id] || now);
    const tabTimeout = timeout !== null ? timeout : timeLimit;
    const isOldEnough = tabAge >= tabTimeout;
    
    // Detailed log for debugging
    if (DEBUG_MODE && isOldEnough) {
      const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
      const domainInfo = timeout !== null ? ` (custom timeout: ${Math.floor(timeout/60000)} min)` : '';
      console.log(`Tab ${tab.id}: "${tab.title}" in window ${tab.windowId}${containerInfo}${domainInfo}`);
      console.log(`  Age: ${Math.floor(tabAge/60000)} minutes, Active: ${tab.active}, Pinned: ${tab.pinned}, Audible: ${tab.audible}`);
      console.log(`  In activeTabIds: ${activeTabIds.has(tab.id)}`);
    }
    
    // Skip processing if:
    // - Tab is active in any window (currently in use)
    // - Tab doesn't have a timestamp that exceeds the limit
    if (
      activeTabIds.has(tab.id) ||
      !isOldEnough
    ) {
      skippedCount++;
      if (DEBUG_MODE && isOldEnough) {
        console.log(`  Skipped: active tab or not old enough`);
      }
      continue;
    }

    // Handle audio tabs - always exclude them according to specifications
    if (tab.audible) {
      skippedCount++;
      if (DEBUG_MODE) {
        console.log(`  Skipped: tab is playing audio`);
      }
      continue;
    }
    
    // Handle pinned tabs - always discard them but don't close them
    if (tab.pinned) {
      // Only discard if not already discarded
      if (!tab.discarded) {
        try {
          await browser.tabs.discard(tab.id);
          discardedCount++;
          if (DEBUG_MODE) {
            const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
            console.log(`Discarded pinned tab ${tab.id}: ${tab.title} in window ${tab.windowId}${containerInfo}`);
          }
        } catch (error) {
          console.error(`Error discarding pinned tab ${tab.id}:`, error);
        }
      } else {
        skippedCount++; // Already discarded
        if (DEBUG_MODE) {
          console.log(`  Skipped: pinned tab already discarded`);
        }
      }
      continue;
    }
    
    // Close regular tabs that exceed the time limit
    try {
      if (DEBUG_MODE) {
        const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
        console.log(`Closing tab ${tab.id}: "${tab.title}" in window ${tab.windowId}${containerInfo}`);
        console.log(`  Tab age: ${Math.floor((now - (tabTimestamps[tab.id] || now))/60000)} minutes (limit: ${timeLimit/60000} minutes)`);
      }
      
      // Check one last time if the tab is active
      // This is an additional precaution to avoid closing the active tab
      const isStillActive = activeTabIds.has(tab.id);
      if (isStillActive) {
        if (DEBUG_MODE) {
          console.log(`  SAFETY CHECK: Tab ${tab.id} is now active, skipping close operation`);
        }
        skippedCount++;
        continue;
      }
      
      await browser.tabs.remove(tab.id);
      delete tabTimestamps[tab.id];
      closedCount++;
      
      if (DEBUG_MODE) {
        console.log(`  ✓ Successfully closed tab ${tab.id}`);
      }
    } catch (error) {
      console.error(`Error closing tab ${tab.id}:`, error);
      console.error(`  Error details: ${error.message}`);
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
  let tabs = [];
  let containerInfo = [];
  const now = Date.now();
  
  try {
    // 1. Essayer d'obtenir tous les cookieStoreIds disponibles (conteneurs/workspaces)
    let cookieStoreIds = ["firefox-default"]; // Always include the default container
    
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        // Extraire les informations des conteneurs
        containerInfo = containers.map(container => ({
          cookieStoreId: container.cookieStoreId,
          name: container.name,
          color: container.color,
          icon: container.icon,
          tabCount: 0 // Will be updated later
        }));
        
        // Add container IDs for the query
        cookieStoreIds = cookieStoreIds.concat(containers.map(container => container.cookieStoreId));
        
      } catch (error) {
        console.warn("Error querying contextualIdentities:", error);
      }
    }
    
    // 2. Get tabs for each cookieStoreId
    if (cookieStoreIds.length > 1) {
      // If containers are detected, get tabs for each container
      for (const cookieStoreId of cookieStoreIds) {
        try {
          const containerTabs = await browser.tabs.query({ cookieStoreId });
          
          // Update the tab count for this container
          const container = containerInfo.find(c => c.cookieStoreId === cookieStoreId);
          if (container) {
            container.tabCount = containerTabs.length;
          } else if (cookieStoreId === "firefox-default") {
            // Add the default container if it's not already in the list
            containerInfo.push({
              cookieStoreId: "firefox-default",
              name: "Default",
              tabCount: containerTabs.length
            });
          }
          
          tabs = tabs.concat(containerTabs);
        } catch (error) {
          console.warn(`Error querying tabs for container ${cookieStoreId}:`, error);
        }
      }
    }
    
    // 3. Fallback: If no tabs were found via containers or an error occurred
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("No tabs found via containers in getTabStats, using standard tab query");
      }
      tabs = await browser.tabs.query({});
      
      // Create a default container entry if no containers are detected
      if (containerInfo.length === 0) {
        containerInfo.push({
          cookieStoreId: "firefox-default",
          name: "Default",
          tabCount: tabs.length
        });
      }
    }
  } catch (error) {
    console.error("Error in getTabStats:", error);
    // As a last resort, use the simplest query
    tabs = await browser.tabs.query({});
    
    // Create a default container entry
    containerInfo = [{
      cookieStoreId: "firefox-default",
      name: "Default",
      tabCount: tabs.length
    }];
  }
  
  // Get all active tabs (one per window)
  const activeTabs = await browser.tabs.query({ active: true });
  const activeTabIds = activeTabs.map(tab => tab.id);    // Group tabs by window (workspace)
  const windowsMap = new Map();
  tabs.forEach(tab => {
    // Make sure the window ID is valid
    if (tab.windowId !== undefined) {
      if (!windowsMap.has(tab.windowId)) {
        windowsMap.set(tab.windowId, []);
      }
      windowsMap.get(tab.windowId).push(tab);
    }
  });
  
  if (DEBUG_MODE) {
    console.log(`Tabs grouped into ${windowsMap.size} windows/workspaces`);
    windowsMap.forEach((tabs, windowId) => {
      console.log(`Window ${windowId}: ${tabs.length} tabs`);
    });
  }
  
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
    workspaceCount: windowsMap.size, // Number of workspaces based on windowId
    containerCount: containerInfo.length, // Nombre de conteneurs
    containers: containerInfo, // Informations sur les conteneurs
    workspaceSummary: Array.from(windowsMap.entries()).map(([windowId, tabs]) => {
      return {
        windowId,
        tabCount: tabs.length,
        activeTab: tabs.find(tab => tab.active)?.title || 'none',
        containerIds: [...new Set(tabs.map(tab => tab.cookieStoreId).filter(Boolean))]
      };
    })
  };
}

// Settings management
async function updateSettings(newSettings) {
  if (!newSettings || typeof newSettings !== 'object') {
    console.error("Invalid settings object provided");
    return settings; // Return unmodified settings
  }
  
  // Validate timeLimit value (must be a positive number)
  if (newSettings.timeLimit !== undefined) {
    // Convert to number if it's a string
    const timeLimit = parseInt(newSettings.timeLimit, 10);
    
    // Check if it's a valid number and within acceptable range
    if (isNaN(timeLimit) || timeLimit <= 0) {
      console.error("Invalid timeLimit value");
      newSettings.timeLimit = settings.timeLimit; // Keep the old value
    } else {
      newSettings.timeLimit = timeLimit; // Use the converted value
    }
  }
  
  // Maintain default behaviors for discardPinnedTabs and excludeAudioTabs
  const updatedSettings = { 
    ...settings, 
    ...newSettings,
    // Force these settings according to specifications
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

// Helper function to sanitize data for logging
function sanitizeForLogging(data) {
  // Create a safe copy to avoid potential prototype pollution
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  const sanitized = Array.isArray(data) ? [] : {};
  
  // List of sensitive fields to mask
  const sensitiveKeys = ['url', 'title', 'favIconUrl', 'cookieStoreId', 'userContextId'];
  
  // Use Object.entries for better security and performance
  Object.entries(data).forEach(([key, value]) => {
    // Check if the key is sensitive
    if (sensitiveKeys.includes(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursion for nested objects
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

// Debugging and logging
function logDebugInfo() {
  if (!DEBUG_MODE) {
    return;
  }
  
  // Use a safer, more contained approach to logging
  
  // Log browser and workspace information using tabs API
  browser.tabs.query({}).then(tabs => {
    const windowsMap = new Map();
    const containersMap = new Map();
    
    // Group tabs by windowId
    tabs.forEach(tab => {
      // Group by window
      if (!windowsMap.has(tab.windowId)) {
        windowsMap.set(tab.windowId, []);
      }
      windowsMap.get(tab.windowId).push(tab);
      
      // Group by container
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
      
      // Check containers in this window
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

// Event listeners for windows/workspaces (if API is available)
try {
  browser.windows.onFocusChanged.addListener(handleWindowFocusChanged);
} catch (error) {
  if (DEBUG_MODE) {
    console.log('Windows focus change events not available:', error.message);
  }
}

browser.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) {
    processTabs();
  } else if (alarm.name === 'updateTimestamps') {
    // Periodic timestamp updates to ensure proper timer operation
    forceUpdateAllTabTimestamps();
  }
});
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Verify message is valid and from a trusted source
  if (!message || typeof message !== 'object' || !message.action) {
    console.error("Invalid message received");
    return false;
  }
  
  // Verify sender is valid (internal to the extension)
  if (!sender || !sender.id || sender.id !== browser.runtime.id) {
    console.error("Message from unauthorized sender", sender?.id);
    return false;
  }
  
  // Use a promise to handle asynchronous operations
  const handleMessage = async () => {
    try {
      // Traiter uniquement les actions connues
      switch (message.action) {
        case 'getSettings':
          return await getSettings();
        case 'updateSettings':
          if (!message.settings || typeof message.settings !== 'object') {
            console.error("Invalid settings in message");
            return false;
          }
          return await updateSettings(message.settings);
        case 'closeOldTabs':
          return await closeOldTabs();
        case 'getTabStats':
          return await getTabStats();
        
        // Domain rules handlers
        case 'getDomainRules':
          const rules = await domainRules.loadRules();
          return { rules };
        case 'getDomainRule':
          if (!message.domain) {
            console.error("Missing domain parameter");
            return false;
          }
          const domainRulesList = await domainRules.loadRules();
          const rule = domainRulesList.find(r => r.domain === message.domain);
          return { rule };
        case 'saveDomainRule':
          if (!message.data || !message.data.domain || !message.data.action) {
            console.error("Invalid domain rule data");
            return false;
          }
          await domainRules.loadRules(); // Ensure we have the latest rules
          await domainRules.removeRule(message.data.domain); // Remove existing rule if any
          const result = await domainRules.addRule(
            message.data.domain,
            message.data.action,
            message.data.timeout
          );
          return { success: result };
        case 'removeDomainRule':
          if (!message.domain) {
            console.error("Missing domain parameter");
            return false;
          }
          const removed = await domainRules.removeRule(message.domain);
          return { success: removed };
        default:
          console.error("Unknown action", message.action);
          return false;
      }
    } catch (error) {
      console.error(`Error handling message '${message.action}':`, error);
      return { error: error.message };
    }
  };
  
  // Use handleResponseAsync to handle the asynchronous response
  handleMessage().then(sendResponse);
  
  // Indicate that we will send a response asynchronously
  return true;
});

// Changelog for version 3.0.0
const CHANGELOG = {
  version: "3.0.0",
  changes: [
    "Updated to Manifest V3 for improved compatibility",
    "Added domain rules for custom per-site handling",
    "Enhanced accessibility features (reduced motion support)",
    "Improved performance for large numbers of tabs",
    "Better keyboard navigation and screen reader support",
    "Extended time options with 48 hour setting"
  ],
  date: "2025-07-18"
};

// Initialize on startup
initialize();
logDebugInfo();

// Export changelog for info page
if (typeof browser !== 'undefined' && browser.runtime) {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Check that the message is valid and comes from a secure source
    if (!message || typeof message !== 'object' || !message.action) {
      console.error("Invalid message received");
      return false;
    }
    
    // Check that the sender is valid (internal to the extension)
    if (!sender || !sender.id || sender.id !== browser.runtime.id) {
      console.error("Message from unauthorized sender", sender?.id);
      return false;
    }
    
    // Traiter l'action getChangelog
    if (message.action === 'getChangelog') {
      sendResponse(CHANGELOG);
      return true;
    }
    
    return false;
  });
}
