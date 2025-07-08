/**
 * FFTabClose - Popup Controller
 * Handles the extension's popup interface with i18n support
 */

class PopupController {
  constructor() {
    this.config = null;
    this.stats = null;
    
    this.elements = {
      enabledToggle: document.getElementById('enabledToggle'),
      timeSelect: document.getElementById('timeSelect'),
      excludePinned: document.getElementById('excludePinned'),
      excludeAudible: document.getElementById('excludeAudible'),
      discardPinned: document.getElementById('discardPinned'),
      closeOldNow: document.getElementById('closeOldNow'),
      saveIndicator: document.getElementById('saveIndicator'),
      totalTabs: document.getElementById('totalTabs'),
      normalTabs: document.getElementById('normalTabs'),
      eligibleTabs: document.getElementById('eligibleTabs'),
      totalPinnedTabs: document.getElementById('totalPinnedTabs'),
      pinnedTabsToDiscard: document.getElementById('pinnedTabsToDiscard'),
      pinnedTabsToDiscardStat: document.getElementById('pinnedTabsToDiscardStat')
    };
    
    this.init();
  }
  
  /**
   * Initialize the popup controller
   */
  async init() {
    try {
      await this.loadTranslations();
      await this.loadConfig();
      await this.loadStats();
      await this.updateUI();
      this.setupEventListeners();
      this.startStatsRefresh();
    } catch (error) {
      console.error('FFTabClose: Failed to initialize popup:', error);
      this.showError('Failed to load extension settings');
    }
  }
  
  /**
   * Load and apply translations
   */
  async loadTranslations() {
    try {
      // Apply translations to all elements with data-i18n attribute
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        
        // Validation de la clé
        if (!key || typeof key !== 'string' || !key.trim()) {
          console.warn('FFTabClose: Invalid i18n key:', key);
          return;
        }
        
        if (browser.i18n && browser.i18n.getMessage) {
          const message = browser.i18n.getMessage(key);
          if (message) {
            // Échapper le contenu pour éviter les injections
            element.textContent = message;
          }
        }
      });
    } catch (error) {
      console.warn('FFTabClose: Failed to load translations:', error);
    }
  }
  
  /**
   * Load configuration from background script
   */
  async loadConfig() {
    try {
      const response = await this.sendMessage({ action: 'getConfig' });
      if (response && response.success) {
        this.config = response.config;
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('FFTabClose: Failed to load config:', error);
      // Use default config as fallback
      this.config = {
        autoCloseTime: 12 * 60 * 60 * 1000, // 12 hours
        enabled: true,
        excludePinned: true,
        excludeAudible: true
      };
    }
  }
  
  /**
   * Load statistics from background script
   */
  async loadStats() {
    try {
      const response = await this.sendMessage({ action: 'getStats' });
      if (response && response.success) {
        this.stats = response.stats;
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
    } catch (error) {
      console.error('FFTabClose: Failed to load stats:', error);
      this.stats = {
        totalTabs: 0,
        eligibleTabs: 0,
        oldestTabAge: '0m',
        enabled: true,
        autoCloseTime: 12
      };
    }
  }
  
  /**
   * Update the UI with current configuration and stats
   */
  async updateUI() {
    if (!this.config) return;
    
    // Enable/disable toggle
    if (this.elements.enabledToggle) {
      this.elements.enabledToggle.checked = this.config.enabled;
    }
    
    // Time selector
    if (this.elements.timeSelect) {
      this.elements.timeSelect.value = this.config.autoCloseTime.toString();
    }
    
    // Checkboxes
    if (this.elements.excludePinned) {
      this.elements.excludePinned.checked = this.config.excludePinned;
    }
    if (this.elements.excludeAudible) {
      this.elements.excludeAudible.checked = this.config.excludeAudible;
    }
    if (this.elements.discardPinned) {
      this.elements.discardPinned.checked = this.config.discardPinned;
    }
    
    // Handle UI dependency: if excludePinned is checked, hide discardPinned option
    await this.updateDiscardPinnedVisibility();
    
    // Statistics
    this.updateStats();
  }
  
  /**
   * Update statistics display
   */
  updateStats() {
    if (!this.stats) return;
    
    if (this.elements.totalTabs) {
      this.elements.totalTabs.textContent = this.stats.totalTabs || '0';
    }
    if (this.elements.normalTabs) {
      this.elements.normalTabs.textContent = this.stats.normalTabs || '0';
    }
    if (this.elements.eligibleTabs) {
      this.elements.eligibleTabs.textContent = this.stats.eligibleTabs || '0';
    }
    if (this.elements.totalPinnedTabs) {
      this.elements.totalPinnedTabs.textContent = this.stats.totalPinnedTabs || '0';
    }
    if (this.elements.pinnedTabsToDiscard) {
      this.elements.pinnedTabsToDiscard.textContent = this.stats.pinnedTabsToDiscard || '0';
      
      // Show/hide the pinned tabs to discard stat based on whether there are any
      if (this.elements.pinnedTabsToDiscardStat) {
        const shouldShow = (this.stats.pinnedTabsToDiscard || 0) > 0;
        this.elements.pinnedTabsToDiscardStat.style.display = shouldShow ? 'block' : 'none';
      }
    }
  }
  
  /**
   * Update visibility of discard pinned option based on exclude pinned setting
   */
  async updateDiscardPinnedVisibility() {
    if (this.elements.discardPinned && this.elements.excludePinned) {
      const excludePinnedChecked = this.elements.excludePinned.checked;
      // Show discard option only when exclude pinned is NOT checked
      this.elements.discardPinned.parentElement.style.display = excludePinnedChecked ? 'none' : 'flex';
      
      // If exclude pinned is checked, disable discard functionality
      if (excludePinnedChecked) {
        this.elements.discardPinned.checked = false;
        await this.updateConfigValue('discardPinned', false);
      }
    }
  }
  
  /**
   * Setup event listeners for UI elements
   */
  setupEventListeners() {
    // Enable/disable toggle
    if (this.elements.enabledToggle) {
      this.elements.enabledToggle.addEventListener('change', () => {
        this.updateConfigValue('enabled', this.elements.enabledToggle.checked);
      });
    }
    
    // Time selector
    if (this.elements.timeSelect) {
      this.elements.timeSelect.addEventListener('change', (e) => {
        const timeMs = parseInt(e.target.value);
        this.updateConfigValue('autoCloseTime', timeMs);
      });
    }
    
    // Checkboxes
    if (this.elements.excludePinned) {
      this.elements.excludePinned.addEventListener('change', async () => {
        await this.updateConfigValue('excludePinned', this.elements.excludePinned.checked);
        await this.updateDiscardPinnedVisibility();
      });
    }
    
    if (this.elements.excludeAudible) {
      this.elements.excludeAudible.addEventListener('change', () => {
        this.updateConfigValue('excludeAudible', this.elements.excludeAudible.checked);
      });
    }
    
    if (this.elements.discardPinned) {
      this.elements.discardPinned.addEventListener('change', () => {
        this.updateConfigValue('discardPinned', this.elements.discardPinned.checked);
      });
    }
    
    // Action buttons
    if (this.elements.closeOldNow) {
      this.elements.closeOldNow.addEventListener('click', () => {
        this.closeOldTabsNow();
      });
    }
  }
  
  /**
   * Update a configuration value
   */
  async updateConfigValue(key, value) {
    try {
      // Validation des paramètres
      if (typeof key !== 'string' || !key.trim()) {
        throw new Error('Invalid configuration key');
      }
      
      // Validation des clés autorisées
      const allowedKeys = ['autoCloseTime', 'enabled', 'excludePinned', 'excludeAudible', 'discardPinned'];
      if (!allowedKeys.includes(key)) {
        throw new Error(`Invalid configuration key: ${key}`);
      }
      
      // Validation des valeurs selon le type
      switch (key) {
        case 'autoCloseTime':
          if (typeof value !== 'number' || value < 120000 || value > 172800000) {
            throw new Error('Invalid autoCloseTime value');
          }
          break;
        case 'enabled':
        case 'excludePinned':
        case 'excludeAudible':
        case 'discardPinned':
          if (typeof value !== 'boolean') {
            throw new Error(`Invalid boolean value for ${key}`);
          }
          break;
      }
      
      this.config[key] = value;
      
      const response = await this.sendMessage({
        action: 'updateConfig',
        config: { [key]: value }
      });
      
      if (response.success) {
        this.showSaveIndicator();
      } else {
        throw new Error(response.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('FFTabClose: Failed to update config:', error);
      this.showError('Failed to save settings');
    }
  }
  
  /**
   * Force close old tabs now
   */
  async closeOldTabsNow() {
    if (!this.elements.closeOldNow) return;
    
    try {
      this.elements.closeOldNow.disabled = true;
      const originalText = this.elements.closeOldNow.textContent;
      this.elements.closeOldNow.textContent = browser.i18n?.getMessage('closingTabs') || 'Closing tabs...';
      
      // Use manualClose action for immediate processing of all eligible tabs
      const response = await this.sendMessage({ action: 'manualClose' });
      
      if (response && response.success) {
        await this.loadStats();
        this.updateStats();
        this.showSaveIndicator(browser.i18n?.getMessage('tabsClosedSuccess') || 'Tabs closed successfully!');
      } else {
        throw new Error(response?.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('FFTabClose: Failed to close tabs:', error);
      this.showError('Failed to close tabs');
    } finally {
      setTimeout(() => {
        if (this.elements.closeOldNow) {
          this.elements.closeOldNow.disabled = false;
          this.elements.closeOldNow.textContent = browser.i18n?.getMessage('closeOldTabsNow') || 'Close old tabs now';
        }
      }, 2000);
    }
  }
  
  /**
   * Start periodic stats refresh
   */
  startStatsRefresh() {
    setInterval(async () => {
      try {
        await this.loadStats();
        this.updateStats();
      } catch (error) {
        console.warn('FFTabClose: Failed to refresh stats:', error);
      }
    }, 5000);
  }
  
  /**
   * Show save indicator
   */
  showSaveIndicator(message = null) {
    if (!this.elements.saveIndicator) return;
    
    const defaultMessage = browser.i18n.getMessage('settingsSaved') || '✓ Settings saved';
    this.elements.saveIndicator.textContent = message || defaultMessage;
    this.elements.saveIndicator.classList.add('show');
    
    setTimeout(() => {
      this.elements.saveIndicator.classList.remove('show');
    }, 2000);
  }
  
  /**
   * Show error message
   */
  showError(message) {
    if (!this.elements.saveIndicator) return;
    
    const errorMessage = browser.i18n.getMessage('settingsError') || 'Failed to save settings';
    this.elements.saveIndicator.textContent = `❌ ${message || errorMessage}`;
    this.elements.saveIndicator.style.color = '#dc3545';
    this.elements.saveIndicator.classList.add('show');
    
    setTimeout(() => {
      this.elements.saveIndicator.classList.remove('show');
      this.elements.saveIndicator.style.color = '#28a745';
    }, 3000);
  }
  
  /**
   * Send message to background script
   */
  sendMessage(message) {
    return new Promise((resolve, reject) => {
      // Validation du message avant envoi
      if (!message || typeof message !== 'object' || !message.action) {
        reject(new Error('Invalid message format'));
        return;
      }
      
      // Timeout pour éviter les blocages
      const timeout = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 5000);
      
      browser.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        
        if (browser.runtime.lastError) {
          reject(browser.runtime.lastError);
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Load internationalization
  loadI18n();
  
  // Initialize controller
  new PopupController();
});

/**
 * Load internationalization messages
 */
function loadI18n() {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(element => {
    const messageKey = element.getAttribute('data-i18n');
    const message = browser.i18n.getMessage(messageKey);
    if (message) {
      element.textContent = message;
    }
  });
}
