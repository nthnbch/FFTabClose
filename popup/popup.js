/**
 * FFTabClose - Popup Script
 * Handles popup UI interactions and communication with background script
 * 
 * Version 2.0.0
 */

// DOM Elements
const timeLimitSelect = document.getElementById('timeLimit');
const closeTabsButton = document.getElementById('closeTabsButton');
const totalTabsElement = document.getElementById('totalTabs');
const eligibleTabsElement = document.getElementById('eligibleTabs');
const oldestTabElement = document.getElementById('oldestTab');

// Utility functions
function formatTimeForDisplay(minutes) {
  if (minutes < 60) {
    return `${minutes} ${browser.i18n.getMessage('timeMin')}`;
  } else if (minutes < 1440) { // Less than 24 hours
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} ${browser.i18n.getMessage('timeHours')}${mins > 0 ? ` ${mins} ${browser.i18n.getMessage('timeMin')}` : ''}`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return `${days} ${browser.i18n.getMessage('timeDays')}${hours > 0 ? ` ${hours} ${browser.i18n.getMessage('timeHours')}` : ''}`;
  }
}

// Load settings from background script
async function loadSettings() {
  try {
    const settings = await browser.runtime.sendMessage({ action: 'getSettings' });
    
    // Apply settings to UI
    timeLimitSelect.value = settings.timeLimit.toString();
    
    // Update stats
    updateStats();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

// Save settings to background script
async function saveSettings() {
  try {
    const settings = {
      timeLimit: parseInt(timeLimitSelect.value, 10)
    };
    
    await browser.runtime.sendMessage({ 
      action: 'updateSettings', 
      settings: settings 
    });
    
    // Update stats after settings change
    updateStats();
  } catch (error) {
    console.error('Error saving settings:', error);
  }
}

// Update tab statistics display
async function updateStats() {
  try {
    const stats = await browser.runtime.sendMessage({ action: 'getTabStats' });
    
    totalTabsElement.textContent = stats.totalTabs;
    eligibleTabsElement.textContent = stats.eligibleTabs;
    oldestTabElement.textContent = formatTimeForDisplay(stats.oldestTabAge);
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Handle manual close button click
async function handleCloseTabsClick() {
  try {
    closeTabsButton.disabled = true;
    closeTabsButton.textContent = browser.i18n.getMessage('closingTabsProgress');
    
    const stats = await browser.runtime.sendMessage({ action: 'closeOldTabs' });
    
    // Update UI with new stats
    totalTabsElement.textContent = stats.totalTabs;
    eligibleTabsElement.textContent = stats.eligibleTabs;
    oldestTabElement.textContent = formatTimeForDisplay(stats.oldestTabAge);
    
    // Reset button after brief delay
    setTimeout(() => {
      closeTabsButton.disabled = false;
      closeTabsButton.textContent = browser.i18n.getMessage('closeTabsButton');
    }, 1000);
  } catch (error) {
    console.error('Error closing tabs:', error);
    closeTabsButton.disabled = false;
    closeTabsButton.textContent = browser.i18n.getMessage('closeTabsButton');
  }
}

// Apply internationalization to the UI
function applyI18n() {
  // Set text content for elements with direct messages
  document.getElementById('extensionName').textContent = browser.i18n.getMessage('extensionName');
  document.getElementById('timeLimitLabel').textContent = browser.i18n.getMessage('timeLimitLabel');
  document.getElementById('closeTabsButton').textContent = browser.i18n.getMessage('closeTabsButton');
  document.getElementById('totalTabsLabel').textContent = browser.i18n.getMessage('totalTabsLabel');
  document.getElementById('eligibleTabsLabel').textContent = browser.i18n.getMessage('eligibleTabsLabel');
  document.getElementById('oldestTabLabel').textContent = browser.i18n.getMessage('oldestTabLabel');
  
  // Set text for dropdown options
  document.getElementById('time1min').textContent = browser.i18n.getMessage('time1min');
  document.getElementById('time15min').textContent = browser.i18n.getMessage('time15min');
  document.getElementById('time30min').textContent = browser.i18n.getMessage('time30min');
  document.getElementById('time1hour').textContent = browser.i18n.getMessage('time1hour');
  document.getElementById('time2hours').textContent = browser.i18n.getMessage('time2hours');
  document.getElementById('time4hours').textContent = browser.i18n.getMessage('time4hours');
  document.getElementById('time8hours').textContent = browser.i18n.getMessage('time8hours');
  document.getElementById('time12hours').textContent = browser.i18n.getMessage('time12hours');
  document.getElementById('time24hours').textContent = browser.i18n.getMessage('time24hours');
  document.getElementById('time48hours').textContent = browser.i18n.getMessage('time48hours');
}

// Event listeners
function setupEventListeners() {
  timeLimitSelect.addEventListener('change', saveSettings);
  closeTabsButton.addEventListener('click', handleCloseTabsClick);
}

// Initialize popup
async function initializePopup() {
  applyI18n();
  await loadSettings();
  setupEventListeners();
}

// Run initialization when DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializePopup);
