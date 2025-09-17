/**
 * FFTabClose - TabManagerService Tests
 * Unit tests for the tab management service
 */

import TabManagerService from '../../services/tabManagerService.js';
import { zenService } from '../../services/zenService.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS, TAB_ACTIONS } from '../../common/constants.js';

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

// Mock zenService
jest.mock('../../services/zenService.js', () => ({
  zenService: {
    getAllTabsAcrossWorkspaces: jest.fn(),
    getAllTabsWithWorkspaceInfo: jest.fn(),
    isTabInZenWorkspace: jest.fn()
  }
}));

describe('TabManagerService', () => {
  let tabManagerService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh instance for each test
    tabManagerService = new TabManagerService();
    
    // Mock browser API calls
    browser.storage.local.get.mockResolvedValue({});
    browser.storage.local.set.mockResolvedValue({});
    browser.tabs.remove.mockResolvedValue();
    browser.tabs.discard.mockResolvedValue();
    
    // Mock zenService methods
    zenService.getAllTabsAcrossWorkspaces.mockResolvedValue([]);
    zenService.getAllTabsWithWorkspaceInfo.mockResolvedValue([]);
    zenService.isTabInZenWorkspace.mockReturnValue(false);
  });
  
  describe('initialize', () => {
    test('should load settings from storage', async () => {
      const mockSettings = {
        [STORAGE_KEYS.SETTINGS]: {
          timeLimit: 3600000, // 1 hour
          discardPinnedTabs: false,
          excludeAudioTabs: false
        }
      };
      
      browser.storage.local.get.mockResolvedValueOnce(mockSettings);
      
      await tabManagerService.initialize();
      
      expect(tabManagerService.settings).toEqual({
        ...DEFAULT_SETTINGS,
        ...mockSettings[STORAGE_KEYS.SETTINGS]
      });
      expect(tabManagerService.initialized).toBe(true);
    });
    
    test('should load tab timestamps from storage', async () => {
      const mockTimestamps = {
        [STORAGE_KEYS.TAB_TIMESTAMPS]: {
          1: 1623456789000,
          2: 1623456789100
        }
      };
      
      browser.storage.local.get
        .mockResolvedValueOnce({}) // For settings
        .mockResolvedValueOnce(mockTimestamps); // For timestamps
      
      await tabManagerService.initialize();
      
      expect(tabManagerService.tabTimestamps).toEqual(mockTimestamps[STORAGE_KEYS.TAB_TIMESTAMPS]);
    });
  });
  
  describe('updateSettings', () => {
    test('should update settings and save to storage', async () => {
      const newSettings = {
        timeLimit: 3600000, // 1 hour
        discardPinnedTabs: false
      };
      
      await tabManagerService.updateSettings(newSettings);
      
      expect(tabManagerService.settings.timeLimit).toBe(newSettings.timeLimit);
      expect(tabManagerService.settings.discardPinnedTabs).toBe(newSettings.discardPinnedTabs);
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.SETTINGS]: expect.objectContaining(newSettings)
      });
    });
  });
  
  describe('recordAllCurrentTabs', () => {
    test('should record timestamps for all tabs', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1' },
        { id: 2, title: 'Tab 2' }
      ];
      
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      
      await tabManagerService.recordAllCurrentTabs();
      
      expect(tabManagerService.tabTimestamps[1]).toBeDefined();
      expect(tabManagerService.tabTimestamps[2]).toBeDefined();
      expect(browser.storage.local.set).toHaveBeenCalled();
    });
    
    test('should not overwrite existing timestamps', async () => {
      const mockTabs = [
        { id: 1, title: 'Tab 1' },
        { id: 2, title: 'Tab 2' }
      ];
      
      const oldTimestamp = 1623456789000;
      tabManagerService.tabTimestamps[1] = oldTimestamp;
      
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      
      await tabManagerService.recordAllCurrentTabs();
      
      expect(tabManagerService.tabTimestamps[1]).toBe(oldTimestamp);
      expect(tabManagerService.tabTimestamps[2]).toBeDefined();
    });
  });
  
  describe('cleanupTabTimestamps', () => {
    test('should remove timestamps for non-existent tabs', async () => {
      // Set up timestamps for tabs 1, 2, and 3
      tabManagerService.tabTimestamps = {
        1: 1623456789000,
        2: 1623456789100,
        3: 1623456789200
      };
      
      // Only tabs 1 and 2 still exist
      const mockTabs = [
        { id: 1, title: 'Tab 1' },
        { id: 2, title: 'Tab 2' }
      ];
      
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      
      const removed = await tabManagerService.cleanupTabTimestamps();
      
      expect(removed).toBe(1); // One timestamp removed
      expect(tabManagerService.tabTimestamps[1]).toBeDefined();
      expect(tabManagerService.tabTimestamps[2]).toBeDefined();
      expect(tabManagerService.tabTimestamps[3]).toBeUndefined();
      expect(browser.storage.local.set).toHaveBeenCalled();
    });
  });
  
  describe('determineTabAction', () => {
    test('should keep active tabs', async () => {
      const tab = {
        id: 1,
        active: true,
        title: 'Active Tab'
      };
      
      const action = await tabManagerService.determineTabAction(tab, 100000);
      expect(action).toBe(TAB_ACTIONS.KEEP);
    });
    
    test('should keep tabs that are not old enough', async () => {
      const tab = {
        id: 1,
        active: false,
        title: 'Recent Tab'
      };
      
      tabManagerService.settings.timeLimit = 100000;
      
      const action = await tabManagerService.determineTabAction(tab, 50000); // Half the time limit
      expect(action).toBe(TAB_ACTIONS.KEEP);
    });
    
    test('should close old tabs', async () => {
      const tab = {
        id: 1,
        active: false,
        title: 'Old Tab'
      };
      
      tabManagerService.settings.timeLimit = 100000;
      
      const action = await tabManagerService.determineTabAction(tab, 200000); // Twice the time limit
      expect(action).toBe(TAB_ACTIONS.CLOSE);
    });
    
    test('should discard pinned tabs if setting is enabled', async () => {
      const tab = {
        id: 1,
        active: false,
        pinned: true,
        title: 'Pinned Tab'
      };
      
      tabManagerService.settings.discardPinnedTabs = true;
      
      const action = await tabManagerService.determineTabAction(tab, 200000);
      expect(action).toBe(TAB_ACTIONS.DISCARD);
    });
    
    test('should keep pinned tabs if setting is disabled', async () => {
      const tab = {
        id: 1,
        active: false,
        pinned: true,
        title: 'Pinned Tab'
      };
      
      tabManagerService.settings.discardPinnedTabs = false;
      
      const action = await tabManagerService.determineTabAction(tab, 200000);
      expect(action).toBe(TAB_ACTIONS.KEEP);
    });
    
    test('should keep audio tabs if setting is enabled', async () => {
      const tab = {
        id: 1,
        active: false,
        audible: true,
        title: 'Audio Tab'
      };
      
      tabManagerService.settings.excludeAudioTabs = true;
      
      const action = await tabManagerService.determineTabAction(tab, 200000);
      expect(action).toBe(TAB_ACTIONS.KEEP);
    });
    
    test('should close audio tabs if setting is disabled', async () => {
      const tab = {
        id: 1,
        active: false,
        audible: true,
        title: 'Audio Tab'
      };
      
      tabManagerService.settings.excludeAudioTabs = false;
      tabManagerService.settings.timeLimit = 100000;
      
      const action = await tabManagerService.determineTabAction(tab, 200000);
      expect(action).toBe(TAB_ACTIONS.CLOSE);
    });
  });
  
  describe('processTabs', () => {
    test('should process tabs and return statistics', async () => {
      // Mock tabs with different states
      const mockTabs = [
        { id: 1, active: true, title: 'Active Tab' },
        { id: 2, active: false, title: 'Old Tab' },
        { id: 3, active: false, pinned: true, title: 'Pinned Tab' },
        { id: 4, active: false, audible: true, title: 'Audio Tab' }
      ];
      
      // Set up timestamps (all tabs are old)
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      
      tabManagerService.tabTimestamps = {
        1: oneHourAgo,
        2: oneHourAgo,
        3: oneHourAgo,
        4: oneHourAgo
      };
      
      // Set up settings
      tabManagerService.settings = {
        ...DEFAULT_SETTINGS,
        timeLimit: 1800000, // 30 minutes
        discardPinnedTabs: true,
        excludeAudioTabs: true
      };
      
      // Mock tab queries
      zenService.getAllTabsWithWorkspaceInfo.mockResolvedValue(mockTabs);
      
      // Mock the determineTabAction method
      jest.spyOn(tabManagerService, 'determineTabAction').mockImplementation((tab) => {
        if (tab.active) return TAB_ACTIONS.KEEP;
        if (tab.audible && tabManagerService.settings.excludeAudioTabs) return TAB_ACTIONS.KEEP;
        if (tab.pinned) return TAB_ACTIONS.DISCARD;
        return TAB_ACTIONS.CLOSE;
      });
      
      // Mock close and discard methods
      jest.spyOn(tabManagerService, 'closeTabSafely').mockResolvedValue(true);
      jest.spyOn(tabManagerService, 'discardTabSafely').mockResolvedValue(true);
      
      // Process tabs
      const stats = await tabManagerService.processTabs();
      
      // Check statistics
      expect(stats.totalTabs).toBe(4);
      expect(stats.eligibleTabs).toBe(2); // Old and pinned tabs
      expect(stats.closedTabs).toBe(1); // Old tab
      expect(stats.discardedTabs).toBe(1); // Pinned tab
      
      // Check that the right tabs were closed/discarded
      expect(tabManagerService.closeTabSafely).toHaveBeenCalledWith(2);
      expect(tabManagerService.discardTabSafely).toHaveBeenCalledWith(3);
    });
    
    test('should not close tabs in dry run mode', async () => {
      // Mock an old tab
      const mockTabs = [
        { id: 1, active: false, title: 'Old Tab' }
      ];
      
      // Set up timestamp
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      tabManagerService.tabTimestamps = { 1: oneHourAgo };
      
      // Set up settings
      tabManagerService.settings = {
        ...DEFAULT_SETTINGS,
        timeLimit: 1800000 // 30 minutes
      };
      
      // Mock tab queries
      zenService.getAllTabsWithWorkspaceInfo.mockResolvedValue(mockTabs);
      
      // Mock the determineTabAction method
      jest.spyOn(tabManagerService, 'determineTabAction').mockResolvedValue(TAB_ACTIONS.CLOSE);
      
      // Mock close method
      jest.spyOn(tabManagerService, 'closeTabSafely');
      
      // Process tabs in dry run mode
      const stats = await tabManagerService.processTabs(true);
      
      // Check statistics
      expect(stats.totalTabs).toBe(1);
      expect(stats.eligibleTabs).toBe(1);
      expect(stats.closedTabs).toBe(0); // No tabs actually closed
      
      // Check that close was not called
      expect(tabManagerService.closeTabSafely).not.toHaveBeenCalled();
    });
  });
  
  describe('closeTabSafely', () => {
    test('should close tab and remove timestamp', async () => {
      const tabId = 123;
      tabManagerService.tabTimestamps[tabId] = Date.now();
      
      const success = await tabManagerService.closeTabSafely(tabId);
      
      expect(success).toBe(true);
      expect(browser.tabs.remove).toHaveBeenCalledWith(tabId);
      expect(tabManagerService.tabTimestamps[tabId]).toBeUndefined();
    });
    
    test('should handle errors gracefully', async () => {
      const tabId = 123;
      browser.tabs.remove.mockRejectedValue(new Error('Tab not found'));
      
      const success = await tabManagerService.closeTabSafely(tabId);
      
      expect(success).toBe(false);
    });
  });
  
  describe('discardTabSafely', () => {
    test('should discard tab', async () => {
      const tabId = 123;
      
      const success = await tabManagerService.discardTabSafely(tabId);
      
      expect(success).toBe(true);
      expect(browser.tabs.discard).toHaveBeenCalledWith(tabId);
    });
    
    test('should handle errors gracefully', async () => {
      const tabId = 123;
      browser.tabs.discard.mockRejectedValue(new Error('Tab not found'));
      
      const success = await tabManagerService.discardTabSafely(tabId);
      
      expect(success).toBe(false);
    });
  });
  
  describe('getTabStats', () => {
    test('should return tab statistics', async () => {
      // Mock tabs with different states
      const mockTabs = [
        { id: 1, active: true, title: 'Active Tab' },
        { id: 2, active: false, pinned: true, title: 'Pinned Tab' },
        { id: 3, active: false, audible: true, title: 'Audio Tab' }
      ];
      
      // Set up timestamps
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;
      
      tabManagerService.tabTimestamps = {
        1: oneHourAgo,
        2: twoHoursAgo,
        3: now - 300000 // 5 minutes ago
      };
      
      // Set up settings
      tabManagerService.settings = {
        ...DEFAULT_SETTINGS,
        timeLimit: 1800000 // 30 minutes
      };
      
      // Mock tab queries
      zenService.getAllTabsAcrossWorkspaces.mockResolvedValue(mockTabs);
      zenService.isTabInZenWorkspace.mockReturnValueOnce(false)
                                   .mockReturnValueOnce(true)
                                   .mockReturnValueOnce(false);
      
      // Get statistics
      const stats = await tabManagerService.getTabStats();
      
      // Check statistics
      expect(stats.totalTabs).toBe(3);
      expect(stats.pinnedTabs).toBe(1);
      expect(stats.audioTabs).toBe(1);
      expect(stats.zenTabs).toBe(1);
      expect(stats.oldTabs).toBe(2); // Tabs older than 30 minutes
      expect(stats.oldestTabAge).toBeGreaterThan(0);
    });
  });
});