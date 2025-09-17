/**
 * FFTabClose - Tests - Zen Service
 * Tests pour le service Zen
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

// Mocks pour browser.tabs et browser.contextualIdentities
const mockBrowser = {
  tabs: {
    query: jest.fn()
  },
  contextualIdentities: {
    query: jest.fn()
  },
  windows: {
    getAll: jest.fn()
  }
};

// Remplacer l'objet browser global par le mock
global.browser = mockBrowser;

// Importer le module à tester (avec une importation dynamique pour éviter les problèmes avec les mocks)
let zenService;

describe('Zen Service', () => {
  beforeEach(async () => {
    // Réinitialiser les mocks avant chaque test
    jest.clearAllMocks();
    
    // Importer le module de manière dynamique pour s'assurer que les mocks sont appliqués
    zenService = await import('../services/zenService.js');
  });
  
  describe('isZenWorkspace', () => {
    test('should return true for containers with Zen in the name', () => {
      const container = {
        cookieStoreId: 'container-1',
        name: 'Zen Workspace'
      };
      
      expect(zenService.isZenWorkspace(container)).toBe(true);
    });
    
    test('should return true for containers with specific IDs', () => {
      const container = {
        cookieStoreId: 'zen-container-1',
        name: 'Regular Container'
      };
      
      expect(zenService.isZenWorkspace(container)).toBe(true);
    });
    
    test('should return false for default container', () => {
      const container = {
        cookieStoreId: 'firefox-default',
        name: 'Default'
      };
      
      expect(zenService.isZenWorkspace(container)).toBe(false);
    });
    
    test('should return false for null input', () => {
      expect(zenService.isZenWorkspace(null)).toBe(false);
    });
  });
  
  describe('isTabInZenWorkspace', () => {
    test('should return true for tabs in Zen containers', () => {
      const tab = {
        id: 1,
        cookieStoreId: 'zen-container-1'
      };
      
      expect(zenService.isTabInZenWorkspace(tab)).toBe(true);
    });
    
    test('should return false for tabs in default container', () => {
      const tab = {
        id: 2,
        cookieStoreId: 'firefox-default'
      };
      
      expect(zenService.isTabInZenWorkspace(tab)).toBe(false);
    });
    
    test('should return false for tabs without cookieStoreId', () => {
      const tab = {
        id: 3
      };
      
      expect(zenService.isTabInZenWorkspace(tab)).toBe(false);
    });
  });
  
  describe('detectAllWorkspaces', () => {
    test('should detect workspaces from contextualIdentities', async () => {
      // Configurer le mock pour contextualIdentities.query
      mockBrowser.contextualIdentities.query.mockResolvedValue([
        { cookieStoreId: 'container-1', name: 'Work', color: 'blue', icon: 'briefcase' },
        { cookieStoreId: 'zen-container-2', name: 'Zen Space', color: 'green', icon: 'circle' }
      ]);
      
      // Configurer le mock pour tabs.query
      mockBrowser.tabs.query.mockResolvedValue([
        { id: 1, cookieStoreId: 'container-1' },
        { id: 2, cookieStoreId: 'zen-container-2' },
        { id: 3, cookieStoreId: 'firefox-default' }
      ]);
      
      const workspaces = await zenService.detectAllWorkspaces();
      
      // Vérifier que la fonction a retourné le bon nombre de workspaces
      expect(workspaces.length).toBe(3); // 2 containers + default
      
      // Vérifier que les workspaces ont les bonnes propriétés
      expect(workspaces[0].id).toBe('container-1');
      expect(workspaces[0].name).toBe('Work');
      expect(workspaces[0].isZen).toBe(true);
      
      expect(workspaces[1].id).toBe('zen-container-2');
      expect(workspaces[1].name).toBe('Zen Space');
      expect(workspaces[1].isZen).toBe(true);
      
      // Vérifier que l'espace par défaut est présent
      const defaultWorkspace = workspaces.find(w => w.id === 'firefox-default');
      expect(defaultWorkspace).toBeDefined();
      expect(defaultWorkspace.isZen).toBe(false);
    });
    
    test('should handle errors from contextualIdentities', async () => {
      // Configurer le mock pour contextualIdentities.query pour lancer une erreur
      mockBrowser.contextualIdentities.query.mockRejectedValue(new Error('API not available'));
      
      // Configurer le mock pour tabs.query
      mockBrowser.tabs.query.mockResolvedValue([
        { id: 1, cookieStoreId: 'container-1' },
        { id: 2, cookieStoreId: 'firefox-default' }
      ]);
      
      const workspaces = await zenService.detectAllWorkspaces();
      
      // Vérifier que la fonction a retourné les workspaces détectés à partir des onglets
      expect(workspaces.length).toBe(2); // container-1 + default
      
      // Vérifier que container-1 est détecté
      expect(workspaces[0].id).toBe('container-1');
      expect(workspaces[0].isZen).toBe(true);
      
      // Vérifier que l'espace par défaut est présent
      const defaultWorkspace = workspaces.find(w => w.id === 'firefox-default');
      expect(defaultWorkspace).toBeDefined();
      expect(defaultWorkspace.isZen).toBe(false);
    });
  });
  
  describe('getAllTabsAcrossWorkspaces', () => {
    test('should gather tabs from all windows and containers', async () => {
      // Configurer le mock pour tabs.query (global)
      mockBrowser.tabs.query.mockImplementation(async (query) => {
        if (!query || Object.keys(query).length === 0) {
          // Requête globale
          return [
            { id: 1, windowId: 1, cookieStoreId: 'container-1' },
            { id: 2, windowId: 1, cookieStoreId: 'firefox-default' },
            { id: 3, windowId: 2, cookieStoreId: 'zen-container-2' }
          ];
        } else if (query.windowId === 1) {
          // Requête pour la fenêtre 1
          return [
            { id: 1, windowId: 1, cookieStoreId: 'container-1' },
            { id: 2, windowId: 1, cookieStoreId: 'firefox-default' }
          ];
        } else if (query.windowId === 2) {
          // Requête pour la fenêtre 2
          return [
            { id: 3, windowId: 2, cookieStoreId: 'zen-container-2' },
            { id: 4, windowId: 2, cookieStoreId: 'firefox-default' } // Nouvel onglet non détecté par la requête globale
          ];
        } else if (query.cookieStoreId === 'container-1') {
          // Requête pour le conteneur 'container-1'
          return [
            { id: 1, windowId: 1, cookieStoreId: 'container-1' }
          ];
        } else if (query.cookieStoreId === 'zen-container-2') {
          // Requête pour le conteneur 'zen-container-2'
          return [
            { id: 3, windowId: 2, cookieStoreId: 'zen-container-2' }
          ];
        }
        return [];
      });
      
      // Configurer le mock pour windows.getAll
      mockBrowser.windows.getAll.mockResolvedValue([
        { id: 1 },
        { id: 2 }
      ]);
      
      // Configurer le mock pour contextualIdentities.query
      mockBrowser.contextualIdentities.query.mockResolvedValue([
        { cookieStoreId: 'container-1', name: 'Work' },
        { cookieStoreId: 'zen-container-2', name: 'Zen Space' }
      ]);
      
      const allTabs = await zenService.getAllTabsAcrossWorkspaces();
      
      // Vérifier que la fonction a retourné tous les onglets uniques
      expect(allTabs.length).toBe(4); // 3 de la requête globale + 1 nouveau de la fenêtre 2
      
      // Vérifier que les onglets ont les bons IDs
      const tabIds = allTabs.map(tab => tab.id);
      expect(tabIds).toContain(1);
      expect(tabIds).toContain(2);
      expect(tabIds).toContain(3);
      expect(tabIds).toContain(4);
    });
    
    test('should handle errors and return an empty array', async () => {
      // Configurer le mock pour tabs.query pour lancer une erreur
      mockBrowser.tabs.query.mockRejectedValue(new Error('API error'));
      mockBrowser.windows.getAll.mockRejectedValue(new Error('API error'));
      mockBrowser.contextualIdentities.query.mockRejectedValue(new Error('API error'));
      
      const allTabs = await zenService.getAllTabsAcrossWorkspaces();
      
      // Vérifier que la fonction retourne un tableau vide en cas d'erreur
      expect(allTabs).toEqual([]);
    });
  });
  
  describe('getAllActiveTabsAcrossWorkspaces', () => {
    test('should return only active tabs from all workspaces', async () => {
      // Configurer la fonction getAllTabsAcrossWorkspaces pour qu'elle retourne des onglets de test
      const mockTabs = [
        { id: 1, active: true, windowId: 1, cookieStoreId: 'container-1' },
        { id: 2, active: false, windowId: 1, cookieStoreId: 'firefox-default' },
        { id: 3, active: true, windowId: 2, cookieStoreId: 'zen-container-2' },
        { id: 4, active: false, windowId: 2, cookieStoreId: 'firefox-default' }
      ];
      
      // Espionner la fonction getAllTabsAcrossWorkspaces
      const getAllTabsSpy = jest.spyOn(zenService, 'getAllTabsAcrossWorkspaces');
      getAllTabsSpy.mockResolvedValue(mockTabs);
      
      const activeTabs = await zenService.getAllActiveTabsAcrossWorkspaces();
      
      // Vérifier que la fonction a retourné uniquement les onglets actifs
      expect(activeTabs.length).toBe(2);
      
      // Vérifier que les onglets ont les bons IDs
      const tabIds = activeTabs.map(tab => tab.id);
      expect(tabIds).toContain(1);
      expect(tabIds).toContain(3);
      
      // Restaurer l'espion
      getAllTabsSpy.mockRestore();
    });
  });
});