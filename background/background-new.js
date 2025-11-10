/**
 * FFTabClose - Background Script V4.0
 * 
 * Extension Firefox/Zen pour fermer automatiquement les onglets après un délai
 * et mettre en veille les onglets épinglés.
 * 
 * Fonctionnalités :
 * - Fonctionne sur TOUS les workspaces/spaces Firefox/Zen
 * - Persiste à travers les redémarrages de Firefox
 * - Ferme les onglets normaux après le délai configuré
 * - Met en veille (discard) les onglets épinglés
 * - Compatible Arc Browser auto-closing behavior
 */

// Configuration par défaut
const DEFAULT_CONFIG = {
  enabled: true,
  closeAfterMinutes: 720, // 12 heures par défaut
  discardPinnedTabs: true, // Mettre en veille les onglets épinglés
  excludeActiveTab: true,  // Ne jamais fermer l'onglet actif
  excludeAudibleTabs: true, // Ne pas fermer les onglets qui jouent de l'audio
  checkIntervalMinutes: 1   // Vérification toutes les minutes
};

// Stockage des données de l'extension
class TabDataManager {
  constructor() {
    this.tabData = new Map(); // Map<tabId, TabInfo>
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    console.log('FFTabClose: Initializing TabDataManager');
    await this.loadFromStorage();
    await this.syncWithExistingTabs();
    this.initialized = true;
    console.log(`FFTabClose: TabDataManager initialized with ${this.tabData.size} tabs`);
  }

  // Structure des données d'un onglet
  createTabInfo(tab) {
    const now = Date.now();
    return {
      id: tab.id,
      url: tab.url,
      title: tab.title,
      windowId: tab.windowId,
      cookieStoreId: tab.cookieStoreId || 'default', // Pour les workspaces
      pinned: tab.pinned,
      createdAt: now,
      lastActiveAt: now,
      lastSeenAt: now,
      discarded: tab.discarded || false,
      audible: tab.audible || false
    };
  }

  // Ajouter ou mettre à jour un onglet
  async updateTab(tab) {
    const existing = this.tabData.get(tab.id);
    const now = Date.now();
    
    if (existing) {
      // Mettre à jour les informations existantes
      existing.url = tab.url;
      existing.title = tab.title;
      existing.pinned = tab.pinned;
      existing.discarded = tab.discarded || false;
      existing.audible = tab.audible || false;
      existing.lastSeenAt = now;
      
      // Mettre à jour lastActiveAt si l'onglet est actif
      if (tab.active) {
        existing.lastActiveAt = now;
      }
    } else {
      // Créer une nouvelle entrée
      this.tabData.set(tab.id, this.createTabInfo(tab));
    }
    
    await this.saveToStorage();
  }

  // Supprimer un onglet
  async removeTab(tabId) {
    if (this.tabData.delete(tabId)) {
      await this.saveToStorage();
      console.log(`FFTabClose: Removed tab data for ${tabId}`);
    }
  }

  // Marquer un onglet comme actif
  async markTabActive(tabId) {
    const tabInfo = this.tabData.get(tabId);
    if (tabInfo) {
      tabInfo.lastActiveAt = Date.now();
      await this.saveToStorage();
    }
  }

  // Obtenir les données d'un onglet
  getTabInfo(tabId) {
    return this.tabData.get(tabId);
  }

  // Obtenir tous les onglets
  getAllTabsData() {
    return Array.from(this.tabData.values());
  }

  // Synchroniser avec les onglets existants
  async syncWithExistingTabs() {
    try {
      const tabs = await browser.tabs.query({});
      const existingTabIds = new Set(tabs.map(tab => tab.id));
      
      // Supprimer les données des onglets qui n'existent plus
      for (const tabId of this.tabData.keys()) {
        if (!existingTabIds.has(tabId)) {
          this.tabData.delete(tabId);
        }
      }
      
      // Ajouter les nouveaux onglets
      for (const tab of tabs) {
        await this.updateTab(tab);
      }
      
      console.log(`FFTabClose: Synced with ${tabs.length} existing tabs`);
    } catch (error) {
      console.error('FFTabClose: Error syncing with existing tabs:', error);
    }
  }

  // Sauvegarder dans le storage
  async saveToStorage() {
    try {
      const data = {};
      this.tabData.forEach((tabInfo, tabId) => {
        data[tabId] = tabInfo;
      });
      
      await browser.storage.local.set({ 
        tabData: data,
        lastSaved: Date.now()
      });
    } catch (error) {
      console.error('FFTabClose: Error saving tab data:', error);
    }
  }

  // Charger depuis le storage
  async loadFromStorage() {
    try {
      const result = await browser.storage.local.get(['tabData', 'lastSaved']);
      
      if (result.tabData) {
        this.tabData.clear();
        Object.entries(result.tabData).forEach(([tabId, tabInfo]) => {
          this.tabData.set(parseInt(tabId), tabInfo);
        });
        
        const lastSaved = new Date(result.lastSaved || 0);
        console.log(`FFTabClose: Loaded ${this.tabData.size} tabs from storage (last saved: ${lastSaved.toISOString()})`);
      }
    } catch (error) {
      console.error('FFTabClose: Error loading tab data:', error);
    }
  }

  // Trouver les onglets anciens à traiter
  async findOldTabs(config) {
    const now = Date.now();
    const maxAge = config.closeAfterMinutes * 60 * 1000; // Convertir en millisecondes
    
    // Obtenir les onglets actifs actuels
    const activeTabs = await browser.tabs.query({ active: true });
    const activeTabIds = new Set(activeTabs.map(tab => tab.id));
    
    const tabsToClose = [];
    const tabsToDiscard = [];
    
    for (const tabInfo of this.tabData.values()) {
      // Calculer l'âge basé sur la dernière activité
      const age = now - tabInfo.lastActiveAt;
      
      if (age >= maxAge) {
        // Exclure l'onglet actif si configuré
        if (config.excludeActiveTab && activeTabIds.has(tabInfo.id)) {
          console.log(`FFTabClose: Excluding active tab ${tabInfo.id}`);
          continue;
        }
        
        // Exclure les onglets audibles si configuré
        if (config.excludeAudibleTabs && tabInfo.audible) {
          console.log(`FFTabClose: Excluding audible tab ${tabInfo.id}`);
          continue;
        }
        
        if (tabInfo.pinned && config.discardPinnedTabs) {
          // Onglets épinglés : mettre en veille
          tabsToDiscard.push(tabInfo);
        } else if (!tabInfo.pinned) {
          // Onglets normaux : fermer
          tabsToClose.push(tabInfo);
        }
      }
    }
    
    return { tabsToClose, tabsToDiscard };
  }
}

// Gestionnaire principal
class FFTabCloseManager {
  constructor() {
    this.tabManager = new TabDataManager();
    this.config = { ...DEFAULT_CONFIG };
    this.alarmName = 'ffTabCloseCheck';
    this.isProcessing = false;
    this.isZenBrowser = false;
  }

  async init() {
    console.log('FFTabClose: Starting initialization...');
    
    // Detect Zen Browser
    await this.detectZenBrowser();
    
    // Charger la configuration
    await this.loadConfig();
    
    // Initialiser le gestionnaire d'onglets
    await this.tabManager.init();
    
    // Configurer les écouteurs d'événements
    this.setupEventListeners();
    
    // Démarrer le système de vérification périodique
    if (this.config.enabled) {
      await this.startPeriodicCheck();
    }
    
    console.log(`FFTabClose: Initialization complete${this.isZenBrowser ? ' (Zen Browser detected)' : ''}`);
  }

  // Détecter Zen Browser
  async detectZenBrowser() {
    try {
      // Zen Browser has specific user agent or extensions
      const info = await browser.runtime.getBrowserInfo();
      this.isZenBrowser = info.name.toLowerCase().includes('zen') || 
                          info.vendor.toLowerCase().includes('zen');
      
      if (this.isZenBrowser) {
        console.log('FFTabClose: Zen Browser detected - Enhanced workspace compatibility enabled');
      }
    } catch (error) {
      // Fallback detection methods for Zen
      try {
        // Check for Zen-specific APIs or features
        this.isZenBrowser = typeof browser.contextualIdentities !== 'undefined' &&
                            navigator.userAgent.includes('Zen');
      } catch (e) {
        console.log('FFTabClose: Standard Firefox mode');
      }
    }
  }

  // Charger la configuration
  async loadConfig() {
    try {
      const result = await browser.storage.sync.get('config');
      if (result.config) {
        this.config = { ...DEFAULT_CONFIG, ...result.config };
      }
      console.log('FFTabClose: Config loaded:', this.config);
    } catch (error) {
      console.error('FFTabClose: Error loading config:', error);
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  // Sauvegarder la configuration
  async saveConfig() {
    try {
      await browser.storage.sync.set({ config: this.config });
      console.log('FFTabClose: Config saved');
    } catch (error) {
      console.error('FFTabClose: Error saving config:', error);
    }
  }

  // Configurer les écouteurs d'événements
  setupEventListeners() {
    // Onglets créés
    browser.tabs.onCreated.addListener(async (tab) => {
      console.log(`FFTabClose: Tab created: ${tab.id} (${tab.title})`);
      await this.tabManager.updateTab(tab);
    });

    // Onglets mis à jour
    browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.audible !== undefined) {
        await this.tabManager.updateTab(tab);
      }
    });

    // Onglets supprimés
    browser.tabs.onRemoved.addListener(async (tabId) => {
      console.log(`FFTabClose: Tab removed: ${tabId}`);
      await this.tabManager.removeTab(tabId);
    });

    // Onglet activé (changement de focus)
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      console.log(`FFTabClose: Tab activated: ${activeInfo.tabId}`);
      await this.tabManager.markTabActive(activeInfo.tabId);
    });

    // Fenêtre focus changé
    browser.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId !== browser.windows.WINDOW_ID_NONE) {
        try {
          const tabs = await browser.tabs.query({ windowId, active: true });
          if (tabs[0]) {
            await this.tabManager.markTabActive(tabs[0].id);
          }
        } catch (error) {
          console.error('FFTabClose: Error handling window focus:', error);
        }
      }
    });

    // Alarmes
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name === this.alarmName) {
        await this.processOldTabs();
      }
    });

    // Changements de configuration
    browser.storage.onChanged.addListener(async (changes, area) => {
      if (area === 'sync' && changes.config) {
        await this.loadConfig();
        if (this.config.enabled) {
          await this.startPeriodicCheck();
        } else {
          await this.stopPeriodicCheck();
        }
      }
    });

    // Messages depuis le popup
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'getStats') {
        const stats = this.getStats();
        sendResponse({ stats });
      } else if (message.action === 'forceProcess') {
        this.forceProcess()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Indique une réponse asynchrone
      }
    });
  }

  // Démarrer la vérification périodique
  async startPeriodicCheck() {
    await browser.alarms.clear(this.alarmName);
    await browser.alarms.create(this.alarmName, {
      periodInMinutes: this.config.checkIntervalMinutes
    });
    console.log(`FFTabClose: Periodic check started (every ${this.config.checkIntervalMinutes} minutes)`);
  }

  // Arrêter la vérification périodique
  async stopPeriodicCheck() {
    await browser.alarms.clear(this.alarmName);
    console.log('FFTabClose: Periodic check stopped');
  }

  // Traiter les onglets anciens
  async processOldTabs() {
    if (this.isProcessing) {
      console.log('FFTabClose: Already processing, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      const logPrefix = this.isZenBrowser ? 'FFTabClose (Zen)' : 'FFTabClose';
      console.log(`${logPrefix}: Starting old tabs processing...`);
      
      // Synchroniser avec les onglets actuels
      await this.tabManager.syncWithExistingTabs();
      
      // Trouver les onglets à traiter
      const { tabsToClose, tabsToDiscard } = await this.tabManager.findOldTabs(this.config);
      
      console.log(`${logPrefix}: Found ${tabsToClose.length} tabs to close and ${tabsToDiscard.length} tabs to discard`);
      
      // Log Zen-specific information if available
      if (this.isZenBrowser && tabsToClose.length > 0) {
        const workspaceInfo = await this.getZenWorkspaceInfo(tabsToClose.concat(tabsToDiscard));
        if (workspaceInfo.size > 0) {
          console.log(`${logPrefix}: Processing tabs across ${workspaceInfo.size} workspace(s):`, 
                     Array.from(workspaceInfo.entries()).map(([ws, count]) => `${ws || 'default'}(${count})`).join(', '));
        }
      }
      
      // Fermer les onglets normaux
      if (tabsToClose.length > 0) {
        const tabIds = tabsToClose.map(tab => tab.id);
        
        try {
          await browser.tabs.remove(tabIds);
          console.log(`FFTabClose: Successfully closed ${tabIds.length} tabs`);
          
          // Supprimer les données des onglets fermés
          for (const tabId of tabIds) {
            await this.tabManager.removeTab(tabId);
          }
        } catch (error) {
          console.error('FFTabClose: Error closing tabs:', error);
        }
      }
      
      // Mettre en veille les onglets épinglés
      if (tabsToDiscard.length > 0) {
        for (const tabInfo of tabsToDiscard) {
          try {
            if (!tabInfo.discarded) {
              // Pour Firefox, on marque l'onglet comme "en veille" dans nos données
              // et on le recharge avec une URL de placeholder si ce n'est pas déjà fait
              if (!tabInfo.url.startsWith('data:text/html')) {
                // Sauvegarder l'URL originale
                tabInfo.originalUrl = tabInfo.url;
                tabInfo.originalTitle = tabInfo.title;
                
                // Remplacer par une page de veille
                const sleepPageUrl = `data:text/html,<!DOCTYPE html>
                <html><head><title>💤 ${encodeURIComponent(tabInfo.title)} (en veille)</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui; 
                         text-align: center; padding: 50px; background: #f5f5f5; color: #666; }
                  .icon { font-size: 48px; margin-bottom: 20px; }
                  h1 { margin: 0; font-size: 18px; font-weight: normal; }
                  p { margin: 10px 0 0; font-size: 14px; opacity: 0.7; }
                  .url { font-family: monospace; background: #e0e0e0; padding: 4px 8px; 
                         border-radius: 4px; display: inline-block; margin-top: 10px; word-break: break-all; }
                </style></head>
                <body>
                  <div class="icon">💤</div>
                  <h1>Onglet en veille</h1>
                  <p>Cet onglet épinglé a été mis en veille par FFTabClose</p>
                  <p>Il se rechargera automatiquement quand vous cliquerez dessus</p>
                  <div class="url">${encodeURIComponent(tabInfo.originalUrl)}</div>
                  <script>
                    const originalUrl = decodeURIComponent('${encodeURIComponent(tabInfo.originalUrl)}');
                    document.addEventListener('visibilitychange', function() {
                      if (!document.hidden) {
                        window.location.href = originalUrl;
                      }
                    });
                  </script>
                </body></html>`;
                
                await browser.tabs.update(tabInfo.id, { url: sleepPageUrl });
                console.log(`FFTabClose: Successfully put pinned tab ${tabInfo.id} to sleep (${tabInfo.originalUrl})`);
              }
              
              // Mettre à jour les données
              tabInfo.discarded = true;
              tabInfo.lastActiveAt = Date.now(); // Reset timer after discard
            }
          } catch (error) {
            console.error(`FFTabClose: Error putting tab ${tabInfo.id} to sleep:`, error);
          }
        }
        
        await this.tabManager.saveToStorage();
      }
      
    } catch (error) {
      console.error('FFTabClose: Error in processOldTabs:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Forcer un traitement immédiat
  async forceProcess() {
    console.log('FFTabClose: Force processing old tabs...');
    await this.processOldTabs();
  }

  // Obtenir les statistiques
  getStats() {
    const allTabs = this.tabManager.getAllTabsData();
    const now = Date.now();
    const maxAge = this.config.closeAfterMinutes * 60 * 1000;
    
    const stats = {
      totalTabs: allTabs.length,
      pinnedTabs: allTabs.filter(tab => tab.pinned).length,
      oldTabs: allTabs.filter(tab => (now - tab.lastActiveAt) >= maxAge).length,
      enabled: this.config.enabled,
      closeAfterMinutes: this.config.closeAfterMinutes
    };
    
    return stats;
  }

  // Get Zen Browser workspace information for logging
  async getZenWorkspaceInfo(tabs) {
    const workspaceMap = new Map();
    
    try {
      for (const tab of tabs) {
        // In Zen Browser, workspace info is available via cookieStoreId
        const workspace = tab.cookieStoreId || 'default';
        workspaceMap.set(workspace, (workspaceMap.get(workspace) || 0) + 1);
      }
    } catch (error) {
      console.warn('FFTabClose: Error gathering Zen workspace info:', error);
    }
    
    return workspaceMap;
  }
}

// Instance globale
const ffTabClose = new FFTabCloseManager();

// Initialiser l'extension
ffTabClose.init().catch(error => {
  console.error('FFTabClose: Fatal initialization error:', error);
});

// Exposer pour les tests et le popup
if (typeof window !== 'undefined') {
  window.ffTabClose = ffTabClose;
}