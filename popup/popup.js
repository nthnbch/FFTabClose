/**
 * FFTabClose - Popup Script V5.1
 * 
 * Auto-save on every change, auto-refresh stats every 5s
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

let currentConfig = { ...DEFAULT_CONFIG };
let statsInterval = null;

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const el = getElements();
  
  try {
    await loadConfig();
    updateUI(el);
    setupListeners(el);
    await updateStats(el);
    
    // Auto-refresh stats every 5 seconds
    statsInterval = setInterval(() => updateStats(el), 5000);
    
  } catch (error) {
    console.error('[FFTabClose Popup] Init error:', error);
    showStatus(el, 'Erreur d\'initialisation: ' + error.message, 'error');
  }
});

// Clean up interval when popup closes
window.addEventListener('unload', () => {
  if (statsInterval) clearInterval(statsInterval);
});

// ─── Get DOM elements ──────────────────────────────────────────────────────
function getElements() {
  return {
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
}

// ─── Load config ───────────────────────────────────────────────────────────
async function loadConfig() {
  try {
    const result = await browser.storage.sync.get('config');
    if (result.config) {
      currentConfig = { ...DEFAULT_CONFIG, ...result.config };
    }
    console.log('[FFTabClose Popup] Config loaded:', currentConfig);
  } catch (error) {
    console.error('[FFTabClose Popup] Config load error:', error);
  }
}

// ─── Save config (reads from UI) ───────────────────────────────────────────
async function saveConfig(el) {
  try {
    // Build config from current UI state
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
    console.log('[FFTabClose Popup] Config saved:', currentConfig);
    return true;
    
  } catch (error) {
    console.error('[FFTabClose Popup] Save error:', error);
    return false;
  }
}

// ─── Update stats ──────────────────────────────────────────────────────────
async function updateStats(el) {
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
      // Silent fail — popup might be closing
    }
  }
}

// ─── Setup listeners ───────────────────────────────────────────────────────
function setupListeners(el) {
  // Save button — saves + shows confirmation
  el.saveButton.addEventListener('click', async () => {
    el.saveButton.disabled = true;
    el.saveButton.textContent = 'Sauvegarde...';
    
    try {
      const ok = await saveConfig(el);
      showStatus(el, ok ? '✅ Configuration sauvegardée!' : 'Erreur de sauvegarde', ok ? 'success' : 'error');
      // Refresh stats immediately after save
      setTimeout(() => updateStats(el), 500);
    } finally {
      el.saveButton.disabled = false;
      el.saveButton.textContent = 'Sauvegarder';
    }
  });
  
  // Force process button
  el.forceProcess.addEventListener('click', async () => {
    el.forceProcess.disabled = true;
    el.forceProcess.textContent = 'Traitement...';
    
    try {
      // Save current config first to make sure background has latest settings
      await saveConfig(el);
      
      const response = await browser.runtime.sendMessage({ action: 'forceProcess' });
      
      if (response && response.success) {
        showStatus(el, '✅ Traitement effectué!', 'success');
        setTimeout(() => updateStats(el), 1000);
      } else {
        showStatus(el, 'Erreur: ' + (response?.error || 'inconnue'), 'error');
      }
    } catch (error) {
      showStatus(el, 'Erreur: ' + error.message, 'error');
    } finally {
      el.forceProcess.disabled = false;
      el.forceProcess.textContent = 'Traiter maintenant';
    }
  });
  
  // Time selector — auto-save
  el.closeAfter.addEventListener('change', async () => {
    el.customTimeContainer.style.display = 
      el.closeAfter.value === 'custom' ? 'block' : 'none';
    
    if (el.closeAfter.value !== 'custom') {
      await saveConfig(el);
      showStatus(el, '✅ Délai mis à jour', 'success');
    }
  });
  
  // Custom time inputs — auto-save on blur
  el.customHours.addEventListener('change', async () => {
    await saveConfig(el);
    showStatus(el, '✅ Délai mis à jour', 'success');
  });
  el.customMinutes.addEventListener('change', async () => {
    await saveConfig(el);
    showStatus(el, '✅ Délai mis à jour', 'success');
  });
  
  // Toggle switches — auto-save immediately
  el.enabled.addEventListener('change', async () => {
    updateControlsState(el);
    await saveConfig(el);
    showStatus(el, el.enabled.checked ? '✅ Extension activée' : '⏸️ Extension désactivée', 'success');
    setTimeout(() => updateStats(el), 500);
  });
  
  el.discardPinned.addEventListener('change', async () => {
    await saveConfig(el);
    showStatus(el, '✅ Option mise à jour', 'success');
  });
  
  el.excludeAudible.addEventListener('change', async () => {
    await saveConfig(el);
    showStatus(el, '✅ Option mise à jour', 'success');
  });
}

// ─── Update UI from config ────────────────────────────────────────────────
function updateUI(el) {
  el.enabled.checked = currentConfig.enabled;
  el.discardPinned.checked = currentConfig.discardPinnedTabs;
  el.excludeAudible.checked = currentConfig.excludeAudibleTabs;
  
  // Time selector
  const minutes = currentConfig.closeAfterMinutes;
  const option = el.closeAfter.querySelector(`option[value="${minutes}"]`);
  
  if (option) {
    el.closeAfter.value = String(minutes);
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
  
  updateControlsState(el);
}

// ─── Toggle controls based on enabled state ───────────────────────────────
function updateControlsState(el) {
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
function showStatus(el, message, type = 'info') {
  el.statusMessage.textContent = message;
  el.statusMessage.className = `status-message ${type}`;
  
  const timeout = type === 'error' ? 5000 : 2000;
  setTimeout(() => {
    el.statusMessage.className = 'status-message';
  }, timeout);
}