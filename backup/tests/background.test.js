/**
 * FFTabClose - Background Service Tests
 * Unit tests for the background service
 */

import { DEFAULT_SETTINGS, ALARM_NAMES, CHECK_INTERVALS } from '../../common/constants.js';
import { tabManagerService } from '../../services/tabManagerService.js';

// Mock the logger
jest.mock('../../common/logger.js', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    verbose: jest.fn()
  }
}));

// Mock the tab manager service
jest.mock('../../services/tabManagerService.js', () => ({
  tabManagerService: {
    initialize: jest.fn().mockResolvedValue(),
    updateActiveTabsTimestamps: jest.fn().mockResolvedValue(),
    processTabs: jest.fn().mockResolvedValue({
      closedTabs: 2,
      discardedTabs: 1
    }),
    recordAllCurrentTabs: jest.fn().mockResolvedValue(5)
  }
}));

// Import the background module - need to mock browser events first
let onStartupCallback;
let onAlarmCallback;
let onTabActivatedCallback;
let onTabRemovedCallback;
let onTabCreatedCallback;

// Mock the browser.runtime.onStartup.addListener
global.browser.runtime.onStartup = {
  addListener: jest.fn(callback => {
    onStartupCallback = callback;
  })
};

// Mock the browser.alarms.onAlarm.addListener
global.browser.alarms.onAlarm = {
  addListener: jest.fn(callback => {
    onAlarmCallback = callback;
  })
};

// Mock the browser.tabs.onActivated.addListener
global.browser.tabs.onActivated = {
  addListener: jest.fn(callback => {
    onTabActivatedCallback = callback;
  })
};

// Mock the browser.tabs.onRemoved.addListener
global.browser.tabs.onRemoved = {
  addListener: jest.fn(callback => {
    onTabRemovedCallback = callback;
  })
};

// Mock the browser.tabs.onCreated.addListener
global.browser.tabs.onCreated = {
  addListener: jest.fn(callback => {
    onTabCreatedCallback = callback;
  })
};

// Now we can import the background script
import '../../background.js';

describe('Background Service', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Clear alarm mock calls
    browser.alarms.create.mockClear();
    browser.alarms.clearAll.mockClear();
  });
  
  describe('Initialization', () => {
    test('should initialize tab manager and set up alarms on startup', async () => {
      // Trigger the onStartup event
      await onStartupCallback();
      
      // Check that tab manager was initialized
      expect(tabManagerService.initialize).toHaveBeenCalled();
      
      // Check that alarms were created
      expect(browser.alarms.create).toHaveBeenCalledWith(
        ALARM_NAMES.CHECK_TABS,
        { periodInMinutes: CHECK_INTERVALS.TABS }
      );
      
      expect(browser.alarms.create).toHaveBeenCalledWith(
        ALARM_NAMES.UPDATE_TIMESTAMPS,
        { periodInMinutes: CHECK_INTERVALS.TIMESTAMPS }
      );
      
      // Check that initial timestamp recording happened
      expect(tabManagerService.recordAllCurrentTabs).toHaveBeenCalled();
    });
  });
  
  describe('Alarm handling', () => {
    test('should process tabs when check tabs alarm fires', async () => {
      // Trigger check tabs alarm
      await onAlarmCallback({ name: ALARM_NAMES.CHECK_TABS });
      
      // Check that tabs were processed
      expect(tabManagerService.processTabs).toHaveBeenCalledWith(false);
    });
    
    test('should update timestamps when update timestamps alarm fires', async () => {
      // Trigger update timestamps alarm
      await onAlarmCallback({ name: ALARM_NAMES.UPDATE_TIMESTAMPS });
      
      // Check that timestamps were updated
      expect(tabManagerService.updateActiveTabsTimestamps).toHaveBeenCalled();
    });
    
    test('should not process tabs for unknown alarms', async () => {
      // Trigger unknown alarm
      await onAlarmCallback({ name: 'unknown-alarm' });
      
      // Check that tabs were not processed
      expect(tabManagerService.processTabs).not.toHaveBeenCalled();
      expect(tabManagerService.updateActiveTabsTimestamps).not.toHaveBeenCalled();
    });
  });
  
  describe('Tab event handling', () => {
    test('should update timestamp when tab is activated', async () => {
      // Mock tab data
      const mockTab = { id: 123, title: 'Test Tab' };
      browser.tabs.get.mockResolvedValue(mockTab);
      
      // Trigger tab activated event
      await onTabActivatedCallback({ tabId: mockTab.id });
      
      // Check that tab timestamp is updated
      expect(tabManagerService.updateActiveTabsTimestamps).toHaveBeenCalled();
    });
    
    test('should record timestamp when tab is created', async () => {
      // Mock tab data
      const mockTab = { id: 123, title: 'Test Tab' };
      
      // Trigger tab created event
      await onTabCreatedCallback(mockTab);
      
      // Check that tab timestamp is recorded
      expect(tabManagerService.recordAllCurrentTabs).toHaveBeenCalled();
    });
  });
});