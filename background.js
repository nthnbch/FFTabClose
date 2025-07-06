// FFTabClose - Background Script
// Gère la logique principale de fermeture automatique des onglets

class TabManager {
  constructor() {
    this.config = {
      autoCloseTime: 12 * 60 * 60 * 1000, // 12 heures par défaut
      enabled: true,
      excludePinned: true,
      excludeAudible: true
    };
    
    this.tabTimestamps = new Map();
    this.checkInterval = null;
    
    this.init();
  }
  
  async init() {
    // Charger la configuration depuis le storage
    await this.loadConfig();
    
    // Démarrer le système de surveillance
    this.startMonitoring();
    
    // Écouter les événements de tabs
    this.setupEventListeners();
    
    // Initialiser les onglets existants
    await this.initializeExistingTabs();
    
    console.log('FFTabClose initialized with config:', this.config);
  }
  
  async loadConfig() {
    try {
      const stored = await browser.storage.sync.get(['fftabclose_config']);
      if (stored.fftabclose_config) {
        this.config = { ...this.config, ...stored.fftabclose_config };
      }
    } catch (error) {
      console.warn('Failed to load config:', error);
    }
  }
  
  async saveConfig() {
    try {
      await browser.storage.sync.set({ fftabclose_config: this.config });
    } catch (error) {
      console.error('Failed to save config:', error);
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
