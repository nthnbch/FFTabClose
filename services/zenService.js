/**
 * FFTabClose - Zen Browser Service
 * Handles detection and management of Zen Browser workspaces
 * 
 * This service provides functionality to detect and interact with Firefox container tabs,
 * with special handling for Zen Browser workspaces.
 * 
 * Version 3.1.0
 */

import { ZEN_PATTERNS, CONTAINER_TYPES } from '../common/constants.js';
import { logger } from '../common/logger.js';

/**
 * Service for detecting and managing Zen Browser workspaces
 * 
 * This class handles the detection of Firefox containers and Zen workspaces,
 * provides methods to query tabs across all workspaces, and helps manage
 * container-based tab organization.
 */
class ZenService {
  /**
   * Creates a new ZenService instance
   * Sets up initial properties for workspace caching and category for logging
   */
  constructor() {
    this.category = 'ZenService';
    this.workspaceCache = null;
    this.workspaceCacheTime = 0;
    this.cacheDuration = 30000; // 30 seconds cache
  }
  
  /**
   * Determines if a container is a Zen workspace
   * @param {Object} container - Firefox container object
   * @returns {boolean} - true if it's a Zen workspace, false otherwise
   */
  isZenWorkspace(container) {
    if (!container) return false;
    
    // For non-default containers, consider them as Zen workspaces
    if (container.cookieStoreId && 
        container.cookieStoreId !== CONTAINER_TYPES.DEFAULT && 
        container.cookieStoreId !== CONTAINER_TYPES.PRIVATE) {
      logger.debug(this.category, `Container ${container.name} is a Zen workspace (non-default container)`);
      return true;
    }
    
    // Check container name against known patterns
    if (container.name) {
      for (const pattern of ZEN_PATTERNS.NAMES) {
        if (container.name.toLowerCase().includes(pattern.toLowerCase())) {
          logger.debug(this.category, `Container ${container.name} is a Zen workspace (name pattern match: ${pattern})`);
          return true;
        }
      }
    }
    
    // Check container ID against known patterns
    if (container.cookieStoreId) {
      for (const pattern of ZEN_PATTERNS.IDS) {
        if (container.cookieStoreId.includes(pattern)) {
          logger.debug(this.category, `Container ${container.name} is a Zen workspace (ID pattern match: ${pattern})`);
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Determines if a tab is in a Zen workspace
   * @param {Object} tab - Firefox tab object
   * @returns {boolean} - true if the tab is in a Zen workspace, false otherwise
   */
  isTabInZenWorkspace(tab) {
    if (!tab) return false;
    
    // Check if the tab has a cookieStoreId (indicates it's in a container)
    if (tab.cookieStoreId) {
      // If cookieStoreId is not default, consider it a container
      if (tab.cookieStoreId !== CONTAINER_TYPES.DEFAULT && 
          tab.cookieStoreId !== CONTAINER_TYPES.PRIVATE) {
        logger.debug(this.category, `Tab ${tab.id} is in a Zen workspace (non-default container)`);
        return true;
      }
      
      // Check ID against known patterns
      for (const pattern of ZEN_PATTERNS.IDS) {
        if (tab.cookieStoreId.includes(pattern)) {
          logger.debug(this.category, `Tab ${tab.id} is in a Zen workspace (ID pattern match: ${pattern})`);
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * Gets all available workspaces
   * @returns {Promise<Array>} - Promise resolving to an array of workspace objects
   */
  async getAllWorkspaces() {
    // Check cache first
    const now = Date.now();
    if (this.workspaceCache && (now - this.workspaceCacheTime < this.cacheDuration)) {
      logger.debug(this.category, `Using cached workspaces (${this.workspaceCache.length} workspaces)`);
      return this.workspaceCache;
    }
    
    const workspaces = [];
    
    try {
      // First, try using contextualIdentities API to get containers
      if (browser.contextualIdentities) {
        try {
          const containers = await browser.contextualIdentities.query({});
          logger.info(this.category, `Found ${containers.length} containers via contextualIdentities API`);
          
          // Add each container as a workspace
          for (const container of containers) {
            workspaces.push({
              id: container.cookieStoreId,
              name: container.name,
              color: container.color,
              icon: container.icon,
              isZen: this.isZenWorkspace(container),
              type: 'container'
            });
          }
        } catch (error) {
          logger.error(this.category, `Error querying contextualIdentities: ${error.message}`, error);
        }
      }
      
      // Get all tabs to find unique cookieStoreIds
      const allTabs = await browser.tabs.query({});
      const uniqueStoreIds = [...new Set(allTabs.map(tab => tab.cookieStoreId).filter(Boolean))];
      
      logger.debug(this.category, `Found ${uniqueStoreIds.length} unique cookieStoreIds via tabs`);
      
      // Add cookieStoreIds that don't exist in detected containers
      for (const storeId of uniqueStoreIds) {
        if (!workspaces.some(w => w.id === storeId)) {
          // It might be an undetected Zen workspace
          const isZen = ZEN_PATTERNS.IDS.some(pattern => storeId.includes(pattern));
          const name = isZen ? `Zen Space (${storeId})` : `Container (${storeId})`;
          
          workspaces.push({
            id: storeId,
            name: name,
            isZen: isZen,
            type: 'unknown'
          });
          
          logger.debug(this.category, `Added unidentified workspace: ${name} (${storeId})`);
        }
      }
      
      // Add default space if not already included
      if (!workspaces.some(w => w.id === CONTAINER_TYPES.DEFAULT)) {
        workspaces.push({
          id: CONTAINER_TYPES.DEFAULT,
          name: 'Default',
          isZen: false,
          type: 'default'
        });
      }
      
      // Update cache
      this.workspaceCache = workspaces;
      this.workspaceCacheTime = now;
      
      logger.info(this.category, `Total workspaces found: ${workspaces.length}`);
      return workspaces;
    } catch (error) {
      logger.error(this.category, `Error getting all workspaces: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Gets all tabs across all workspaces
   * @returns {Promise<Array>} - Promise resolving to an array of tab objects
   */
  async getAllTabsAcrossWorkspaces() {
    let allTabs = [];
    
    try {
      // Method 1: Global query - should get ALL tabs
      allTabs = await browser.tabs.query({});
      logger.debug(this.category, `Found ${allTabs.length} tabs with global query`);
      
      // Method 2: Query by window
      const allWindows = await browser.windows.getAll();
      logger.debug(this.category, `Found ${allWindows.length} windows`);
      
      for (const window of allWindows) {
        try {
          const windowTabs = await browser.tabs.query({ windowId: window.id });
          
          // Add only tabs that aren't already in allTabs
          const newTabs = windowTabs.filter(wTab => 
            !allTabs.some(existingTab => existingTab.id === wTab.id)
          );
          
          if (newTabs.length > 0) {
            logger.debug(this.category, `Adding ${newTabs.length} new tabs from window ${window.id}`);
            allTabs = allTabs.concat(newTabs);
          }
        } catch (error) {
          logger.error(this.category, `Error getting tabs for window ${window.id}: ${error.message}`, error);
        }
      }
      
      // Method 3: Query by container
      if (browser.contextualIdentities) {
        try {
          const containers = await browser.contextualIdentities.query({});
          logger.debug(this.category, `Found ${containers.length} containers`);
          
          for (const container of containers) {
            try {
              const containerTabs = await browser.tabs.query({ 
                cookieStoreId: container.cookieStoreId 
              });
              
              // Add only tabs that aren't already in allTabs
              const newTabs = containerTabs.filter(cTab => 
                !allTabs.some(existingTab => existingTab.id === cTab.id)
              );
              
              if (newTabs.length > 0) {
                logger.debug(this.category, `Adding ${newTabs.length} new tabs from container ${container.name}`);
                allTabs = allTabs.concat(newTabs);
              }
            } catch (error) {
              logger.error(this.category, `Error getting tabs for container ${container.name}: ${error.message}`, error);
            }
          }
        } catch (error) {
          logger.warn(this.category, `Error querying contextualIdentities: ${error.message}`, error);
        }
      }
      
      // Deduplicate tabs
      const uniqueTabIds = new Set();
      const uniqueTabs = [];
      
      for (const tab of allTabs) {
        if (!uniqueTabIds.has(tab.id)) {
          uniqueTabIds.add(tab.id);
          uniqueTabs.push(tab);
        }
      }
      
      logger.info(this.category, `Total unique tabs found across all workspaces: ${uniqueTabs.length}`);
      return uniqueTabs;
    } catch (error) {
      logger.error(this.category, `Error getting all tabs across workspaces: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Gets all tabs with their workspace information
   * 
   * Enhances tab objects with additional workspace metadata, including whether
   * they're part of a Zen workspace. Handles edge cases like unknown containers.
   * 
   * @returns {Promise<Array>} - Promise resolving to an array of tabs with workspace info
   */
  async getAllTabsWithWorkspaceInfo() {
    try {
      const allTabs = await this.getAllTabsAcrossWorkspaces();
      const workspaces = await this.getAllWorkspaces();
      
      // Enhance tabs with workspace info
      const enhancedTabs = allTabs.map(tab => {
        const workspace = tab.cookieStoreId ? 
          workspaces.find(ws => ws.id === tab.cookieStoreId) : 
          workspaces.find(ws => ws.id === CONTAINER_TYPES.DEFAULT);
        
        return {
          ...tab,
          isInZenWorkspace: this.isTabInZenWorkspace(tab),
          workspaceInfo: workspace || { 
            id: tab.cookieStoreId || 'unknown', 
            name: `Unknown (${tab.cookieStoreId || 'default'})`, 
            isZen: false, 
            type: 'unknown' 
          }
        };
      });
      
      logger.info(this.category, `Enhanced ${enhancedTabs.length} tabs with workspace info`);
      return enhancedTabs;
    } catch (error) {
      logger.error(this.category, `Error getting tabs with workspace info: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Gets active tabs from all workspaces
   * @returns {Promise<Array>} - Promise resolving to an array of active tab objects
   */
  async getAllActiveTabsAcrossWorkspaces() {
    try {
      const allTabs = await this.getAllTabsAcrossWorkspaces();
      const activeTabs = allTabs.filter(tab => tab.active);
      
      logger.info(this.category, `Found ${activeTabs.length} active tabs across all workspaces`);
      return activeTabs;
    } catch (error) {
      logger.error(this.category, `Error getting active tabs: ${error.message}`, error);
      return [];
    }
  }
  
  /**
   * Gets all tabs in a specific workspace
   * @param {string} workspaceId - The workspace/container ID
   * @returns {Promise<Array>} - Promise resolving to an array of tab objects
   */
  async getTabsInWorkspace(workspaceId) {
    if (!workspaceId) {
      logger.error(this.category, 'No workspace ID provided');
      return [];
    }
    
    try {
      const tabs = await browser.tabs.query({ cookieStoreId: workspaceId });
      logger.info(this.category, `Found ${tabs.length} tabs in workspace ${workspaceId}`);
      return tabs;
    } catch (error) {
      logger.error(this.category, `Error getting tabs for workspace ${workspaceId}: ${error.message}`, error);
      return [];
    }
  }
}

// Export the singleton instance for use throughout the extension
export const zenService = new ZenService();

// Export the class for testing
export default ZenService;