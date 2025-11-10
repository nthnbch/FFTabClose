/**
 * FFTabClose - Popup Script
 * 
 * This script handles the popup UI for configuring the extension settings.
 */

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  closeAfterHours: 0.016667, // 1 minute (for testing)
  excludePinnedTabs: false // Don't close pinned tabs by default, just discard them
};

// Time options
const TIME_OPTIONS = {
  '0.016667': '1 minute (test)',
  '1': '1 heure',
  '8': '8 heures',
  '12': '12 heures',
  '24': '24 heures',
  'custom': 'Personnalisé'
};

// DOM elements
const elements = {
  settingsTitle: document.getElementById('settings-title'),
  enabled: document.getElementById('enabled'),
  autoCloseEnabledLabel: document.getElementById('auto-close-enabled-label'),
  timeSelector: document.getElementById('timeSelector'),
  customTimeContainer: document.getElementById('customTimeContainer'),
  customHours: document.getElementById('customHours'),
  customMinutes: document.getElementById('customMinutes'),
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
  
  // Set up the time selector
  setupTimeSelector();
  
  // Load and display current settings
  loadSettings();
  
  // Set up event listeners
  elements.saveButton.addEventListener('click', saveSettings);
  elements.timeSelector.addEventListener('change', handleTimeSelectorChange);
}

// Set text based on the user's locale
function setLocalizedText() {
  elements.settingsTitle.textContent = browser.i18n.getMessage('settings');
  elements.autoCloseEnabledLabel.textContent = browser.i18n.getMessage('auto_close_enabled');
  elements.closeAfterHoursLabel.textContent = browser.i18n.getMessage('close_after_hours');
  elements.excludePinnedTabsLabel.textContent = browser.i18n.getMessage('exclude_pinned_tabs');
  elements.saveButton.textContent = browser.i18n.getMessage('save_settings');
}

// Set up the time selector dropdown
function setupTimeSelector() {
  // The options are already in the HTML, so we don't need to add them here
  
  // Add event listener for showing/hiding custom time inputs
  elements.timeSelector.addEventListener('change', function() {
    if (this.value === 'custom') {
      elements.customTimeContainer.style.display = 'flex';
    } else {
      elements.customTimeContainer.style.display = 'none';
    }
  });
}

// Handle time selector changes
function handleTimeSelectorChange() {
  const value = elements.timeSelector.value;
  if (value !== 'custom') {
    // If a predefined value is selected, update the closeAfterHours value
    const hours = parseFloat(value);
    console.log(`Selected predefined time: ${hours} hours`);
  }
}

// Load settings from storage and populate the UI
async function loadSettings() {
  try {
    const result = await browser.storage.local.get('settings');
    const settings = result.settings || DEFAULT_SETTINGS;
    
    elements.enabled.checked = settings.enabled;
    elements.excludePinnedTabs.checked = settings.excludePinnedTabs !== undefined ? settings.excludePinnedTabs : DEFAULT_SETTINGS.excludePinnedTabs;
    
    // Set the time selector to the appropriate value
    const closeAfterHours = settings.closeAfterHours;
    
    // Check if the closeAfterHours matches one of our predefined options
    if (Object.keys(TIME_OPTIONS).includes(closeAfterHours.toString())) {
      elements.timeSelector.value = closeAfterHours.toString();
      elements.customTimeContainer.style.display = 'none';
    } else {
      // If not, use the custom option
      elements.timeSelector.value = 'custom';
      elements.customTimeContainer.style.display = 'flex';
      
      // Calculate hours and minutes
      const hours = Math.floor(closeAfterHours);
      const minutes = Math.round((closeAfterHours - hours) * 60);
      
      elements.customHours.value = hours;
      elements.customMinutes.value = minutes;
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('An error occurred while loading settings.', 'error');
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    let closeAfterHours;
    
    // Get time value based on selector choice
    if (elements.timeSelector.value === 'custom') {
      // Calculate hours from custom inputs
      const hours = parseInt(elements.customHours.value, 10) || 0;
      const minutes = parseInt(elements.customMinutes.value, 10) || 0;
      
      console.log(`Custom time: ${hours} hours and ${minutes} minutes`);
      
      // Convert to decimal hours
      closeAfterHours = hours + (minutes / 60);
      console.log(`Converted to decimal hours: ${closeAfterHours}`);
      
      // Validate
      if (closeAfterHours <= 0 && (hours <= 0 && minutes <= 0)) {
        showStatus('Veuillez saisir une durée valide (minimum 1 minute).', 'error');
        return;
      }
    } else {
      // Use the selected predefined value
      closeAfterHours = parseFloat(elements.timeSelector.value);
      console.log(`Selected predefined value: ${closeAfterHours} hours`);
    }
    
    const settings = {
      enabled: elements.enabled.checked,
      closeAfterHours: closeAfterHours,
      excludePinnedTabs: elements.excludePinnedTabs.checked
    };
    
    console.log('Saving settings:', settings);
    
    // Validate settings
    if (isNaN(settings.closeAfterHours) || settings.closeAfterHours <= 0) {
      showStatus('Veuillez saisir une durée valide.', 'error');
      return;
    }
    
    // Save to storage
    await browser.storage.local.set({ settings });
    console.log('Settings saved successfully');
    
    // Force a check of old tabs immediately
    try {
      const bg = await browser.runtime.getBackgroundPage();
      if (bg && bg.handleAlarm) {
        console.log('Triggering immediate tab check');
        await bg.handleAlarm({ name: 'checkOldTabs' });
      }
    } catch (err) {
      console.error('Could not trigger immediate check:', err);
    }
    
    showStatus('Paramètres enregistrés avec succès!', 'success');
    
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