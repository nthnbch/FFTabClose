/**
 * FFTabClose - Popup Controller
 * Handles the extension's popup interface
 */

class PopupController {
  constructor() {
    this.config = null;
    this.stats = null;
    
    this.elements = {
      enabledToggle: document.getElementById('enabledToggle'),
      timeSlider: document.getElementById('timeSlider'),
      timeValue: document.getElementById('timeValue'),
      excludePinned: document.getElementById('excludePinned'),
      excludeAudible: document.getElementById('excludeAudible'),
      presetBtns: document.querySelectorAll('.preset-btn'),
      closeOldNow: document.getElementById('closeOldNow'),
      resetStats: document.getElementById('resetStats'),
      saveIndicator: document.getElementById('saveIndicator'),
      totalTabs: document.getElementById('totalTabs'),
      eligibleTabs: document.getElementById('eligibleTabs'),
      oldestTab: document.getElementById('oldestTab')
    };
    
    this.init();
  }
  
  /**
   * Initialize the popup controller
   */
  async init() {
    try {
      await this.loadConfig();
      await this.loadStats();
      this.updateUI();
      this.setupEventListeners();
      this.startStatsRefresh();
    } catch (error) {
      console.error('FFTabClose: Failed to initialize popup:', error);
      this.showError('Failed to load extension settings');
    }
  }
  
  /**
   * Load configuration from background script
   */
  async loadConfig() {
    try {
      const response = await this.sendMessage({ action: 'getConfig' });
      if (response.success) {
        this.config = response.config;
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('FFTabClose: Failed to load config:', error);
      // Use default config as fallback
      this.config = {
        autoCloseTime: 12 * 60 * 60 * 1000,
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
      if (response.success) {
        this.stats = response.stats;
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('FFTabClose: Failed to load stats:', error);
      this.stats = {
        totalTabs: 0,
        eligibleTabs: 0,
        oldestTabAge: 0,
        enabled: true,
        autoCloseTime: 12
      };
    }
  }
  
  /**
   * Update the UI with current configuration and stats
   */
  updateUI() {
    if (!this.config) return;
    
    // Enable/disable toggle
    if (this.elements.enabledToggle) {
      this.elements.enabledToggle.checked = this.config.enabled;
    }
    
    // Time slider and value
    const hours = Math.round(this.config.autoCloseTime / (60 * 60 * 1000));
    if (this.elements.timeSlider) {
      this.elements.timeSlider.value = hours;
    }
    this.updateTimeValue(hours);
    
    // Checkboxes
    if (this.elements.excludePinned) {
      this.elements.excludePinned.checked = this.config.excludePinned;
    }
    if (this.elements.excludeAudible) {
      this.elements.excludeAudible.checked = this.config.excludeAudible;
    }
    
    // Preset buttons
    this.updatePresetButtons(hours);
    
    // Statistics
    this.updateStats();
  }
  
  /**
   * Update the time display text
   */
  updateTimeValue(hours) {
    if (!this.elements.timeValue) return;
    
    let text;
    if (hours === 1) {
      text = '1 hour';
    } else if (hours < 24) {
      text = `${hours} hours`;
    } else {
      const days = Math.round(hours / 24);
      text = days === 1 ? '1 day' : `${days} days`;
    }
    
    this.elements.timeValue.textContent = text;
  }
  
  /**
   * Update preset button states
   */
  updatePresetButtons(currentHours) {
    if (!this.elements.presetBtns) return;
    
    this.elements.presetBtns.forEach(btn => {
      const btnHours = parseInt(btn.dataset.hours);
      btn.classList.toggle('active', btnHours === currentHours);
    });
  }
  
  /**
   * Update statistics display
   */
  updateStats() {
    if (!this.stats) return;
    
    if (this.elements.totalTabs) {
      this.elements.totalTabs.textContent = this.stats.totalTabs;
    }
    if (this.elements.eligibleTabs) {
      this.elements.eligibleTabs.textContent = this.stats.eligibleTabs;
    }
    if (this.elements.oldestTab) {
      this.elements.oldestTab.textContent = this.stats.oldestTabAge;
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
    
    // Time slider
    if (this.elements.timeSlider) {
      this.elements.timeSlider.addEventListener('input', (e) => {
        const hours = parseInt(e.target.value);
        this.updateTimeValue(hours);
        this.updatePresetButtons(hours);
      });
      
      this.elements.timeSlider.addEventListener('change', (e) => {
        const hours = parseInt(e.target.value);
        const milliseconds = hours * 60 * 60 * 1000;
        this.updateConfigValue('autoCloseTime', milliseconds);
      });
    }
    
    // Preset buttons
    if (this.elements.presetBtns) {
      this.elements.presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const hours = parseInt(btn.dataset.hours);
          if (this.elements.timeSlider) {
            this.elements.timeSlider.value = hours;
          }
          this.updateTimeValue(hours);
          this.updatePresetButtons(hours);
          
          const milliseconds = hours * 60 * 60 * 1000;
          this.updateConfigValue('autoCloseTime', milliseconds);
        });
      });
    }
    
    // Checkboxes
    if (this.elements.excludePinned) {
      this.elements.excludePinned.addEventListener('change', () => {
        this.updateConfigValue('excludePinned', this.elements.excludePinned.checked);
      });
    }
    
    if (this.elements.excludeAudible) {
      this.elements.excludeAudible.addEventListener('change', () => {
        this.updateConfigValue('excludeAudible', this.elements.excludeAudible.checked);
      });
    }
    
    // Action buttons
    if (this.elements.closeOldNow) {
      this.elements.closeOldNow.addEventListener('click', () => {
        this.closeOldTabsNow();
      });
    }
    
    if (this.elements.resetStats) {
      this.elements.resetStats.addEventListener('click', () => {
        this.resetStats();
      });
    }
  }
  
  /**
   * Update a configuration value
   */
  async updateConfigValue(key, value) {
    try {
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
      this.elements.closeOldNow.textContent = '🧹 Closing tabs...';
      
      const response = await this.sendMessage({ action: 'checkNow' });
      
      if (response.success) {
        await this.loadStats();
        this.updateStats();
        this.showSaveIndicator('Tabs closed successfully!');
      } else {
        throw new Error(response.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('FFTabClose: Failed to close tabs:', error);
      this.showError('Failed to close tabs');
    } finally {
      setTimeout(() => {
        if (this.elements.closeOldNow) {
          this.elements.closeOldNow.disabled = false;
          this.elements.closeOldNow.textContent = '🧹 Close old tabs now';
        }
      }, 2000);
    }
  }
  
  /**
   * Reset statistics
   */
  async resetStats() {
    if (!this.elements.resetStats) return;
    
    try {
      this.elements.resetStats.disabled = true;
      this.elements.resetStats.textContent = '🔄 Resetting...';
      
      const response = await this.sendMessage({ action: 'resetStats' });
      
      if (response.success) {
        await this.loadStats();
        this.updateStats();
        this.showSaveIndicator('Statistics reset!');
      } else {
        throw new Error(response.error || 'Unknown error');
      }
      
    } catch (error) {
      console.error('FFTabClose: Failed to reset stats:', error);
      this.showError('Failed to reset statistics');
    } finally {
      setTimeout(() => {
        if (this.elements.resetStats) {
          this.elements.resetStats.disabled = false;
          this.elements.resetStats.textContent = '🔄 Reset statistics';
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
  showSaveIndicator(message = '✓ Settings saved') {
    if (!this.elements.saveIndicator) return;
    
    this.elements.saveIndicator.textContent = message;
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
    
    this.elements.saveIndicator.textContent = `❌ ${message}`;
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
      browser.runtime.sendMessage(message, (response) => {
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
  new PopupController();
});
