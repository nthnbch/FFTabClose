/**
 * FFTabClose - Tests - Tab Manager Service
 * Tests pour le service de gestion des onglets
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

// Mocks pour browser.tabs et browser.storage
const mockBrowser = {
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    remove: jest.fn(),
    discard: jest.fn()
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Remplacer l'objet browser global par le mock
global.browser = mockBrowser;

// Importer le module à tester (avec une importation dynamique pour éviter les problèmes avec les mocks)
let TabManagerService;

// Mock pour le service Zen
jest.mock('../services/zenService.js', () => ({
  getAllTabsAcrossWorkspaces: jest.fn(),
  getAllActiveTabsAcrossWorkspaces: jest.fn(),
  getAllTabsWithWorkspaceInfo: jest.fn()
}));

const zenService = require('../services/zenService.js');

describe('Tab Manager Service', () => {
  let tabManager;
  
  beforeEach(async () => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
    
    // Importer le module de manière dynamique
    const module = await import('../services/tabManagerService.js');
    TabManagerService = module.TabManagerService;
    
    // Créer une instance du service
    tabManager = new TabManagerService();
    
    // Configurer les mocks par défaut
    mockBrowser.storage.local.get.mockResolvedValue({ tabTimestamps: {} });
    mockBrowser.storage.local.set.mockResolvedValue();
  });
  
  describe('initialize', () => {
    test('should load tab timestamps on initialization', async () => {
      // Configurer le mock pour storage.local.get
      const mockTimestamps = { tabTimestamps: { '1': 123456789, '2': 123456790 } };
      mockBrowser.storage.local.get.mockResolvedValue(mockTimestamps);
      
      await tabManager.initialize();
      
      // Vérifier que les timestamps ont été chargés
      expect(tabManager.tabTimestamps).toEqual(mockTimestamps.tabTimestamps);
      expect(tabManager.initialized).toBe(true);
    });
    
    test('should handle errors during initialization', async () => {
      // Configurer le mock pour storage.local.get pour lancer une erreur
      mockBrowser.storage.local.get.mockRejectedValue(new Error('Storage error'));
      
      await tabManager.initialize();
      
      // Vérifier que le service est initialisé avec des valeurs par défaut en cas d'erreur
      expect(tabManager.tabTimestamps).toEqual({});
      expect(tabManager.initialized).toBe(false);
    });
  });
  
  describe('recordAllCurrentTabs', () => {
    test('should record timestamps for all tabs', async () => {
      // Configurer le mock pour getAllTabsAcrossWorkspaces
      const mockTabs = [
        { id: 1, windowId: 1 },
        { id: 2, windowId: 1 },
        { id: 3, windowId: 2 }
      ];
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      
      // Date fixe pour le test
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      await tabManager.recordAllCurrentTabs();
      
      // Vérifier que les timestamps ont été enregistrés
      expect(tabManager.tabTimestamps[1]).toBe(now);
      expect(tabManager.tabTimestamps[2]).toBe(now);
      expect(tabManager.tabTimestamps[3]).toBe(now);
      
      // Vérifier que les timestamps ont été sauvegardés
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        tabTimestamps: tabManager.tabTimestamps
      });
      
      // Restaurer la fonction Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });
    
    test('should preserve existing timestamps', async () => {
      // Configurer des timestamps existants
      tabManager.tabTimestamps = {
        '1': 100000,
        '2': 200000
      };
      
      // Configurer le mock pour getAllTabsAcrossWorkspaces
      const mockTabs = [
        { id: 1, windowId: 1 },
        { id: 2, windowId: 1 },
        { id: 3, windowId: 2 }
      ];
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      
      // Date fixe pour le test
      const now = 300000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      await tabManager.recordAllCurrentTabs();
      
      // Vérifier que les timestamps existants sont préservés
      expect(tabManager.tabTimestamps[1]).toBe(100000);
      expect(tabManager.tabTimestamps[2]).toBe(200000);
      
      // Vérifier que les nouveaux onglets ont des timestamps
      expect(tabManager.tabTimestamps[3]).toBe(now);
      
      // Restaurer la fonction Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });
  });
  
  describe('updateActiveTabsTimestamps', () => {
    test('should update timestamps for active tabs only', async () => {
      // Configurer des timestamps existants
      tabManager.tabTimestamps = {
        '1': 100000,
        '2': 200000,
        '3': 300000
      };
      
      // Configurer le mock pour getAllActiveTabsAcrossWorkspaces
      const mockActiveTabs = [
        { id: 1, windowId: 1 },
        { id: 3, windowId: 2 }
      ];
      zenService.getAllActiveTabsAcrossWorkspaces.mockResolvedValue(mockActiveTabs);
      
      // Date fixe pour le test
      const now = 400000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      await tabManager.updateActiveTabsTimestamps();
      
      // Vérifier que les timestamps des onglets actifs ont été mis à jour
      expect(tabManager.tabTimestamps[1]).toBe(now);
      expect(tabManager.tabTimestamps[3]).toBe(now);
      
      // Vérifier que les timestamps des onglets inactifs n'ont pas été modifiés
      expect(tabManager.tabTimestamps[2]).toBe(200000);
      
      // Restaurer la fonction Date.now
      jest.spyOn(Date, 'now').mockRestore();
    });
  });
  
  describe('closeTabSafely', () => {
    test('should close inactive tabs', async () => {
      // Configurer le mock pour tabs.get
      mockBrowser.tabs.get.mockResolvedValue({ id: 1, active: false });
      
      // Configurer le mock pour tabs.remove
      mockBrowser.tabs.remove.mockResolvedValue();
      
      // Configurer des timestamps existants
      tabManager.tabTimestamps = {
        '1': 100000
      };
      
      const result = await tabManager.closeTabSafely(1);
      
      // Vérifier que l'onglet a été fermé
      expect(mockBrowser.tabs.remove).toHaveBeenCalledWith(1);
      
      // Vérifier que le timestamp a été supprimé
      expect(tabManager.tabTimestamps[1]).toBeUndefined();
      
      // Vérifier que la fonction retourne true
      expect(result).toBe(true);
    });
    
    test('should not close active tabs', async () => {
      // Configurer le mock pour tabs.get
      mockBrowser.tabs.get.mockResolvedValue({ id: 1, active: true });
      
      const result = await tabManager.closeTabSafely(1);
      
      // Vérifier que l'onglet n'a pas été fermé
      expect(mockBrowser.tabs.remove).not.toHaveBeenCalled();
      
      // Vérifier que la fonction retourne false
      expect(result).toBe(false);
    });
    
    test('should handle errors when closing tabs', async () => {
      // Configurer le mock pour tabs.get
      mockBrowser.tabs.get.mockResolvedValue({ id: 1, active: false });
      
      // Configurer le mock pour tabs.remove pour lancer une erreur
      mockBrowser.tabs.remove.mockRejectedValue(new Error('Tab removal error'));
      
      const result = await tabManager.closeTabSafely(1);
      
      // Vérifier que la fonction retourne false en cas d'erreur
      expect(result).toBe(false);
    });
  });
  
  describe('discardTabSafely', () => {
    test('should discard inactive tabs that are not already discarded', async () => {
      // Configurer le mock pour tabs.get
      mockBrowser.tabs.get.mockResolvedValue({ id: 1, active: false, discarded: false });
      
      // Configurer le mock pour tabs.discard
      mockBrowser.tabs.discard.mockResolvedValue();
      
      const result = await tabManager.discardTabSafely(1);
      
      // Vérifier que l'onglet a été déchargé
      expect(mockBrowser.tabs.discard).toHaveBeenCalledWith(1);
      
      // Vérifier que la fonction retourne true
      expect(result).toBe(true);
    });
    
    test('should not discard active tabs', async () => {
      // Configurer le mock pour tabs.get
      mockBrowser.tabs.get.mockResolvedValue({ id: 1, active: true, discarded: false });
      
      const result = await tabManager.discardTabSafely(1);
      
      // Vérifier que l'onglet n'a pas été déchargé
      expect(mockBrowser.tabs.discard).not.toHaveBeenCalled();
      
      // Vérifier que la fonction retourne false
      expect(result).toBe(false);
    });
    
    test('should not discard already discarded tabs', async () => {
      // Configurer le mock pour tabs.get
      mockBrowser.tabs.get.mockResolvedValue({ id: 1, active: false, discarded: true });
      
      const result = await tabManager.discardTabSafely(1);
      
      // Vérifier que l'onglet n'a pas été déchargé
      expect(mockBrowser.tabs.discard).not.toHaveBeenCalled();
      
      // Vérifier que la fonction retourne false
      expect(result).toBe(false);
    });
  });
  
  describe('processTabs', () => {
    test('should process tabs according to settings and rules', async () => {
      // Configurer des timestamps existants
      const now = 400000;
      jest.spyOn(Date, 'now').mockReturnValue(now);
      
      tabManager.tabTimestamps = {
        '1': now - 1000, // Récent
        '2': now - 20000000, // Ancien
        '3': now - 20000000, // Ancien
        '4': now - 20000000, // Ancien mais épinglé
        '5': now - 20000000  // Ancien mais audio
      };
      
      // Configurer le mock pour getAllTabsAcrossWorkspaces
      const mockTabs = [
        { id: 1, active: false, pinned: false, audible: false, windowId: 1 },
        { id: 2, active: false, pinned: false, audible: false, windowId: 1 },
        { id: 3, active: false, pinned: false, audible: false, windowId: 2 },
        { id: 4, active: false, pinned: true, audible: false, windowId: 2 },
        { id: 5, active: false, pinned: false, audible: true, windowId: 1 }
      ];
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      
      // Configurer le mock pour getAllActiveTabsAcrossWorkspaces
      zenService.getAllActiveTabsAcrossWorkspaces.mockResolvedValue([]);
      
      // Configurer les mocks pour closeTabSafely et discardTabSafely
      jest.spyOn(tabManager, 'closeTabSafely').mockImplementation(async (tabId) => {
        delete tabManager.tabTimestamps[tabId];
        return true;
      });
      
      jest.spyOn(tabManager, 'discardTabSafely').mockResolvedValue(true);
      
      // Configurer un mock pour shouldProcessTabFn
      const shouldProcessTabFn = jest.fn().mockImplementation((tab) => {
        // Ne pas traiter l'onglet 3
        if (tab.id === 3) {
          return { shouldProcess: false, timeout: null };
        }
        return { shouldProcess: true, timeout: 10000000 }; // 10000 secondes
      });
      
      // Configurer les paramètres
      const settings = {
        timeLimit: 10000000, // 10000 secondes
        discardPinnedTabs: true,
        excludeAudioTabs: true
      };
      
      const stats = await tabManager.processTabs(settings, shouldProcessTabFn);
      
      // Vérifier que shouldProcessTabFn a été appelé pour chaque onglet
      expect(shouldProcessTabFn).toHaveBeenCalledTimes(5);
      
      // Vérifier que l'onglet 1 n'a pas été fermé (trop récent)
      expect(tabManager.closeTabSafely).not.toHaveBeenCalledWith(1);
      
      // Vérifier que l'onglet 2 a été fermé (ancien et non protégé)
      expect(tabManager.closeTabSafely).toHaveBeenCalledWith(2);
      
      // Vérifier que l'onglet 3 n'a pas été fermé (protégé par le shouldProcessTabFn)
      expect(tabManager.closeTabSafely).not.toHaveBeenCalledWith(3);
      
      // Vérifier que l'onglet 4 a été déchargé mais pas fermé (épinglé)
      expect(tabManager.discardTabSafely).toHaveBeenCalledWith(4);
      expect(tabManager.closeTabSafely).not.toHaveBeenCalledWith(4);
      
      // Vérifier que l'onglet 5 n'a pas été fermé (audio)
      expect(tabManager.closeTabSafely).not.toHaveBeenCalledWith(5);
      
      // Vérifier les statistiques
      expect(stats.closed).toBe(1); // Onglet 2
      expect(stats.discarded).toBe(1); // Onglet 4
      expect(stats.skipped).toBe(3); // Onglets 1, 3, 5
      
      // Restaurer les mocks
      jest.spyOn(Date, 'now').mockRestore();
      tabManager.closeTabSafely.mockRestore();
      tabManager.discardTabSafely.mockRestore();
    });
  });
});