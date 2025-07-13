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
// Intervalle plus court pour mieux gérer le timeout d'une minute
const CHECK_INTERVAL = 0.5; // Minutes between tab checks (0.5 = 30 seconds)
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
  
  // Vérifier l'existence de la fonctionnalité contextualIdentities (conteneurs)
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
      }
    }
  } catch (error) {
    // La fonctionnalité peut ne pas être disponible
    console.log("Container detection not available:", error.message);
  }
  
  // Si les containers ne sont pas supportés, utiliser une méthode alternative pour les workspaces
  if (!containersSupported && DEBUG_MODE) {
    console.log("Containers not supported. Using window-based workspace detection");
  }
  
  // Record all current tabs across all windows/workspaces
  await recordAllCurrentTabs();
  
  // Check windows/workspaces count using tab windowIds
  const allTabs = await browser.tabs.query({});
  const uniqueWindowIds = [...new Set(allTabs.map(tab => tab.windowId))];
  if (DEBUG_MODE) {
    console.log(`Detected ${uniqueWindowIds.length} browser windows/workspaces`);
    
    // Vérifier les cookieStoreIds (conteneurs) disponibles
    const cookieStoreIds = [...new Set(allTabs.map(tab => tab.cookieStoreId).filter(Boolean))];
    if (cookieStoreIds.length > 0) {
      console.log(`Detected ${cookieStoreIds.length} containers/cookieStores: ${cookieStoreIds.join(', ')}`);
    }
  }
  
  // Configurer un timer spécifique pour mettre à jour les timestamps fréquemment
  // Cela aide à maintenir à jour les timestamps, en particulier pour le timer d'une minute
  browser.alarms.create('updateTimestamps', { periodInMinutes: 0.25 }); // Toutes les 15 secondes
  
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
    // 1. Essayer d'obtenir tous les cookieStoreIds disponibles (conteneurs/workspaces)
    let cookieStoreIds = ["firefox-default"]; // Toujours inclure le conteneur par défaut
    
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        // Ajouter tous les conteneurs personnalisés
        cookieStoreIds = cookieStoreIds.concat(containers.map(container => container.cookieStoreId));
        
        if (DEBUG_MODE) {
          console.log(`Found ${containers.length} containers/workspaces to check for tabs`);
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities:", error);
        // Continuer avec uniquement le conteneur par défaut
      }
    }
    
    // 2. Obtenir les onglets pour chaque cookieStoreId
    if (cookieStoreIds.length > 1) {
      // Si des conteneurs sont détectés, obtenir les onglets de chaque conteneur
      for (const cookieStoreId of cookieStoreIds) {
        try {
          const containerTabs = await browser.tabs.query({ cookieStoreId });
          if (DEBUG_MODE) {
            console.log(`Found ${containerTabs.length} tabs in container/workspace ${cookieStoreId}`);
          }
          tabs = tabs.concat(containerTabs);
        } catch (error) {
          console.warn(`Error querying tabs for container ${cookieStoreId}:`, error);
        }
      }
    }
    
    // 3. Fallback: Si aucun onglet n'a été trouvé via les conteneurs ou une erreur s'est produite
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("No tabs found via containers, using standard tab query");
      }
      tabs = await browser.tabs.query({});
    }
    
    // 4. Vérification de sécurité - si toujours pas d'onglets, essayer une dernière méthode
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("Still no tabs found, trying to query by window");
      }
      
      // Obtenir toutes les fenêtres
      const windows = await browser.windows.getAll();
      for (const window of windows) {
        const windowTabs = await browser.tabs.query({ windowId: window.id });
        tabs = tabs.concat(windowTabs);
      }
    }
  } catch (error) {
    console.error("Error in recordAllCurrentTabs:", error);
    // En dernier recours, utilisez la requête la plus simple
    try {
      tabs = await browser.tabs.query({});
    } catch (e) {
      console.error("Critical error, couldn't get any tabs:", e);
      return; // Impossible de continuer
    }
  }
  
  // Grouper les onglets par fenêtre (workspaces) pour le débogage
  const windowsMap = new Map();
  tabs.forEach(tab => {
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
    
    // Mettre à jour le timestamp de l'onglet
    tabTimestamps[tab.id] = tabTimestamps[tab.id] || now;
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

// Détection des changements de workspaces (fenêtres)
async function handleWindowFocusChanged(windowId) {
  if (windowId === browser.windows.WINDOW_ID_NONE) {
    if (DEBUG_MODE) {
      console.log('All browser windows lost focus');
    }
    return; // Rien à faire quand toutes les fenêtres perdent le focus
  }
  
  if (DEBUG_MODE) {
    console.log(`Window/workspace ${windowId} gained focus`);
  }
  
  try {
    // Obtenir les onglets de la fenêtre qui a le focus
    const tabs = await browser.tabs.query({ windowId });
    
    if (DEBUG_MODE) {
      console.log(`Focused workspace has ${tabs.length} tabs`);
      
      // Vérifier les conteneurs utilisés dans cette fenêtre
      const containers = [...new Set(tabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      if (containers.length > 0) {
        console.log(`Workspace ${windowId} has containers: ${containers.join(', ')}`);
      }
    }
    
    // Trouver l'onglet actif dans cette fenêtre
    const activeTab = tabs.find(tab => tab.active);
    if (activeTab) {
      // Mettre à jour le timestamp de l'onglet actif
      tabTimestamps[activeTab.id] = Date.now();
      await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
      
      if (DEBUG_MODE) {
        console.log(`Updated timestamp for active tab ${activeTab.id} in workspace ${windowId}`);
      }
    }
  } catch (error) {
    console.error(`Error handling window focus change:`, error);
    
    // En cas d'erreur, mettre à jour les timestamps de tous les onglets
    // pour garantir que le système continue de fonctionner
    await recordAllCurrentTabs();
  }
}

// Fonction pour forcer la mise à jour des timestamps des onglets
async function forceUpdateAllTabTimestamps() {
  if (DEBUG_MODE) {
    console.log("Force updating all tab timestamps");
  }
  
  let tabs = [];
  
  try {
    // 1. Essayer d'obtenir tous les cookieStoreIds disponibles (conteneurs/workspaces)
    let cookieStoreIds = ["firefox-default"]; // Toujours inclure le conteneur par défaut
    
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        // Ajouter tous les conteneurs personnalisés
        cookieStoreIds = cookieStoreIds.concat(containers.map(container => container.cookieStoreId));
        
        if (DEBUG_MODE) {
          console.log(`Found ${containers.length} containers/workspaces to update timestamps`);
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities for timestamps:", error);
        // Continuer avec uniquement le conteneur par défaut
      }
    }
    
    // 2. Obtenir les onglets pour chaque cookieStoreId
    if (cookieStoreIds.length > 1) {
      // Si des conteneurs sont détectés, obtenir les onglets de chaque conteneur
      for (const cookieStoreId of cookieStoreIds) {
        try {
          const containerTabs = await browser.tabs.query({ cookieStoreId });
          tabs = tabs.concat(containerTabs);
        } catch (error) {
          console.warn(`Error querying tabs for container ${cookieStoreId}:`, error);
        }
      }
    }
    
    // 3. Fallback: Si aucun onglet n'a été trouvé via les conteneurs
    if (tabs.length === 0) {
      tabs = await browser.tabs.query({});
    }
  } catch (error) {
    console.error("Error collecting tabs in forceUpdateAllTabTimestamps:", error);
    // En dernier recours, utilisez la requête la plus simple
    tabs = await browser.tabs.query({});
  }
  
  const now = Date.now();
  
  // Mettre à jour uniquement les timestamps des onglets actifs dans chaque fenêtre
  const activeTabs = await browser.tabs.query({ active: true });
  const activeTabIds = new Set(activeTabs.map(tab => tab.id));
  
  // Conserver les anciens timestamps des onglets non actifs
  tabs.forEach(tab => {
    if (activeTabIds.has(tab.id)) {
      // Mise à jour des onglets actifs
      tabTimestamps[tab.id] = now;
    } else if (!tabTimestamps[tab.id]) {
      // Initialiser les onglets sans timestamp
      tabTimestamps[tab.id] = now;
    }
    // Les autres onglets gardent leur timestamp existant
  });
  
  await browser.storage.local.set({ [STORAGE_KEY]: tabTimestamps });
  
  if (DEBUG_MODE) {
    console.log(`Updated timestamps for ${activeTabIds.size} active tabs across all workspaces`);
  }
}

// Main tab processing function
async function processTabs() {
  let tabs = [];
  const now = Date.now();
  const timeLimit = settings.timeLimit;
  
  try {
    // 1. Essayer d'obtenir tous les cookieStoreIds disponibles (conteneurs/workspaces)
    let cookieStoreIds = ["firefox-default"]; // Toujours inclure le conteneur par défaut
    
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        // Ajouter tous les conteneurs personnalisés
        const customContainerIds = containers.map(container => container.cookieStoreId);
        cookieStoreIds = cookieStoreIds.concat(customContainerIds);
        
        if (DEBUG_MODE) {
          console.log(`Found ${containers.length} containers/workspaces to check for tabs`);
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities:", error);
        // Continuer avec uniquement le conteneur par défaut
      }
    }
    
    // 2. Obtenir les onglets pour chaque cookieStoreId
    if (cookieStoreIds.length > 1) {
      // Si des conteneurs sont détectés, obtenir les onglets de chaque conteneur
      for (const cookieStoreId of cookieStoreIds) {
        try {
          const containerTabs = await browser.tabs.query({ cookieStoreId });
          if (DEBUG_MODE) {
            console.log(`Processing ${containerTabs.length} tabs in container/workspace ${cookieStoreId}`);
          }
          tabs = tabs.concat(containerTabs);
        } catch (error) {
          console.warn(`Error querying tabs for container ${cookieStoreId}:`, error);
        }
      }
    }
    
    // 3. Fallback: Si aucun onglet n'a été trouvé via les conteneurs ou une erreur s'est produite
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("No tabs found via containers, using standard tab query");
      }
      tabs = await browser.tabs.query({});
    }
    
    // 4. Vérification de sécurité - si toujours pas d'onglets, essayer une dernière méthode
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("Still no tabs found, trying to query by window");
      }
      
      // Obtenir toutes les fenêtres
      const windows = await browser.windows.getAll();
      for (const window of windows) {
        const windowTabs = await browser.tabs.query({ windowId: window.id });
        tabs = tabs.concat(windowTabs);
      }
    }
  } catch (error) {
    console.error("Error collecting tabs in processTabs:", error);
    // En dernier recours, utilisez la requête la plus simple
    try {
      tabs = await browser.tabs.query({});
    } catch (e) {
      console.error("Critical error, couldn't get any tabs:", e);
      return; // Impossible de continuer
    }
  }
  
  // Get all active tabs (one per window/container)
  let activeTabs = [];
  try {
    activeTabs = await browser.tabs.query({ active: true });
  } catch (error) {
    console.error("Error getting active tabs:", error);
  }
  const activeTabIds = activeTabs.map(tab => tab.id);
  
  // Group tabs by window and container for better logging
  const windowsMap = new Map();
  const containerMap = new Map();
  
  tabs.forEach(tab => {
    // Groupe par fenêtre
    if (!windowsMap.has(tab.windowId)) {
      windowsMap.set(tab.windowId, []);
    }
    windowsMap.get(tab.windowId).push(tab);
    
    // Groupe par conteneur
    const containerId = tab.cookieStoreId || 'firefox-default';
    if (!containerMap.has(containerId)) {
      containerMap.set(containerId, []);
    }
    containerMap.get(containerId).push(tab);
    
    // Assurer que chaque onglet a un timestamp
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
  
  // Counter des actions effectuées
  let closedCount = 0;
  let discardedCount = 0;
  let skippedCount = 0;
  
  // Process each tab
  for (const tab of tabs) {
    // Skip processing if:
    // - Tab is active in any window (currently in use)
    // - Tab doesn't have a timestamp that exceeds the limit
    if (
      activeTabIds.includes(tab.id) ||
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
            const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
            console.log(`Discarded pinned tab ${tab.id}: ${tab.title} in window ${tab.windowId}${containerInfo}`);
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
        const containerInfo = tab.cookieStoreId ? ` (container: ${tab.cookieStoreId})` : '';
        console.log(`Closed tab ${tab.id}: ${tab.title} in window ${tab.windowId}${containerInfo}`);
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
  let tabs = [];
  let containerInfo = [];
  const now = Date.now();
  
  try {
    // 1. Essayer d'obtenir tous les cookieStoreIds disponibles (conteneurs/workspaces)
    let cookieStoreIds = ["firefox-default"]; // Toujours inclure le conteneur par défaut
    
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        // Extraire les informations des conteneurs
        containerInfo = containers.map(container => ({
          cookieStoreId: container.cookieStoreId,
          name: container.name,
          color: container.color,
          icon: container.icon,
          tabCount: 0 // Sera mis à jour plus tard
        }));
        
        // Ajouter les IDs de conteneurs pour la requête
        cookieStoreIds = cookieStoreIds.concat(containers.map(container => container.cookieStoreId));
        
      } catch (error) {
        console.warn("Error querying contextualIdentities:", error);
      }
    }
    
    // 2. Obtenir les onglets pour chaque cookieStoreId
    if (cookieStoreIds.length > 1) {
      // Si des conteneurs sont détectés, obtenir les onglets de chaque conteneur
      for (const cookieStoreId of cookieStoreIds) {
        try {
          const containerTabs = await browser.tabs.query({ cookieStoreId });
          
          // Mettre à jour le compteur d'onglets pour ce conteneur
          const container = containerInfo.find(c => c.cookieStoreId === cookieStoreId);
          if (container) {
            container.tabCount = containerTabs.length;
          } else if (cookieStoreId === "firefox-default") {
            // Ajouter le conteneur par défaut s'il n'est pas déjà dans la liste
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
    
    // 3. Fallback: Si aucun onglet n'a été trouvé via les conteneurs ou une erreur s'est produite
    if (tabs.length === 0) {
      if (DEBUG_MODE) {
        console.log("No tabs found via containers in getTabStats, using standard tab query");
      }
      tabs = await browser.tabs.query({});
      
      // Créer une entrée de conteneur par défaut si aucun conteneur n'est détecté
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
    // En dernier recours, utilisez la requête la plus simple
    tabs = await browser.tabs.query({});
    
    // Créer une entrée de conteneur par défaut
    containerInfo = [{
      cookieStoreId: "firefox-default",
      name: "Default",
      tabCount: tabs.length
    }];
  }
  
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

// Écouteurs pour les fenêtres/workspaces (si l'API est disponible)
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
    // Mise à jour périodique des timestamps pour garantir le bon fonctionnement du timer
    forceUpdateAllTabTimestamps();
  }
});
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
