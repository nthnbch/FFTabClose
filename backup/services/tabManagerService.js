/**
 * FFTabClose - TabManagerService
 * Handles tab management, tracking, and cleanup operations
 * 
 * Version 3.1.0
 */

import { logger } from '../common/logger.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS, TAB_ACTIONS } from '../common/constants.js';
import { zenService } from './zenService.js';

/**
 * Service for managing tabs and their automatic closure
 */
export class TabManagerService {
  constructor() {
    this.initialized = false;
    this.settings = { ...DEFAULT_SETTINGS };
    this.tabTimestamps = {};
  }

  /**
   * Initialize the service by loading settings and tab timestamps
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    logger.debug('Initializing TabManagerService');
    
    try {
      // Load settings
      const storedSettings = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
      if (storedSettings[STORAGE_KEYS.SETTINGS]) {
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...storedSettings[STORAGE_KEYS.SETTINGS]
        };
      }
      
      // Load tab timestamps
      const storedTimestamps = await browser.storage.local.get(STORAGE_KEYS.TAB_TIMESTAMPS);
      if (storedTimestamps[STORAGE_KEYS.TAB_TIMESTAMPS]) {
        this.tabTimestamps = storedTimestamps[STORAGE_KEYS.TAB_TIMESTAMPS];
      }
      
      this.initialized = true;
      logger.info('TabManagerService initialized', { 
        settings: this.settings,
        tabTimestampsCount: Object.keys(this.tabTimestamps).length
      });
    } catch (error) {
      logger.error('Failed to initialize TabManagerService', error);
      throw error;
    }
  }

  /**
   * Update tab manager settings
   * @param {Object} newSettings - The new settings to apply
   * @returns {Promise<void>}
   */
  async updateSettings(newSettings) {
    logger.debug('Updating TabManagerService settings', newSettings);
    
    this.settings = {
      ...this.settings,
      ...newSettings
    };
    
    await browser.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: this.settings
    });
    
    logger.info('TabManagerService settings updated', this.settings);
  }

  /**
   * Record current timestamp for all tabs
   * @returns {Promise<number>} - Number of new tabs recorded
   */
  async recordAllCurrentTabs() {
    logger.debug('Recording timestamps for all current tabs');
    
    let newTabsCount = 0;
    const now = Date.now();
    
    try {
      const allTabs = await zenService.getAllTabsAcrossWorkspaces();
      
      allTabs.forEach(tab => {
        if (!this.tabTimestamps[tab.id]) {
          this.tabTimestamps[tab.id] = now;
          newTabsCount++;
        }
      });
      
      // Save timestamps to storage
      await browser.storage.local.set({
        [STORAGE_KEYS.TAB_TIMESTAMPS]: this.tabTimestamps
      });
      
      logger.info(`Recorded ${newTabsCount} new tab timestamps`);
      return newTabsCount;
    } catch (error) {
      logger.error('Failed to record tab timestamps', error);
      throw error;
    }
  }
  
  /**
   * Update timestamps for active tabs
   * @returns {Promise<void>}
   */
  async updateActiveTabsTimestamps() {
    const now = Date.now();
    
    try {
      // Get all active tabs across workspaces
      const activeTabs = await zenService.getAllActiveTabsAcrossWorkspaces();
      
      // Update timestamps for active tabs
      activeTabs.forEach(tab => {
        this.tabTimestamps[tab.id] = now;
      });
      
      // Save updated timestamps
      await browser.storage.local.set({
        [STORAGE_KEYS.TAB_TIMESTAMPS]: this.tabTimestamps
      });
      
      logger.debug(`Updated timestamps for ${activeTabs.length} active tabs`);
    } catch (error) {
      logger.error('Failed to update active tabs timestamps', error);
    }
  }

  /**
   * Remove timestamps for tabs that no longer exist
   * @returns {Promise<number>} - Number of timestamps removed
   */
  async cleanupTabTimestamps() {
    logger.debug('Cleaning up tab timestamps');
    
    let removedCount = 0;
    
    try {
      const allTabs = await zenService.getAllTabsAcrossWorkspaces();
      const existingTabIds = new Set(allTabs.map(tab => tab.id));
      
      // Get all tab IDs that have timestamps
      const storedTabIds = Object.keys(this.tabTimestamps).map(Number);
      
      // Find tab IDs that no longer exist
      const removedTabIds = storedTabIds.filter(id => !existingTabIds.has(id));
      
      // Remove timestamps for non-existent tabs
      removedTabIds.forEach(id => {
        delete this.tabTimestamps[id];
        removedCount++;
      });
      
      // Save updated timestamps to storage
      await browser.storage.local.set({
        [STORAGE_KEYS.TAB_TIMESTAMPS]: this.tabTimestamps
      });
      
      logger.info(`Removed ${removedCount} timestamps for non-existent tabs`);
      return removedCount;
    } catch (error) {
      logger.error('Failed to clean up tab timestamps', error);
      throw error;
    }
  }

  /**
   * Determine what action to take for a given tab
   * @param {Object} tab - The tab to evaluate
   * @param {number} tabAge - The age of the tab in milliseconds
   * @returns {string} - The action to take (KEEP, CLOSE, DISCARD)
   */
  async determineTabAction(tab, tabAge) {
    // Always keep active tabs
    if (tab.active) {
      logger.verbose(`Keeping active tab: ${tab.id} - ${tab.title}`);
      return TAB_ACTIONS.KEEP;
    }
    
    // Check if tab is old enough to be considered for closing
    if (tabAge < this.settings.timeLimit) {
      logger.verbose(`Keeping tab not old enough: ${tab.id} - ${tab.title} (age: ${tabAge}ms)`);
      return TAB_ACTIONS.KEEP;
    }
    
    // Handle pinned tabs
    if (tab.pinned) {
      if (this.settings.discardPinnedTabs) {
        logger.verbose(`Will discard pinned tab: ${tab.id} - ${tab.title}`);
        return TAB_ACTIONS.DISCARD;
      } else {
        logger.verbose(`Keeping pinned tab: ${tab.id} - ${tab.title}`);
        return TAB_ACTIONS.KEEP;
      }
    }
    
    // Handle audio tabs
    if (tab.audible && this.settings.excludeAudioTabs) {
      logger.verbose(`Keeping audible tab: ${tab.id} - ${tab.title}`);
      return TAB_ACTIONS.KEEP;
    }
    
    // Handle domain rules (placeholder for future implementation)
    // TODO: Implement domain rules here
    
    // Default action for old tabs
    logger.verbose(`Will close old tab: ${tab.id} - ${tab.title} (age: ${tabAge}ms)`);
    return TAB_ACTIONS.CLOSE;
  }

  /**
   * Process all tabs according to settings
   * @param {boolean} dryRun - If true, don't actually close tabs
   * @returns {Promise<Object>} - Statistics about the processing
   */
  async processTabs(dryRun = false) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    logger.info(`Processing tabs${dryRun ? ' (dry run)' : ''}`);
    
    const stats = {
      totalTabs: 0,
      eligibleTabs: 0,
      closedTabs: 0,
      discardedTabs: 0
    };
    
    const now = Date.now();
    
    try {
      // Get all tabs with workspace info
      const tabs = await zenService.getAllTabsWithWorkspaceInfo();
      stats.totalTabs = tabs.length;
      
      // Process each tab
      for (const tab of tabs) {
        const tabAge = this.tabTimestamps[tab.id] ? now - this.tabTimestamps[tab.id] : 0;
        const action = await this.determineTabAction(tab, tabAge);
        
        // Skip tabs that should be kept
        if (action === TAB_ACTIONS.KEEP) {
          continue;
        }
        
        // Count tabs eligible for action
        stats.eligibleTabs++;
        
        // Skip actual actions in dry run mode
        if (dryRun) {
          if (action === TAB_ACTIONS.CLOSE) {
            logger.info(`[DRY RUN] Would close tab: ${tab.id} - ${tab.title}`);
          } else if (action === TAB_ACTIONS.DISCARD) {
            logger.info(`[DRY RUN] Would discard tab: ${tab.id} - ${tab.title}`);
          }
          continue;
        }
        
        // Perform the appropriate action
        if (action === TAB_ACTIONS.CLOSE) {
          const closed = await this.closeTabSafely(tab.id);
          if (closed) {
            stats.closedTabs++;
            logger.info(`Closed tab: ${tab.id} - ${tab.title}`);
          }
        } else if (action === TAB_ACTIONS.DISCARD) {
          const discarded = await this.discardTabSafely(tab.id);
          if (discarded) {
            stats.discardedTabs++;
            logger.info(`Discarded tab: ${tab.id} - ${tab.title}`);
          }
        }
      }
      
      logger.info('Tab processing complete', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to process tabs', error);
      throw error;
    }
  }

  /**
   * Close a tab safely, handling any errors
   * @param {number} tabId - The ID of the tab to close
   * @returns {Promise<boolean>} - Whether the tab was closed successfully
   */
  async closeTabSafely(tabId) {
    try {
      await browser.tabs.remove(tabId);
      delete this.tabTimestamps[tabId];
      await browser.storage.local.set({
        [STORAGE_KEYS.TAB_TIMESTAMPS]: this.tabTimestamps
      });
      return true;
    } catch (error) {
      logger.error(`Failed to close tab ${tabId}`, error);
      return false;
    }
  }

  /**
   * Discard a tab safely, handling any errors
   * @param {number} tabId - The ID of the tab to discard
   * @returns {Promise<boolean>} - Whether the tab was discarded successfully
   */
  async discardTabSafely(tabId) {
    try {
      await browser.tabs.discard(tabId);
      return true;
    } catch (error) {
      logger.error(`Failed to discard tab ${tabId}`, error);
      return false;
    }
  }

  /**
   * Get statistics about the current tabs
   * @returns {Promise<Object>} - Tab statistics
   */
  async getTabStats() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const stats = {
      totalTabs: 0,
      pinnedTabs: 0,
      audioTabs: 0,
      zenTabs: 0,
      oldTabs: 0,
      oldestTabAge: 0
    };
    
    const now = Date.now();
    
    try {
      const allTabs = await zenService.getAllTabsAcrossWorkspaces();
      stats.totalTabs = allTabs.length;
      
      // Calculate tab statistics
      for (const tab of allTabs) {
        // Count pinned tabs
        if (tab.pinned) {
          stats.pinnedTabs++;
        }
        
        // Count audio tabs
        if (tab.audible) {
          stats.audioTabs++;
        }
        
        // Count Zen tabs
        if (zenService.isTabInZenWorkspace(tab)) {
          stats.zenTabs++;
        }
        
        // Count old tabs and track oldest
        const tabAge = this.tabTimestamps[tab.id] ? now - this.tabTimestamps[tab.id] : 0;
        if (tabAge > this.settings.timeLimit) {
          stats.oldTabs++;
        }
        
        // Track oldest tab age
        if (tabAge > stats.oldestTabAge) {
          stats.oldestTabAge = tabAge;
        }
      }
      
      logger.debug('Tab statistics', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get tab statistics', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tabManagerService = new TabManagerService();

// Also export the class for testing
export default TabManagerService;