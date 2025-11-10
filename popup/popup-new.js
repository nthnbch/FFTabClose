/**
 * FFTabClose - Popup Script V4.0
 * 
 * Interface utilisateur moderne pour configurer l'extension
 */

// Configuration par défaut (doit correspondre au background script)
const DEFAULT_CONFIG = {
  enabled: true,
  closeAfterMinutes: 720, // 12 heures
  discardPinnedTabs: true,
  excludeActiveTab: true,
  excludeAudibleTabs: true,
  checkIntervalMinutes: 1
};

// Éléments DOM
const elements = {
  enabled: document.getElementById('enabled'),
  closeAfter: document.getElementById('close-after'),
  customTimeContainer: document.getElementById('custom-time-container'),
  customHours: document.getElementById('custom-hours'),
  customMinutes: document.getElementById('custom-minutes'),
  discardPinned: document.getElementById('discard-pinned'),
  excludeAudible: document.getElementById('exclude-audible'),
  saveButton: document.getElementById('save-button'),
  forceProcess: document.getElementById('force-process'),
  statusMessage: document.getElementById('status-message'),
  
  // Statistiques
  totalTabs: document.getElementById('total-tabs'),
  oldTabs: document.getElementById('old-tabs'),
  pinnedTabs: document.getElementById('pinned-tabs')
};

// État de l'application
let currentConfig = { ...DEFAULT_CONFIG };

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  console.log('FFTabClose Popup: Initializing...');
  
  try {
    await loadConfiguration();
    await updateStatistics();
    setupEventListeners();
    updateUI();
    
    console.log('FFTabClose Popup: Initialization complete');
  } catch (error) {
    console.error('FFTabClose Popup: Initialization error:', error);
    showStatus('Erreur d\'initialisation', 'error');
  }
});

// Charger la configuration
async function loadConfiguration() {
  try {
    const result = await browser.storage.sync.get('config');
    if (result.config) {
      currentConfig = { ...DEFAULT_CONFIG, ...result.config };
    }
    console.log('FFTabClose Popup: Configuration loaded:', currentConfig);
  } catch (error) {
    console.error('FFTabClose Popup: Error loading configuration:', error);
    currentConfig = { ...DEFAULT_CONFIG };
  }
}

// Sauvegarder la configuration
async function saveConfiguration() {
  try {
    await browser.storage.sync.set({ config: currentConfig });
    console.log('FFTabClose Popup: Configuration saved:', currentConfig);
    showStatus('Configuration sauvegardée avec succès!', 'success');
    
    // Fermer le popup après un délai
    setTimeout(() => {
      if (window.close) {
        window.close();
      }
    }, 1500);
    
  } catch (error) {
    console.error('FFTabClose Popup: Error saving configuration:', error);
    showStatus('Erreur lors de la sauvegarde', 'error');
  }
}

// Mettre à jour les statistiques
async function updateStatistics() {
  try {
    // Dans Firefox, on communique via messages avec le background script
    try {
      const response = await browser.runtime.sendMessage({ action: 'getStats' });
      if (response && response.stats) {
        const stats = response.stats;
        elements.totalTabs.textContent = stats.totalTabs;
        elements.oldTabs.textContent = stats.oldTabs;
        elements.pinnedTabs.textContent = stats.pinnedTabs;
        
        console.log('FFTabClose Popup: Stats updated:', stats);
      } else {
        throw new Error('No stats response from background script');
      }
    } catch (error) {
      // Fallback: compter les onglets directement
      console.log('FFTabClose Popup: Using fallback tab counting');
      const tabs = await browser.tabs.query({});
      elements.totalTabs.textContent = tabs.length;
      elements.pinnedTabs.textContent = tabs.filter(tab => tab.pinned).length;
      elements.oldTabs.textContent = '?';
    }
  } catch (error) {
    console.error('FFTabClose Popup: Error updating statistics:', error);
    elements.totalTabs.textContent = '?';
    elements.oldTabs.textContent = '?';
    elements.pinnedTabs.textContent = '?';
  }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
  // Sauvegarde
  elements.saveButton.addEventListener('click', handleSave);
  
  // Traitement forcé
  elements.forceProcess.addEventListener('click', handleForceProcess);
  
  // Sélecteur de temps
  elements.closeAfter.addEventListener('change', handleTimeSelectChange);
  
  // Activation/désactivation
  elements.enabled.addEventListener('change', handleEnabledChange);
  
  // Autres options
  elements.discardPinned.addEventListener('change', handleDiscardPinnedChange);
  elements.excludeAudible.addEventListener('change', handleExcludeAudibleChange);
  
  // Temps personnalisé
  elements.customHours.addEventListener('input', handleCustomTimeChange);
  elements.customMinutes.addEventListener('input', handleCustomTimeChange);
}

// Mettre à jour l'interface utilisateur
function updateUI() {
  // État principal
  elements.enabled.checked = currentConfig.enabled;
  
  // Options
  elements.discardPinned.checked = currentConfig.discardPinnedTabs;
  elements.excludeAudible.checked = currentConfig.excludeAudibleTabs;
  
  // Sélecteur de temps
  const minutes = currentConfig.closeAfterMinutes;
  const option = elements.closeAfter.querySelector(`option[value="${minutes}"]`);
  
  if (option) {
    elements.closeAfter.value = minutes;
    elements.customTimeContainer.style.display = 'none';
  } else {
    // Temps personnalisé
    elements.closeAfter.value = 'custom';
    elements.customTimeContainer.style.display = 'block';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    elements.customHours.value = hours;
    elements.customMinutes.value = mins;
  }
  
  // État des contrôles
  updateControlsState();
}

// Mettre à jour l'état des contrôles
function updateControlsState() {
  const isEnabled = currentConfig.enabled;
  
  // Désactiver tous les contrôles si l'extension est désactivée
  elements.closeAfter.disabled = !isEnabled;
  elements.customHours.disabled = !isEnabled;
  elements.customMinutes.disabled = !isEnabled;
  elements.discardPinned.disabled = !isEnabled;
  elements.excludeAudible.disabled = !isEnabled;
  elements.forceProcess.disabled = !isEnabled;
}

// Gestionnaires d'événements
async function handleSave() {
  console.log('FFTabClose Popup: Saving configuration...');
  
  // Validation
  if (currentConfig.closeAfterMinutes < 1) {
    showStatus('La durée doit être d\'au moins 1 minute', 'error');
    return;
  }
  
  elements.saveButton.disabled = true;
  elements.saveButton.textContent = 'Sauvegarde...';
  
  try {
    await saveConfiguration();
  } finally {
    elements.saveButton.disabled = false;
    elements.saveButton.textContent = 'Sauvegarder';
  }
}

async function handleForceProcess() {
  console.log('FFTabClose Popup: Force processing...');
  
  elements.forceProcess.disabled = true;
  elements.forceProcess.textContent = 'Traitement...';
  
  try {
    // Envoyer un message au background script pour forcer le traitement
    const response = await browser.runtime.sendMessage({ action: 'forceProcess' });
    
    if (response && response.success) {
      showStatus('Traitement effectué avec succès', 'success');
      
      // Mettre à jour les statistiques
      setTimeout(async () => {
        await updateStatistics();
      }, 1000);
    } else {
      showStatus('Erreur lors du traitement: ' + (response?.error || 'Réponse invalide'), 'error');
    }
  } catch (error) {
    console.error('FFTabClose Popup: Error force processing:', error);
    showStatus('Erreur lors du traitement', 'error');
  } finally {
    elements.forceProcess.disabled = false;
    elements.forceProcess.textContent = 'Traiter maintenant';
  }
}

function handleTimeSelectChange() {
  const value = elements.closeAfter.value;
  
  if (value === 'custom') {
    elements.customTimeContainer.style.display = 'block';
    handleCustomTimeChange(); // Calculer la valeur personnalisée
  } else {
    elements.customTimeContainer.style.display = 'none';
    currentConfig.closeAfterMinutes = parseInt(value);
    console.log('FFTabClose Popup: Time changed to', currentConfig.closeAfterMinutes, 'minutes');
  }
}

function handleCustomTimeChange() {
  const hours = parseInt(elements.customHours.value) || 0;
  const minutes = parseInt(elements.customMinutes.value) || 0;
  
  currentConfig.closeAfterMinutes = hours * 60 + minutes;
  
  console.log(`FFTabClose Popup: Custom time: ${hours}h ${minutes}m = ${currentConfig.closeAfterMinutes} minutes`);
}

function handleEnabledChange() {
  currentConfig.enabled = elements.enabled.checked;
  updateControlsState();
  console.log('FFTabClose Popup: Enabled changed to', currentConfig.enabled);
}

function handleDiscardPinnedChange() {
  currentConfig.discardPinnedTabs = elements.discardPinned.checked;
  console.log('FFTabClose Popup: Discard pinned changed to', currentConfig.discardPinnedTabs);
}

function handleExcludeAudibleChange() {
  currentConfig.excludeAudibleTabs = elements.excludeAudible.checked;
  console.log('FFTabClose Popup: Exclude audible changed to', currentConfig.excludeAudibleTabs);
}

// Afficher un message de statut
function showStatus(message, type = 'info') {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  
  // Masquer automatiquement après un délai
  if (type === 'success') {
    setTimeout(() => {
      elements.statusMessage.className = 'status-message';
    }, 3000);
  } else if (type === 'error') {
    setTimeout(() => {
      elements.statusMessage.className = 'status-message';
    }, 5000);
  }
}