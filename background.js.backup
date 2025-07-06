/**
 * FFTabClose - Auto Tab Closer for Firefox
 * Service Worker for Manifest V3 compatibility
 * Automatically closes non-pinned tabs after configurable timeout
 */

// Default configuration
const DEFAULT_CONFIG = {
  autoCloseTime: 12 * 60 * 60 * 1000, // 12 hours default
  enabled: true,
  excludePinned: true,
  excludeAudible: true
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
 * Check and close expired tabs
 */
async function checkAndCloseTabs() {
  if (!currentConfig.enabled) return;
  
  try {
    const tabs = await browser.tabs.query({});
    const now = Date.now();
    const tabsToClose = [];
    
    for (const tab of tabs) {
      if (await shouldCloseTab(tab, now)) {
        tabsToClose.push(tab.id);
      }
    }
    
    // Close expired tabs
    if (tabsToClose.length > 0) {
      await browser.tabs.remove(tabsToClose);
      
      // Remove from timestamps
      tabsToClose.forEach(tabId => unregisterTab(tabId));
      await saveTabTimestamps();
      
      console.log(`FFTabClose: Closed ${tabsToClose.length} expired tab(s)`);
      
      // Show notification badge
      await showNotificationBadge(tabsToClose.length);
    }
    
  } catch (error) {
    console.error('FFTabClose: Error checking tabs:', error);
  }
}

/**
 * Determine if a tab should be closed
 */
async function shouldCloseTab(tab, now) {
  // Never close active tab
  if (tab.active) return false;
  
  // Never close pinned tabs if configured
  if (currentConfig.excludePinned && tab.pinned) return false;
  
  // Never close audible tabs if configured
  if (currentConfig.excludeAudible && tab.audible) return false;
  
  // Check tab age
  const timestamp = tabTimestamps.get(tab.id.toString());
  if (!timestamp) {
    // Register tab if not found
    registerTab(tab.id, now);
    return false;
  }
  
  const age = now - timestamp;
  return age > currentConfig.autoCloseTime;
}

/**
 * Show notification badge
 */
async function showNotificationBadge(count) {
  try {
    await browser.action.setBadgeText({ text: count.toString() });
    await browser.action.setBadgeBackgroundColor({ color: '#4CAF50' });
    
    // Clear badge after 3 seconds
    setTimeout(async () => {
      try {
        await browser.action.setBadgeText({ text: '' });
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
    let oldestTabAge = 0;
    
    for (const tab of tabs) {
      if (!tab.active && (!currentConfig.excludePinned || !tab.pinned)) {
        eligibleTabs++;
        
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
    }
  }
  
  setupEventListeners() {
    // Nouveau onglet créé
    browser.tabs.onCreated.addListener((tab) => {
      this.registerTab(tab.id);
    });
    
    // Onglet mis à jour (changement d'URL, etc.)
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url || changeInfo.status === 'complete') {
        this.registerTab(tabId);
      }
      
      // Si l'onglet est épinglé/désépinglé
      if (changeInfo.pinned !== undefined) {
        this.registerTab(tabId);
      }
    });
    
    // Onglet activé (focus)
    browser.tabs.onActivated.addListener((activeInfo) => {
      this.registerTab(activeInfo.tabId);
    });
    
    // Onglet fermé
    browser.tabs.onRemoved.addListener((tabId) => {
      this.unregisterTab(tabId);
    });
    
    // Écouter les messages du popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }
  
  async initializeExistingTabs() {
    try {
      const tabs = await browser.tabs.query({});
      tabs.forEach(tab => {
        this.registerTab(tab.id);
      });
    } catch (error) {
      console.error('Failed to initialize existing tabs:', error);
    }
  }
  
  registerTab(tabId) {
    const now = Date.now();
    this.tabTimestamps.set(tabId, now);
    
    // Nettoyer la carte des onglets fermés
    this.cleanupClosedTabs();
  }
  
  unregisterTab(tabId) {
    this.tabTimestamps.delete(tabId);
  }
  
  async cleanupClosedTabs() {
    try {
      const tabs = await browser.tabs.query({});
      const existingTabIds = new Set(tabs.map(tab => tab.id));
      
      // Supprimer les entrées des onglets qui n'existent plus
      for (const tabId of this.tabTimestamps.keys()) {
        if (!existingTabIds.has(tabId)) {
          this.tabTimestamps.delete(tabId);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup closed tabs:', error);
    }
  }
  
  startMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    if (!this.config.enabled) {
      return;
    }
    
    // Vérifier toutes les 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkAndCloseTabs();
    }, 5 * 60 * 1000);
    
    // Première vérification immédiate
    this.checkAndCloseTabs();
  }
  
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  async checkAndCloseTabs() {
    if (!this.config.enabled) {
      return;
    }
    
    try {
      const tabs = await browser.tabs.query({});
      const now = Date.now();
      const tabsToClose = [];
      
      for (const tab of tabs) {
        if (await this.shouldCloseTab(tab, now)) {
          tabsToClose.push(tab.id);
        }
      }
      
      // Fermer les onglets identifiés
      for (const tabId of tabsToClose) {
        try {
          await browser.tabs.remove(tabId);
          this.unregisterTab(tabId);
          console.log(`Tab ${tabId} closed automatically`);
        } catch (error) {
          console.warn(`Failed to close tab ${tabId}:`, error);
        }
      }
      
      if (tabsToClose.length > 0) {
        this.showNotification(`${tabsToClose.length} onglet(s) fermé(s) automatiquement`);
      }
      
    } catch (error) {
      console.error('Error checking tabs:', error);
    }
  }
  
  async shouldCloseTab(tab, now) {
    // Ne pas fermer l'onglet actif
    if (tab.active) {
      return false;
    }
    
    // Ne pas fermer les onglets épinglés si configuré
    if (this.config.excludePinned && tab.pinned) {
      return false;
    }
    
    // Ne pas fermer les onglets avec audio si configuré
    if (this.config.excludeAudible && tab.audible) {
      return false;
    }
    
    // Vérifier l'âge de l'onglet
    const timestamp = this.tabTimestamps.get(tab.id);
    if (!timestamp) {
      // Si pas de timestamp, on en crée un maintenant
      this.registerTab(tab.id);
      return false;
    }
    
    const age = now - timestamp;
    return age > this.config.autoCloseTime;
  }
  
  showNotification(message) {
    // Notification discrète via badge
    try {
      browser.browserAction.setBadgeText({ text: '✓' });
      browser.browserAction.setBadgeBackgroundColor({ color: '#4CAF50' });
      
      // Effacer le badge après 3 secondes
      setTimeout(() => {
        browser.browserAction.setBadgeText({ text: '' });
      }, 3000);
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }
  
  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'getConfig':
        sendResponse(this.config);
        break;
        
      case 'updateConfig':
        this.config = { ...this.config, ...message.config };
        await this.saveConfig();
        
        // Redémarrer la surveillance avec la nouvelle config
        this.startMonitoring();
        
        sendResponse({ success: true });
        break;
        
      case 'getStats':
        const stats = await this.getStats();
        sendResponse(stats);
        break;
        
      case 'checkNow':
        await this.checkAndCloseTabs();
        sendResponse({ success: true });
        break;
        
      case 'resetStats':
        this.tabTimestamps.clear();
        await this.initializeExistingTabs();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }
  
  async getStats() {
    try {
      const tabs = await browser.tabs.query({});
      const now = Date.now();
      
      let eligibleTabs = 0;
      let oldestTabAge = 0;
      
      for (const tab of tabs) {
        if (!tab.active && (!this.config.excludePinned || !tab.pinned)) {
          eligibleTabs++;
          
          const timestamp = this.tabTimestamps.get(tab.id);
          if (timestamp) {
            const age = now - timestamp;
            oldestTabAge = Math.max(oldestTabAge, age);
          }
        }
      }
      
      return {
        totalTabs: tabs.length,
        eligibleTabs,
        oldestTabAge: Math.floor(oldestTabAge / (60 * 1000)), // en minutes
        enabled: this.config.enabled,
        autoCloseTime: Math.floor(this.config.autoCloseTime / (60 * 60 * 1000)) // en heures
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }
}

// Initialiser le gestionnaire d'onglets
const tabManager = new TabManager();
