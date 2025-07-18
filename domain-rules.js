/**
 * FFTabClose - Domain Rules Manager
 * Handles domain-specific tab closure rules
 * 
 * Version 3.0.0
 * Last updated: 17 juillet 2025
 */

// Domain rule structure
// {
//   domain: "example.com",
//   action: "never-close" | "always-close" | "custom-timeout",
//   timeout: 3600000 (only for custom-timeout, in milliseconds)
// }

class DomainRuleManager {
  constructor() {
    this.rules = [];
    this.STORAGE_KEY = 'domainRules';
  }

  // Load rules from storage
  async loadRules() {
    try {
      const stored = await browser.storage.local.get(this.STORAGE_KEY);
      this.rules = stored[this.STORAGE_KEY] || [];
      return this.rules;
    } catch (error) {
      console.error("Error loading domain rules:", error);
      return [];
    }
  }

  // Save rules to storage
  async saveRules() {
    try {
      await browser.storage.local.set({ [this.STORAGE_KEY]: this.rules });
      return true;
    } catch (error) {
      console.error("Error saving domain rules:", error);
      return false;
    }
  }

  // Add a new rule
  async addRule(domain, action, timeout) {
    // Sanitize domain input - ensure it's just the host
    try {
      // If full URL provided, extract just the hostname
      if (domain.includes('://')) {
        const url = new URL(domain);
        domain = url.hostname;
      }
      
      // Remove www. prefix if present
      domain = domain.replace(/^www\./, '');
    } catch (error) {
      console.error("Invalid domain format:", error);
      return false;
    }
    
    // Check for duplicates
    const existingRule = this.rules.find(rule => rule.domain === domain);
    if (existingRule) {
      return false;
    }
    
    // Create rule object
    const rule = {
      domain,
      action,
      timeout: action === 'custom-timeout' ? timeout : null
    };
    
    this.rules.push(rule);
    await this.saveRules();
    return true;
  }

  // Remove a rule
  async removeRule(domain) {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.domain !== domain);
    
    if (this.rules.length !== initialLength) {
      await this.saveRules();
      return true;
    }
    return false;
  }

  // Check if URL matches any rule
  getMatchingRule(url) {
    try {
      const hostname = new URL(url).hostname;
      
      // Try exact hostname match first
      let rule = this.rules.find(r => r.domain === hostname);
      if (rule) {
        return rule;
      }
      
      // Try without www prefix
      const hostnameWithoutWww = hostname.replace(/^www\./, '');
      rule = this.rules.find(r => r.domain === hostnameWithoutWww);
      if (rule) {
        return rule;
      }
      
      // Check for subdomain matches
      for (const r of this.rules) {
        // Check if tab URL is a subdomain of the rule domain
        if (hostname.endsWith(`.${r.domain}`)) {
          return r;
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error matching URL to domain rules:", error);
      return null;
    }
  }

  // Should tab be closed based on rules
  shouldProcessTab(tab, defaultTimeout) {
    // If no URL, use default processing
    if (!tab.url) {
      return { shouldProcess: true, timeout: defaultTimeout };
    }
    
    const rule = this.getMatchingRule(tab.url);
    
    // If no rule matches, use default processing
    if (!rule) {
      return { shouldProcess: true, timeout: defaultTimeout };
    }
    
    switch(rule.action) {
      case 'never-close':
        return { shouldProcess: false, timeout: null };
      
      case 'always-close':
        return { shouldProcess: true, timeout: 0 }; // 0 means close immediately
      
      case 'custom-timeout':
        return { shouldProcess: true, timeout: rule.timeout };
      
      default:
        return { shouldProcess: true, timeout: defaultTimeout };
    }
  }
}

// Export the class
export default DomainRuleManager;
