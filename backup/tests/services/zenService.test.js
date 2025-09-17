/**
 * FFTabClose - ZenService Tests
 * Unit tests for the Zen Browser workspace detection service
 */

import ZenService from '../../services/zenService.js';
import { ZEN_PATTERNS, CONTAINER_TYPES } from '../../common/constants.js';

// Mock the logger to avoid console output during tests
jest.mock('../../common/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn()
  }
}));

describe('ZenService', () => {
  let zenService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh instance for each test
    zenService = new ZenService();
    
    // Mock browser API calls
    browser.contextualIdentities.query.mockResolvedValue([]);
    browser.tabs.query.mockResolvedValue([]);
    browser.windows.getAll.mockResolvedValue([]);
  });
  
  describe('isZenWorkspace', () => {
    test('should return false for null container', () => {
      expect(zenService.isZenWorkspace(null)).toBe(false);
    });
    
    test('should return true for non-default container', () => {
      const container = {
        cookieStoreId: 'firefox-container-1',
        name: 'Test Container'
      };
      expect(zenService.isZenWorkspace(container)).toBe(true);
    });
    
    test('should return false for default container', () => {
      const container = {
        cookieStoreId: CONTAINER_TYPES.DEFAULT,
        name: 'Default'
      };
      expect(zenService.isZenWorkspace(container)).toBe(false);
    });
    
    test('should return true for containers with Zen name patterns', () => {
      for (const pattern of ZEN_PATTERNS.NAMES) {
        const container = {
          cookieStoreId: 'firefox-container-1',
          name: `Test ${pattern} Container`
        };
        expect(zenService.isZenWorkspace(container)).toBe(true);
      }
    });
    
    test('should return true for containers with Zen ID patterns', () => {
      for (const pattern of ZEN_PATTERNS.IDS) {
        const container = {
          cookieStoreId: `test-${pattern}-container`,
          name: 'Test Container'
        };
        expect(zenService.isZenWorkspace(container)).toBe(true);
      }
    });
  });
  
  describe('isTabInZenWorkspace', () => {
    test('should return false for null tab', () => {
      expect(zenService.isTabInZenWorkspace(null)).toBe(false);
    });
    
    test('should return false for tab without cookieStoreId', () => {
      const tab = {
        id: 1,
        title: 'Test Tab'
      };
      expect(zenService.isTabInZenWorkspace(tab)).toBe(false);
    });
    
    test('should return true for tab in non-default container', () => {
      const tab = {
        id: 1,
        cookieStoreId: 'firefox-container-1',
        title: 'Test Tab'
      };
      expect(zenService.isTabInZenWorkspace(tab)).toBe(true);
    });
    
    test('should return false for tab in default container', () => {
      const tab = {
        id: 1,
        cookieStoreId: CONTAINER_TYPES.DEFAULT,
        title: 'Test Tab'
      };
      expect(zenService.isTabInZenWorkspace(tab)).toBe(false);
    });
    
    test('should return true for tab with Zen ID patterns', () => {
      for (const pattern of ZEN_PATTERNS.IDS) {
        const tab = {
          id: 1,
          cookieStoreId: `test-${pattern}-container`,
          title: 'Test Tab'
        };
        expect(zenService.isTabInZenWorkspace(tab)).toBe(true);
      }
    });
  });
  
  describe('getAllWorkspaces', () => {
    test('should return empty array when no workspaces found', async () => {
      const workspaces = await zenService.getAllWorkspaces();
      expect(workspaces).toEqual([{ id: CONTAINER_TYPES.DEFAULT, name: 'Default', isZen: false, type: 'default' }]);
    });
    
    test('should return containers as workspaces', async () => {
      const mockContainers = [
        { cookieStoreId: 'firefox-container-1', name: 'Work', color: 'blue', icon: 'briefcase' },
        { cookieStoreId: 'firefox-container-2', name: 'Personal', color: 'green', icon: 'circle' }
      ];
      
      browser.contextualIdentities.query.mockResolvedValue(mockContainers);
      
      const workspaces = await zenService.getAllWorkspaces();
      
      expect(workspaces).toHaveLength(3); // 2 containers + default
      expect(workspaces[0].id).toBe('firefox-container-1');
      expect(workspaces[1].id).toBe('firefox-container-2');
      expect(workspaces[2].id).toBe(CONTAINER_TYPES.DEFAULT);
    });
    
    test('should detect workspaces from tabs', async () => {
      const mockTabs = [
        { id: 1, cookieStoreId: 'firefox-container-1', title: 'Tab 1' },
        { id: 2, cookieStoreId: 'zen-workspace-1', title: 'Tab 2' },
        { id: 3, cookieStoreId: CONTAINER_TYPES.DEFAULT, title: 'Tab 3' }
      ];
      
      browser.tabs.query.mockResolvedValue(mockTabs);
      
      const workspaces = await zenService.getAllWorkspaces();
      
      expect(workspaces).toHaveLength(3); // 2 unique containers + default
      expect(workspaces.some(w => w.id === 'firefox-container-1')).toBe(true);
      expect(workspaces.some(w => w.id === 'zen-workspace-1')).toBe(true);
      expect(workspaces.some(w => w.id === CONTAINER_TYPES.DEFAULT)).toBe(true);
    });
  });
  
  describe('getAllTabsAcrossWorkspaces', () => {
    test('should return empty array when no tabs found', async () => {
      const tabs = await zenService.getAllTabsAcrossWorkspaces();
      expect(tabs).toEqual([]);
    });
    
    test('should return all tabs from global query', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1' },
        { id: 2, title: 'Tab 2' }
      ];
      
      browser.tabs.query.mockResolvedValue(mockTabs);
      
      const tabs = await zenService.getAllTabsAcrossWorkspaces();
      
      expect(tabs).toHaveLength(2);
      expect(tabs).toEqual(mockTabs);
    });
    
    test('should deduplicate tabs from multiple sources', async () => {
      const globalTabs = [
        { id: 1, title: 'Tab 1' },
        { id: 2, title: 'Tab 2' }
      ];
      
      const windowTabs = [
        { id: 2, title: 'Tab 2' }, // Duplicate
        { id: 3, title: 'Tab 3' }  // New tab
      ];
      
      const containerTabs = [
        { id: 3, title: 'Tab 3' }, // Duplicate
        { id: 4, title: 'Tab 4' }  // New tab
      ];
      
      // First call is for global query, second is for window query
      browser.tabs.query
        .mockResolvedValueOnce(globalTabs)
        .mockResolvedValueOnce(windowTabs)
        .mockResolvedValueOnce(containerTabs);
      
      browser.windows.getAll.mockResolvedValue([{ id: 1 }]);
      
      browser.contextualIdentities.query.mockResolvedValue([{ cookieStoreId: 'firefox-container-1', name: 'Container' }]);
      
      const tabs = await zenService.getAllTabsAcrossWorkspaces();
      
      expect(tabs).toHaveLength(4); // 4 unique tabs
      expect(tabs.map(t => t.id).sort()).toEqual([1, 2, 3, 4]);
    });
  });
  
  describe('getAllTabsWithWorkspaceInfo', () => {
    test('should enhance tabs with workspace info', async () => {
      const mockTabs = [
        { id: 1, cookieStoreId: 'firefox-container-1', title: 'Tab 1' },
        { id: 2, cookieStoreId: CONTAINER_TYPES.DEFAULT, title: 'Tab 2' }
      ];
      
      const mockWorkspaces = [
        { id: 'firefox-container-1', name: 'Work', isZen: true, type: 'container' },
        { id: CONTAINER_TYPES.DEFAULT, name: 'Default', isZen: false, type: 'default' }
      ];
      
      // Mock the methods used by getAllTabsWithWorkspaceInfo
      jest.spyOn(zenService, 'getAllTabsAcrossWorkspaces').mockResolvedValue(mockTabs);
      jest.spyOn(zenService, 'getAllWorkspaces').mockResolvedValue(mockWorkspaces);
      jest.spyOn(zenService, 'isTabInZenWorkspace').mockImplementation(tab => 
        tab.cookieStoreId === 'firefox-container-1'
      );
      
      const enhancedTabs = await zenService.getAllTabsWithWorkspaceInfo();
      
      expect(enhancedTabs).toHaveLength(2);
      
      // Check first tab (in Zen workspace)
      expect(enhancedTabs[0].isInZenWorkspace).toBe(true);
      expect(enhancedTabs[0].workspaceInfo).toEqual(mockWorkspaces[0]);
      
      // Check second tab (in default workspace)
      expect(enhancedTabs[1].isInZenWorkspace).toBe(false);
      expect(enhancedTabs[1].workspaceInfo).toEqual(mockWorkspaces[1]);
    });
  });
  
  describe('getTabsInWorkspace', () => {
    test('should return empty array when no workspaceId provided', async () => {
      const tabs = await zenService.getTabsInWorkspace();
      expect(tabs).toEqual([]);
      expect(browser.tabs.query).not.toHaveBeenCalled();
    });
    
    test('should query tabs for specific workspace', async () => {
      const mockTabs = [
        { id: 1, cookieStoreId: 'firefox-container-1', title: 'Tab 1' },
        { id: 2, cookieStoreId: 'firefox-container-1', title: 'Tab 2' }
      ];
      
      browser.tabs.query.mockResolvedValue(mockTabs);
      
      const tabs = await zenService.getTabsInWorkspace('firefox-container-1');
      
      expect(browser.tabs.query).toHaveBeenCalledWith({ cookieStoreId: 'firefox-container-1' });
      expect(tabs).toEqual(mockTabs);
    });
    
    test('should handle errors when querying tabs', async () => {
      browser.tabs.query.mockRejectedValue(new Error('API error'));
      
      const tabs = await zenService.getTabsInWorkspace('firefox-container-1');
      
      expect(tabs).toEqual([]);
    });
  });
});