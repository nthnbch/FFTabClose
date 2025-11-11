/**
 * FFTabClose - Mode SAFE TEST UNIQUEMENT
 * 
 * ⚠️  VERSION DE TEST - NE FERME AUCUN ONGLET RÉEL
 * ✅  Simule uniquement le comportement
 * ✅  Logs uniquement dans la console
 * ✅  AUCUNE action destructive
 */

console.log('🔒 FFTabClose SAFE MODE: Démarrage en mode test sécurisé');

// Configuration de test
const DEFAULT_CONFIG = {
  enabled: false, // ⚠️ DÉSACTIVÉ par défaut en mode safe
  closeTimeMinutes: 30,
  sleepPinnedTabs: true,
  excludePinned: true // ⚠️ Exclure les onglets épinglés par sécurité
};

let config = { ...DEFAULT_CONFIG };
let tabDataManager = new Map();

// ✅ SAFE: Classe de gestion des données (lecture seule)
class SafeTabDataManager {
  constructor() {
    this.tabData = new Map();
    console.log('🔒 SafeTabDataManager: Initialisé en mode lecture seule');
  }

  async init() {
    console.log('🔒 SafeTabDataManager: Initialisation...');
    await this.syncWithExistingTabs();
  }

  async syncWithExistingTabs() {
    try {
      const tabs = await browser.tabs.query({});
      console.log(`🔒 SAFE: ${tabs.length} onglets détectés`);
      
      for (const tab of tabs) {
        // ✅ SAFE: Enregistre seulement les métadonnées
        this.tabData.set(tab.id, {
          id: tab.id,
          title: tab.title,
          url: tab.url,
          pinned: tab.pinned,
          cookieStoreId: tab.cookieStoreId,
          lastActiveAt: Date.now(),
          // ⚠️ SAFE: Marquer comme protégé
          protected: tab.pinned || tab.url.startsWith('about:') || tab.title.includes('essential')
        });
      }
      
      console.log(`🔒 SAFE: ${this.tabData.size} onglets enregistrés sans modification`);
    } catch (error) {
      console.error('🔒 SAFE: Erreur lors de la synchronisation:', error);
    }
  }

  async markTabActive(tabId) {
    if (this.tabData.has(tabId)) {
      this.tabData.get(tabId).lastActiveAt = Date.now();
      console.log(`🔒 SAFE: Onglet ${tabId} marqué actif (simulation)`);
    }
  }

  // ✅ SAFE: Simulation uniquement - AUCUNE action réelle
  async findOldTabsSAFE(config) {
    console.log('🔒 SAFE: Recherche d\'onglets anciens (SIMULATION UNIQUEMENT)');
    
    const now = Date.now();
    const maxAge = config.closeTimeMinutes * 60 * 1000;
    const tabsToClose = [];
    const tabsToDiscard = [];
    
    for (const [tabId, tabInfo] of this.tabData) {
      const age = now - tabInfo.lastActiveAt;
      
      // ⚠️ SÉCURITÉ: Triple vérification
      if (tabInfo.protected || tabInfo.pinned || tabInfo.url.startsWith('about:')) {
        console.log(`🔒 SAFE: Onglet ${tabId} PROTÉGÉ - ignoré`);
        continue;
      }
      
      if (age > maxAge) {
        if (tabInfo.pinned && config.sleepPinnedTabs) {
          console.log(`🔒 SAFE: SIMULATION - Onglet épinglé ${tabId} serait mis en veille`);
          tabsToDiscard.push(tabInfo);
        } else if (!tabInfo.pinned) {
          console.log(`🔒 SAFE: SIMULATION - Onglet normal ${tabId} serait fermé`);
          tabsToClose.push(tabInfo);
        }
      }
    }
    
    return { tabsToClose, tabsToDiscard };
  }
}

// ✅ SAFE: Gestionnaire principal en mode test
class SafeFFTabCloseManager {
  constructor() {
    this.tabManager = new SafeTabDataManager();
    this.config = { ...DEFAULT_CONFIG };
    this.alarmName = 'ffTabCloseCheck';
    this.isProcessing = false;
    this.isZenBrowser = false;
    console.log('🔒 SAFE: Gestionnaire initialisé en MODE SÉCURISÉ');
  }

  async init() {
    console.log('🔒 SAFE: Initialisation en mode test...');
    
    await this.detectZenBrowser();
    await this.loadConfig();
    await this.tabManager.init();
    
    // ⚠️ SAFE: Pas de démarrage automatique
    console.log('🔒 SAFE: Extension initialisée - AUCUN traitement automatique');
    console.log('🔒 SAFE: Utilisez le popup pour tester manuellement');
  }

  async detectZenBrowser() {
    try {
      const info = await browser.runtime.getBrowserInfo();
      this.isZenBrowser = info.name.toLowerCase().includes('zen');
      if (this.isZenBrowser) {
        console.log('🔒 SAFE: Zen Browser détecté - Mode compatibilité');
      }
    } catch (error) {
      console.log('🔒 SAFE: Mode Firefox standard');
    }
  }

  async loadConfig() {
    try {
      const result = await browser.storage.sync.get(['config']);
      if (result.config) {
        this.config = { ...DEFAULT_CONFIG, ...result.config };
        // ⚠️ FORCE la sécurité
        this.config.enabled = false;
        this.config.excludePinned = true;
      }
      console.log('🔒 SAFE: Configuration chargée:', this.config);
    } catch (error) {
      console.error('🔒 SAFE: Erreur chargement config:', error);
    }
  }

  // ✅ SAFE: Test manuel sans danger
  async testProcessOldTabsSAFE() {
    console.log('🔒 SAFE: TEST MANUEL - Simulation traitement onglets');
    
    if (this.isProcessing) {
      console.log('🔒 SAFE: Test déjà en cours...');
      return { tabsToClose: [], tabsToDiscard: [] };
    }

    this.isProcessing = true;
    
    try {
      await this.tabManager.syncWithExistingTabs();
      const result = await this.tabManager.findOldTabsSAFE(this.config);
      
      console.log(`🔒 SAFE: SIMULATION RÉSULTAT:`);
      console.log(`  - Onglets qui seraient fermés: ${result.tabsToClose.length}`);
      console.log(`  - Onglets épinglés qui seraient mis en veille: ${result.tabsToDiscard.length}`);
      
      // ⚠️ SAFE: Afficher les détails sans rien faire
      if (result.tabsToClose.length > 0) {
        console.log('🔒 SAFE: Détails onglets qui seraient fermés:');
        result.tabsToClose.forEach(tab => {
          console.log(`  - ${tab.id}: ${tab.title} (${tab.url})`);
        });
      }
      
      if (result.tabsToDiscard.length > 0) {
        console.log('🔒 SAFE: Détails onglets épinglés qui seraient mis en veille:');
        result.tabsToDiscard.forEach(tab => {
          console.log(`  - ${tab.id}: ${tab.title} (${tab.url})`);
        });
      }
      
      console.log('🔒 SAFE: ✅ Test terminé - AUCUNE action réelle effectuée');
      return result;
      
    } catch (error) {
      console.error('🔒 SAFE: Erreur pendant le test:', error);
      return { tabsToClose: [], tabsToDiscard: [] };
    } finally {
      this.isProcessing = false;
    }
  }

  // ✅ SAFE: Statistiques de test
  async getStatsSafe() {
    try {
      await this.tabManager.syncWithExistingTabs();
      const allTabs = Array.from(this.tabManager.tabData.values());
      const now = Date.now();
      const maxAge = this.config.closeTimeMinutes * 60 * 1000;
      
      const stats = {
        totalTabs: allTabs.length,
        pinnedTabs: allTabs.filter(tab => tab.pinned).length,
        protectedTabs: allTabs.filter(tab => tab.protected).length,
        oldTabs: allTabs.filter(tab => (now - tab.lastActiveAt) >= maxAge && !tab.protected).length,
        enabled: false, // ⚠️ Toujours false en mode safe
        closeAfterMinutes: this.config.closeTimeMinutes,
        safeMode: true
      };
      
      console.log('🔒 SAFE: Statistiques:', stats);
      return stats;
    } catch (error) {
      console.error('🔒 SAFE: Erreur stats:', error);
      return { error: true, safeMode: true };
    }
  }

  setupEventListeners() {
    // ✅ SAFE: Écouter les onglets pour les stats seulement
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      await this.tabManager.markTabActive(activeInfo.tabId);
    });

    // ⚠️ SAFE: Communication popup
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
      console.log('🔒 SAFE: Message reçu:', message);
      
      if (message.type === 'getStats') {
        const stats = await this.getStatsSafe();
        sendResponse(stats);
      } else if (message.type === 'testProcess') {
        const result = await this.testProcessOldTabsSAFE();
        sendResponse(result);
      } else if (message.type === 'updateConfig') {
        console.log('🔒 SAFE: Mise à jour config bloquée en mode safe');
        sendResponse({ success: false, reason: 'Mode sécurisé actif' });
      }
      
      return true;
    });
  }
}

// ✅ SAFE: Instance sécurisée
const ffTabCloseSafe = new SafeFFTabCloseManager();

// ⚠️ SAFE: Initialisation
ffTabCloseSafe.init().then(() => {
  ffTabCloseSafe.setupEventListeners();
  console.log('🔒 SAFE: ✅ Extension prête en MODE SÉCURISÉ');
  console.log('🔒 SAFE: ⚠️  AUCUN onglet ne sera fermé automatiquement');
  console.log('🔒 SAFE: ℹ️  Utilisez le popup pour faire des tests manuels');
}).catch(error => {
  console.error('🔒 SAFE: Erreur fatale:', error);
});

// ✅ SAFE: Exposition pour tests
if (typeof window !== 'undefined') {
  window.ffTabCloseSafe = ffTabCloseSafe;
}