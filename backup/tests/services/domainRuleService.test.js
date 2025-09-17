/**
 * FFTabClose - DomainRuleService Tests
 * Unit tests for domain rule service
 */

import { DomainRuleService } from '../../services/domainRuleService.js';
import { DOMAIN_RULE_ACTIONS } from '../../common/constants.js';

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

describe('DomainRuleService', () => {
  let domainRuleService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a fresh instance for each test
    domainRuleService = new DomainRuleService();
    
    // Mock browser API calls
    browser.storage.local.get.mockResolvedValue({});
    browser.storage.local.set.mockResolvedValue({});
  });
  
  describe('initialize', () => {
    test('should load rules from storage', async () => {
      const mockRules = [
        { pattern: 'example.com', action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE },
        { pattern: '*.github.com', action: DOMAIN_RULE_ACTIONS.CUSTOM_TIMEOUT, timeout: 3600000 }
      ];
      
      browser.storage.local.get.mockResolvedValueOnce({
        domainRules: mockRules
      });
      
      await domainRuleService.initialize();
      
      expect(domainRuleService.rules).toEqual(mockRules);
      expect(domainRuleService.initialized).toBe(true);
    });
  });
  
  describe('addRule', () => {
    test('should add rule and save to storage', async () => {
      const newRule = {
        pattern: 'example.com',
        action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE
      };
      
      await domainRuleService.addRule(newRule);
      
      expect(domainRuleService.rules).toHaveLength(1);
      expect(domainRuleService.rules[0]).toEqual(newRule);
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        domainRules: [newRule]
      });
    });
    
    test('should throw error for invalid rule', async () => {
      const invalidRule = {
        pattern: 'example.com'
        // Missing action
      };
      
      await expect(domainRuleService.addRule(invalidRule)).rejects.toThrow();
    });
  });
  
  describe('removeRule', () => {
    test('should remove rule and save to storage', async () => {
      // Add two rules
      const rule1 = { pattern: 'example.com', action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE };
      const rule2 = { pattern: 'github.com', action: DOMAIN_RULE_ACTIONS.ALWAYS_CLOSE };
      
      domainRuleService.rules = [rule1, rule2];
      domainRuleService.initialized = true;
      
      // Remove the first rule
      await domainRuleService.removeRule(0);
      
      expect(domainRuleService.rules).toHaveLength(1);
      expect(domainRuleService.rules[0]).toEqual(rule2);
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        domainRules: [rule2]
      });
    });
    
    test('should throw error for invalid index', async () => {
      domainRuleService.rules = [
        { pattern: 'example.com', action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE }
      ];
      domainRuleService.initialized = true;
      
      await expect(domainRuleService.removeRule(1)).rejects.toThrow();
    });
  });
  
  describe('getRules', () => {
    test('should return all rules', async () => {
      const mockRules = [
        { pattern: 'example.com', action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE },
        { pattern: 'github.com', action: DOMAIN_RULE_ACTIONS.ALWAYS_CLOSE }
      ];
      
      domainRuleService.rules = mockRules;
      domainRuleService.initialized = true;
      
      const rules = await domainRuleService.getRules();
      
      expect(rules).toEqual(mockRules);
    });
  });
  
  describe('matchesPattern', () => {
    test('should match exact domain', () => {
      expect(domainRuleService.matchesPattern('example.com', 'example.com')).toBe(true);
      expect(domainRuleService.matchesPattern('example.org', 'example.com')).toBe(false);
    });
    
    test('should match wildcard domain', () => {
      expect(domainRuleService.matchesPattern('sub.example.com', '*.example.com')).toBe(true);
      expect(domainRuleService.matchesPattern('example.com', '*.example.com')).toBe(true);
      expect(domainRuleService.matchesPattern('otherexample.com', '*.example.com')).toBe(false);
    });
    
    test('should match regex pattern', () => {
      expect(domainRuleService.matchesPattern('test123.com', '/test\\d+\\.com/')).toBe(true);
      expect(domainRuleService.matchesPattern('testABC.com', '/test\\d+\\.com/')).toBe(false);
    });
  });
  
  describe('getMatchingRule', () => {
    beforeEach(() => {
      domainRuleService.rules = [
        { pattern: 'example.com', action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE },
        { pattern: '*.github.com', action: DOMAIN_RULE_ACTIONS.CUSTOM_TIMEOUT, timeout: 3600000 },
        { pattern: '/google\\.(com|co\\.uk)/', action: DOMAIN_RULE_ACTIONS.ALWAYS_CLOSE }
      ];
      domainRuleService.initialized = true;
    });
    
    test('should find matching exact domain rule', () => {
      const rule = domainRuleService.getMatchingRule('https://example.com/page');
      expect(rule).toEqual(domainRuleService.rules[0]);
    });
    
    test('should find matching wildcard domain rule', () => {
      const rule = domainRuleService.getMatchingRule('https://gist.github.com/user/123');
      expect(rule).toEqual(domainRuleService.rules[1]);
    });
    
    test('should find matching regex domain rule', () => {
      const rule = domainRuleService.getMatchingRule('https://www.google.co.uk/search');
      expect(rule).toEqual(domainRuleService.rules[2]);
    });
    
    test('should return null for non-matching URL', () => {
      const rule = domainRuleService.getMatchingRule('https://mozilla.org');
      expect(rule).toBeNull();
    });
  });
  
  describe('getTabAction', () => {
    beforeEach(() => {
      domainRuleService.rules = [
        { pattern: 'example.com', action: DOMAIN_RULE_ACTIONS.NEVER_CLOSE },
        { pattern: 'github.com', action: DOMAIN_RULE_ACTIONS.ALWAYS_CLOSE },
        { pattern: 'mozilla.org', action: DOMAIN_RULE_ACTIONS.CUSTOM_TIMEOUT, timeout: 1800000 }
      ];
      domainRuleService.initialized = true;
    });
    
    test('should return never close action for matching rule', () => {
      const tab = { url: 'https://example.com/page' };
      const result = domainRuleService.getTabAction(tab, 3600000);
      
      expect(result.shouldProcess).toBe(false);
      expect(result.timeout).toBeNull();
    });
    
    test('should return always close action for matching rule', () => {
      const tab = { url: 'https://github.com/user/repo' };
      const result = domainRuleService.getTabAction(tab, 3600000);
      
      expect(result.shouldProcess).toBe(true);
      expect(result.timeout).toBe(0);
    });
    
    test('should return custom timeout for matching rule', () => {
      const tab = { url: 'https://mozilla.org/firefox' };
      const result = domainRuleService.getTabAction(tab, 3600000);
      
      expect(result.shouldProcess).toBe(true);
      expect(result.timeout).toBe(1800000);
    });
    
    test('should return default action for non-matching URL', () => {
      const tab = { url: 'https://google.com' };
      const result = domainRuleService.getTabAction(tab, 3600000);
      
      expect(result.shouldProcess).toBe(true);
      expect(result.timeout).toBe(3600000);
    });
    
    test('should handle null or undefined tab', () => {
      const result = domainRuleService.getTabAction(null, 3600000);
      
      expect(result.shouldProcess).toBe(true);
      expect(result.timeout).toBe(3600000);
    });
  });
});