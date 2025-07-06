// FFTabClose - Popup Script
// Gère l'interface utilisateur du popup

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
  
  async init() {
    try {
      // Charger la configuration actuelle
      await this.loadConfig();
      
      // Charger les statistiques
      await this.loadStats();
      
      // Mettre à jour l'interface
      this.updateUI();
      
      // Configurer les event listeners
      this.setupEventListeners();
      
      // Actualiser les stats toutes les 5 secondes
      this.startStatsRefresh();
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Erreur lors du chargement des paramètres');
    }
  }
  
  async loadConfig() {
    try {
      const response = await this.sendMessage({ action: 'getConfig' });
      this.config = response;
    } catch (error) {
      console.error('Failed to load config:', error);
      // Configuration par défaut en cas d'erreur
      this.config = {
        autoCloseTime: 12 * 60 * 60 * 1000,
        enabled: true,
        excludePinned: true,
        excludeAudible: true
      };
    }
  }
  
  async loadStats() {
    try {
      const response = await this.sendMessage({ action: 'getStats' });
      this.stats = response;
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.stats = {
        totalTabs: 0,
        eligibleTabs: 0,
        oldestTabAge: 0,
        enabled: true,
        autoCloseTime: 12
      };
    }
  }
  
  updateUI() {
    if (!this.config) return;
    
    // Statut activé/désactivé
    this.elements.enabledToggle.checked = this.config.enabled;
    
    // Délai de fermeture
    const hours = Math.round(this.config.autoCloseTime / (60 * 60 * 1000));
    this.elements.timeSlider.value = hours;
    this.updateTimeValue(hours);
    
    // Options
    this.elements.excludePinned.checked = this.config.excludePinned;
    this.elements.excludeAudible.checked = this.config.excludeAudible;
    
    // Boutons preset
    this.updatePresetButtons(hours);
    
    // Statistiques
    this.updateStats();
  }
  
  updateTimeValue(hours) {
    let text;
    if (hours === 1) {
      text = '1 heure';
    } else if (hours < 24) {
      text = `${hours} heures`;
    } else {
      const days = Math.round(hours / 24);
      text = days === 1 ? '1 jour' : `${days} jours`;
    }
    
    this.elements.timeValue.textContent = text;
  }
  
  updatePresetButtons(currentHours) {
    this.elements.presetBtns.forEach(btn => {
      const btnHours = parseInt(btn.dataset.hours);
      btn.classList.toggle('active', btnHours === currentHours);
    });
  }
  
  updateStats() {
    if (!this.stats) return;
    
    this.elements.totalTabs.textContent = this.stats.totalTabs;
    this.elements.eligibleTabs.textContent = this.stats.eligibleTabs;
    this.elements.oldestTab.textContent = this.stats.oldestTabAge;
  }
  
  setupEventListeners() {
    // Toggle principal
    this.elements.enabledToggle.addEventListener('change', () => {
      this.updateConfigValue('enabled', this.elements.enabledToggle.checked);
    });
    
    // Slider de temps
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
    
    // Boutons preset
    this.elements.presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const hours = parseInt(btn.dataset.hours);
        this.elements.timeSlider.value = hours;
        this.updateTimeValue(hours);
        this.updatePresetButtons(hours);
        
        const milliseconds = hours * 60 * 60 * 1000;
        this.updateConfigValue('autoCloseTime', milliseconds);
      });
    });
    
    // Options
    this.elements.excludePinned.addEventListener('change', () => {
      this.updateConfigValue('excludePinned', this.elements.excludePinned.checked);
    });
    
    this.elements.excludeAudible.addEventListener('change', () => {
      this.updateConfigValue('excludeAudible', this.elements.excludeAudible.checked);
    });
    
    // Actions
    this.elements.closeOldNow.addEventListener('click', () => {
      this.closeOldTabsNow();
    });
    
    this.elements.resetStats.addEventListener('click', () => {
      this.resetStats();
    });
  }
  
  async updateConfigValue(key, value) {
    try {
      this.config[key] = value;
      
      const response = await this.sendMessage({
        action: 'updateConfig',
        config: { [key]: value }
      });
      
      if (response.success) {
        this.showSaveIndicator();
      }
      
    } catch (error) {
      console.error('Failed to update config:', error);
      this.showError('Erreur lors de la sauvegarde');
    }
  }
  
  async closeOldTabsNow() {
    try {
      this.elements.closeOldNow.disabled = true;
      this.elements.closeOldNow.textContent = '🧹 Fermeture en cours...';
      
      // Forcer une vérification immédiate
      await this.sendMessage({ action: 'checkNow' });
      
      // Recharger les stats
      await this.loadStats();
      this.updateStats();
      
      this.showSaveIndicator('Onglets fermés !');
      
    } catch (error) {
      console.error('Failed to close tabs:', error);
      this.showError('Erreur lors de la fermeture');
    } finally {
      setTimeout(() => {
        this.elements.closeOldNow.disabled = false;
        this.elements.closeOldNow.textContent = '🧹 Fermer les anciens maintenant';
      }, 2000);
    }
  }
  
  async resetStats() {
    try {
      this.elements.resetStats.disabled = true;
      this.elements.resetStats.textContent = '🔄 Réinitialisation...';
      
      await this.sendMessage({ action: 'resetStats' });
      
      // Recharger les stats
      await this.loadStats();
      this.updateStats();
      
      this.showSaveIndicator('Compteurs réinitialisés !');
      
    } catch (error) {
      console.error('Failed to reset stats:', error);
      this.showError('Erreur lors de la réinitialisation');
    } finally {
      setTimeout(() => {
        this.elements.resetStats.disabled = false;
        this.elements.resetStats.textContent = '🔄 Réinitialiser les compteurs';
      }, 2000);
    }
  }
  
  startStatsRefresh() {
    setInterval(async () => {
      try {
        await this.loadStats();
        this.updateStats();
      } catch (error) {
        console.warn('Failed to refresh stats:', error);
      }
    }, 5000);
  }
  
  showSaveIndicator(message = '✓ Paramètres sauvegardés') {
    this.elements.saveIndicator.textContent = message;
    this.elements.saveIndicator.classList.add('show');
    
    setTimeout(() => {
      this.elements.saveIndicator.classList.remove('show');
    }, 2000);
  }
  
  showError(message) {
    this.elements.saveIndicator.textContent = `❌ ${message}`;
    this.elements.saveIndicator.style.color = '#dc3545';
    this.elements.saveIndicator.classList.add('show');
    
    setTimeout(() => {
      this.elements.saveIndicator.classList.remove('show');
      this.elements.saveIndicator.style.color = '#28a745';
    }, 3000);
  }
  
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

// Initialiser le contrôleur quand le DOM est prêt
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
