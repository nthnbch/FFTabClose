/**
 * FFTabClose - Background Service
 * Main background script handling browser events and alarms
 * 
 * Version 3.1.0
 */

import { logger } from './common/logger.js';
import { tabManagerService } from './services/tabManagerService.js';
import { ALARM_NAMES, CHECK_INTERVALS } from './common/constants.js';
import { DomainRuleManager } from './services/domainRuleService.js';

// State tracking
let isInitialized = false;

/**
 * Initialize the background service
 */
async function initialize() {
  if (isInitialized) {
    return;
  }
  
  logger.info('Initializing FFTabClose background service');
  
  try {
    // Initialize tab manager service
    await tabManagerService.initialize();
    
    // Set up alarms for periodic tab checks and timestamp updates
    await setupAlarms();
    
    // Record timestamps for all current tabs
    await tabManagerService.recordAllCurrentTabs();
    
    isInitialized = true;
    logger.info('FFTabClose background service initialized');
  } catch (error) {
    logger.error('Failed to initialize background service', error);
  }
}

/**
 * Set up alarms for periodic tasks
 */
async function setupAlarms() {
  // Clear any existing alarms
  await browser.alarms.clearAll();
  
  // Set up alarm for checking tabs
  browser.alarms.create(ALARM_NAMES.CHECK_TABS, {
    periodInMinutes: CHECK_INTERVALS.TABS
  });
  
  // Set up alarm for updating timestamps of active tabs
  browser.alarms.create(ALARM_NAMES.UPDATE_TIMESTAMPS, {
    periodInMinutes: CHECK_INTERVALS.TIMESTAMPS
  });
  
  logger.info('Alarms set up', {
    checkTabsInterval: CHECK_INTERVALS.TABS,
    updateTimestampsInterval: CHECK_INTERVALS.TIMESTAMPS
  });
}

/**
 * Process alarms
 * @param {Object} alarm - The alarm that fired
 */
async function handleAlarm(alarm) {
  // Make sure we're initialized
  if (!isInitialized) {
    await initialize();
  }
  
  // Handle different alarm types
  switch (alarm.name) {
    case ALARM_NAMES.CHECK_TABS:
      logger.debug('Tab check alarm triggered');
      await tabManagerService.processTabs(false);
      break;
      
    case ALARM_NAMES.UPDATE_TIMESTAMPS:
      logger.debug('Update timestamps alarm triggered');
      await tabManagerService.updateActiveTabsTimestamps();
      break;
      
    default:
      logger.warn(`Unknown alarm triggered: ${alarm.name}`);
  }
}

/**
 * Handle tab activation
 * @param {Object} activeInfo - Information about the activated tab
 */
async function handleTabActivated(activeInfo) {
  try {
    // Make sure we're initialized
    if (!isInitialized) {
      await initialize();
    }
    
    // Update timestamps for active tabs
    await tabManagerService.updateActiveTabsTimestamps();
    
    logger.verbose(`Tab activated: ${activeInfo.tabId}`);
  } catch (error) {
    logger.error('Error handling tab activation', error);
  }
}

/**
 * Handle tab creation
 * @param {Object} tab - The created tab
 */
async function handleTabCreated(tab) {
  try {
    // Make sure we're initialized
    if (!isInitialized) {
      await initialize();
    }
    
    // Record timestamps for all current tabs
    await tabManagerService.recordAllCurrentTabs();
    
    logger.verbose(`Tab created: ${tab.id} - ${tab.title}`);
  } catch (error) {
    logger.error('Error handling tab creation', error);
  }
}

/**
 * Handle tab removal
 * @param {number} tabId - The ID of the removed tab
 * @param {Object} removeInfo - Information about the removal
 */
async function handleTabRemoved(tabId, removeInfo) {
  try {
    // Make sure we're initialized
    if (!isInitialized) {
      await initialize();
    }
    
    // Clean up tab timestamps
    await tabManagerService.cleanupTabTimestamps();
    
    logger.verbose(`Tab removed: ${tabId}`);
  } catch (error) {
    logger.error('Error handling tab removal', error);
  }
}

// Register event listeners
browser.runtime.onStartup.addListener(initialize);
browser.runtime.onInstalled.addListener(initialize);
browser.alarms.onAlarm.addListener(handleAlarm);
browser.tabs.onActivated.addListener(handleTabActivated);
browser.tabs.onCreated.addListener(handleTabCreated);
browser.tabs.onRemoved.addListener(handleTabRemoved);

// Initialize on load
initialize();

// Handle messages from popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  // Make sure we're initialized
  if (!isInitialized) {
    await initialize();
  }
  
  logger.debug('Message received from popup', message);
  
  if (message.action === 'processTabs') {
    const dryRun = message.dryRun || false;
    const stats = await tabManagerService.processTabs(dryRun);
    return Promise.resolve(stats);
  }
  
  if (message.action === 'getTabStats') {
    const stats = await tabManagerService.getTabStats();
    return Promise.resolve(stats);
  }
  
  if (message.action === 'getSettings') {
    return Promise.resolve(tabManagerService.settings);
  }
  
  if (message.action === 'updateSettings') {
    await tabManagerService.updateSettings(message.settings);
    return Promise.resolve({ success: true });
  }
  
  return Promise.resolve({ success: false, error: 'Unknown action' });
});