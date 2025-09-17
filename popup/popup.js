/**
 * Tab Auto Closer - Popup Script
 * 
 * This script handles the popup UI for configuring the extension settings.
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  closeAfterHours: 12,
  excludePinnedTabs: true
};

// DOM elements
const elements = {
  settingsTitle: document.getElementById('settings-title'),
  enabled: document.getElementById('enabled'),
  autoCloseEnabledLabel: document.getElementById('auto-close-enabled-label'),
  closeAfterHours: document.getElementById('closeAfterHours'),
  closeAfterHoursLabel: document.getElementById('close-after-hours-label'),
  excludePinnedTabs: document.getElementById('excludePinnedTabs'),
  excludePinnedTabsLabel: document.getElementById('exclude-pinned-tabs-label'),
  saveButton: document.getElementById('save-button'),
  status: document.getElementById('status')
};

// Initialize the popup
function initPopup() {
  // Set localized text
  setLocalizedText();
  
  // Load and display current settings
  loadSettings();
  
  // Set up event listeners
  elements.saveButton.addEventListener('click', saveSettings);
}

// Set text based on the user's locale
function setLocalizedText() {
  elements.settingsTitle.textContent = browser.i18n.getMessage('settings');
  elements.autoCloseEnabledLabel.textContent = browser.i18n.getMessage('auto_close_enabled');
  elements.closeAfterHoursLabel.textContent = browser.i18n.getMessage('close_after_hours');
  elements.excludePinnedTabsLabel.textContent = browser.i18n.getMessage('exclude_pinned_tabs');
  elements.saveButton.textContent = browser.i18n.getMessage('save_settings');
}

// Load settings from storage and populate the UI
async function loadSettings() {
  try {
    const result = await browser.storage.local.get('settings');
    const settings = result.settings || DEFAULT_SETTINGS;
    
    elements.enabled.checked = settings.enabled;
    elements.closeAfterHours.value = settings.closeAfterHours;
    elements.excludePinnedTabs.checked = settings.excludePinnedTabs;
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('An error occurred while loading settings.', 'error');
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      enabled: elements.enabled.checked,
      closeAfterHours: parseInt(elements.closeAfterHours.value, 10),
      excludePinnedTabs: elements.excludePinnedTabs.checked
    };
    
    // Validate settings
    if (isNaN(settings.closeAfterHours) || settings.closeAfterHours < 1) {
      showStatus('Please enter a valid number of hours (minimum 1).', 'error');
      return;
    }
    
    // Save to storage
    await browser.storage.local.set({ settings });
    
    showStatus('Settings saved successfully!', 'success');
    
    // Close the popup after a short delay
    setTimeout(() => window.close(), 1500);
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('An error occurred while saving settings.', 'error');
  }
}

// Show a status message to the user
function showStatus(message, type) {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  
  // Hide the message after 3 seconds
  if (type === 'success') {
    setTimeout(() => {
      elements.status.className = 'status';
    }, 3000);
  }
}

// Initialize the popup when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initPopup);