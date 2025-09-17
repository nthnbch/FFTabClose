/**
 * FFTabClose - Domain Rule Service
 * Manages rules for handling tabs based on domain patterns
 * 
 * Version 3.1.0
 */

import { logger } from '../common/logger.js';
import { STORAGE_KEYS, DOMAIN_RULE_ACTIONS } from '../common/constants.js';

/**
 * Service for managing domain-specific rules
 */
export class DomainRuleService {
  constructor() {
    this.initialized = false;
    this.rules = [];
  }
  
  /**
   * Initialize the service by loading rules from storage
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    logger.debug('Initializing DomainRuleService');
    
    try {
      // Load domain rules
      const storedRules = await browser.storage.local.get(STORAGE_KEYS.DOMAIN_RULES);
      if (storedRules[STORAGE_KEYS.DOMAIN_RULES]) {
        this.rules = storedRules[STORAGE_KEYS.DOMAIN_RULES];
      }
      
      this.initialized = true;
      logger.info('DomainRuleService initialized', { rulesCount: this.rules.length });
    } catch (error) {
      logger.error('Failed to initialize DomainRuleService', error);
      throw error;
    }
  }
  
  /**
   * Add a new domain rule
   * @param {Object} rule - The rule to add
   * @returns {Promise<void>}
   */
  async addRule(rule) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Validate rule structure
    if (!rule.pattern || !rule.action) {
      throw new Error('Invalid rule: pattern and action are required');
    }
    
    // Add rule to list
    this.rules.push(rule);
    
    // Save rules to storage
    await browser.storage.local.set({
      [STORAGE_KEYS.DOMAIN_RULES]: this.rules
    });
    
    logger.info('Added domain rule', rule);
  }
  
  /**
   * Remove a domain rule
   * @param {number} index - The index of the rule to remove
   * @returns {Promise<void>}
   */
  async removeRule(index) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (index < 0 || index >= this.rules.length) {
      throw new Error('Invalid rule index');
    }
    
    // Remove rule from list
    const removedRule = this.rules.splice(index, 1)[0];
    
    // Save rules to storage
    await browser.storage.local.set({
      [STORAGE_KEYS.DOMAIN_RULES]: this.rules
    });
    
    logger.info('Removed domain rule', removedRule);
  }
  
  /**
   * Get all domain rules
   * @returns {Promise<Array>} - The list of domain rules
   */
  async getRules() {
    if (!this.initialized) {
      await this.initialize();
    }
    
    return this.rules;
  }
  
  /**
   * Check if a URL matches any domain rule
   * @param {string} url - The URL to check
   * @returns {Object|null} - The matching rule or null if none
   */
  getMatchingRule(url) {
    if (!url) {
      return null;
    }
    
    try {
      const hostname = new URL(url).hostname;
      
      // Find matching rule
      for (const rule of this.rules) {
        if (this.matchesPattern(hostname, rule.pattern)) {
          return rule;
        }
      }
      
      return null;
    } catch (error) {
      logger.error(`Error checking URL: ${url}`, error);
      return null;
    }
  }
  
  /**
   * Check if a hostname matches a pattern
   * @param {string} hostname - The hostname to check
   * @param {string} pattern - The pattern to match against
   * @returns {boolean} - Whether the hostname matches the pattern
   */
  matchesPattern(hostname, pattern) {
    // Handle simple wildcard patterns
    if (pattern.startsWith('*.')) {
      const domain = pattern.substring(2);
      return hostname === domain || hostname.endsWith('.' + domain);
    }
    
    // Handle regex patterns
    if (pattern.startsWith('/') && pattern.endsWith('/')) {
      try {
        const regex = new RegExp(pattern.substring(1, pattern.length - 1));
        return regex.test(hostname);
      } catch (error) {
        logger.error(`Invalid regex pattern: ${pattern}`, error);
        return false;
      }
    }
    
    // Exact match
    return hostname === pattern;
  }
  
  /**
   * Get the action and timeout for a tab based on domain rules
   * @param {Object} tab - The tab to check
   * @param {number} defaultTimeout - The default timeout to use if no rule matches
   * @returns {Object} - The action and timeout for the tab
   */
  getTabAction(tab, defaultTimeout) {
    if (!tab || !tab.url) {
      return {
        shouldProcess: true,
        timeout: defaultTimeout
      };
    }
    
    // Check for matching rule
    const rule = this.getMatchingRule(tab.url);
    if (!rule) {
      return {
        shouldProcess: true,
        timeout: defaultTimeout
      };
    }
    
    // Handle different rule actions
    switch (rule.action) {
      case DOMAIN_RULE_ACTIONS.NEVER_CLOSE:
        return {
          shouldProcess: false,
          timeout: null
        };
        
      case DOMAIN_RULE_ACTIONS.ALWAYS_CLOSE:
        return {
          shouldProcess: true,
          timeout: 0 // Close immediately
        };
        
      case DOMAIN_RULE_ACTIONS.CUSTOM_TIMEOUT:
        return {
          shouldProcess: true,
          timeout: rule.timeout || defaultTimeout
        };
        
      default:
        return {
          shouldProcess: true,
          timeout: defaultTimeout
        };
    }
  }
}

// Export a singleton instance
export const domainRuleService = new DomainRuleService();

// Legacy export for backward compatibility
export const DomainRuleManager = DomainRuleService;