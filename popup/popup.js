/**
 * FFTabClose - Popup Script V5.0
 * 
 * Interface utilisateur pour configurer l'extension
 */

const DEFAULT_CONFIG = {
  enabled: true,
  closeAfterMinutes: 720,
  discardPinnedTabs: true,
  excludeActiveTab: true,
  excludeAudibleTabs: true,
  excludedDomains: [],
  checkIntervalMinutes: 1
};

// DOM elements
const el = {
  enabled: document.getElementById('enabled'),
  closeAfter: document.getElementById('close-after'),
  customTimeContainer: document.getElementById('custom-time-container'),
  customHours: document.getElementById('custom-hours'),
  customMinutes: document.getElementById('custom-minutes'),
  discardPinned: document.getElementById('discard-pinned'),
  excludeAudible: document.getElementById('exclude-audible'),
  excludedDomains: document.getElementById('excluded-domains'),
  saveButton: document.getElementById('save-button'),
  forceProcess: document.getElementById('force-process'),
  statusMessage: document.getElementById('status-message'),
  totalTabs: document.getElementById('total-tabs'),
  oldClose: document.getElementById('old-close'),
  oldDiscard: document.getElementById('old-discard'),
  pinnedTabs: document.getElementById('pinned-tabs')
};

let currentConfig = { ...DEFAULT_CONFIG };

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadConfig();
    await updateStats();
    setupListeners();
    updateUI();
  } catch (error) {
    console.error('[FFTabClose Popup] Init error:', error);
    showStatus('Erreur d\'initialisation', 'error');
  }
});

// ─── Load config ───────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const result = await browser.storage.sync.get('config');
    if (result.config) {
      currentConfig = { ...DEFAULT_CONFIG, ...result.config };
    }
  } catch (error) {
    console.error('[FFTabClose Popup] Config load error:', error);
  }
}

// ─── Save config ───────────────────────────────────────────────────────────
async function saveConfig() {
  try {
    // Build config from UI
    currentConfig.enabled = el.enabled.checked;
    currentConfig.discardPinnedTabs = el.discardPinned.checked;
    currentConfig.excludeAudibleTabs = el.excludeAudible.checked;
    
    // Parse time
    if (el.closeAfter.value === 'custom') {
      const hours = parseInt(el.customHours.value) || 0;
      const minutes = parseInt(el.customMinutes.value) || 0;
      currentConfig.closeAfterMinutes = Math.max(1, hours * 60 + minutes);
    } else {
      currentConfig.closeAfterMinutes = parseInt(el.closeAfter.value);
    }
    
    // Parse domains
    const domainsText = el.excludedDomains.value.trim();
    currentConfig.excludedDomains = domainsText
      ? domainsText.split('\n').map(d => d.trim()).filter(d => d.length > 0)
      : [];
    
    await browser.storage.sync.set({ config: currentConfig });
    showStatus('✅ Configuration sauvegardée!', 'success');
    
  } catch (error) {
    console.error('[FFTabClose Popup] Save error:', error);
    showStatus('Erreur de sauvegarde', 'error');
  }
}

// ─── Update stats ──────────────────────────────────────────────────────────
async function updateStats() {
  try {
    const response = await browser.runtime.sendMessage({ action: 'getStats' });
    
    if (response && response.stats) {
      const s = response.stats;
      el.totalTabs.textContent = s.totalTabs;
      el.oldClose.textContent = s.oldTabsToClose;
      el.oldDiscard.textContent = s.oldTabsToDiscard;
      el.pinnedTabs.textContent = s.pinnedTabs;
    }
  } catch (error) {
    // Fallback: direct tab query
    try {
      const tabs = await browser.tabs.query({});
      el.totalTabs.textContent = tabs.length;
      el.pinnedTabs.textContent = tabs.filter(t => t.pinned).length;
      el.oldClose.textContent = '?';
      el.oldDiscard.textContent = '?';
    } catch (e) {
      el.totalTabs.textContent = '?';
      el.oldClose.textContent = '?';
      el.oldDiscard.textContent = '?';
      el.pinnedTabs.textContent = '?';
    }
  }
}

// ─── Setup listeners ───────────────────────────────────────────────────────
function setupListeners() {
  el.saveButton.addEventListener('click', async () => {
    el.saveButton.disabled = true;
    el.saveButton.textContent = 'Sauvegarde...';
    
    try {
      await saveConfig();
    } finally {
      el.saveButton.disabled = false;
      el.saveButton.textContent = 'Sauvegarder';
    }
  });
  
  el.forceProcess.addEventListener('click', async () => {
    el.forceProcess.disabled = true;
    el.forceProcess.textContent = 'Traitement...';
    
    try {
      const response = await browser.runtime.sendMessage({ action: 'forceProcess' });
      
      if (response && response.success) {
        showStatus('✅ Traitement effectué!', 'success');
        setTimeout(() => updateStats(), 1000);
      } else {
        showStatus('Erreur: ' + (response?.error || 'inconnue'), 'error');
      }
    } catch (error) {
      showStatus('Erreur de traitement', 'error');
    } finally {
      el.forceProcess.disabled = false;
      el.forceProcess.textContent = 'Traiter maintenant';
    }
  });
  
  el.closeAfter.addEventListener('change', () => {
    el.customTimeContainer.style.display = 
      el.closeAfter.value === 'custom' ? 'block' : 'none';
  });
  
  el.enabled.addEventListener('change', updateControlsState);
}

// ─── Update UI from config ────────────────────────────────────────────────
function updateUI() {
  el.enabled.checked = currentConfig.enabled;
  el.discardPinned.checked = currentConfig.discardPinnedTabs;
  el.excludeAudible.checked = currentConfig.excludeAudibleTabs;
  
  // Time selector
  const minutes = currentConfig.closeAfterMinutes;
  const option = el.closeAfter.querySelector(`option[value="${minutes}"]`);
  
  if (option) {
    el.closeAfter.value = minutes;
    el.customTimeContainer.style.display = 'none';
  } else {
    el.closeAfter.value = 'custom';
    el.customTimeContainer.style.display = 'block';
    el.customHours.value = Math.floor(minutes / 60);
    el.customMinutes.value = minutes % 60;
  }
  
  // Domain exclusions
  if (currentConfig.excludedDomains && currentConfig.excludedDomains.length > 0) {
    el.excludedDomains.value = currentConfig.excludedDomains.join('\n');
  }
  
  updateControlsState();
}

// ─── Toggle controls based on enabled state ───────────────────────────────
function updateControlsState() {
  const isEnabled = el.enabled.checked;
  
  el.closeAfter.disabled = !isEnabled;
  el.customHours.disabled = !isEnabled;
  el.customMinutes.disabled = !isEnabled;
  el.discardPinned.disabled = !isEnabled;
  el.excludeAudible.disabled = !isEnabled;
  el.excludedDomains.disabled = !isEnabled;
  el.forceProcess.disabled = !isEnabled;
  
  document.querySelector('.config-section').style.opacity = isEnabled ? '1' : '0.5';
  document.querySelector('.behavior-section').style.opacity = isEnabled ? '1' : '0.5';
}

// ─── Status message ───────────────────────────────────────────────────────
function showStatus(message, type = 'info') {
  el.statusMessage.textContent = message;
  el.statusMessage.className = `status-message ${type}`;
  
  const timeout = type === 'error' ? 5000 : 3000;
  setTimeout(() => {
    el.statusMessage.className = 'status-message';
  }, timeout);
}