/**
 * FFTabClose - Popup Script
 * Handles popup UI interactions and communication with background script
 * 
 * Version 2.0.0
 */

// DOM Elements
const timeLimitSelect = document.getElementById('timeLimit');
const discardPinnedCheckbox = document.getElementById('discardPinned');
const excludeAudioCheckbox = document.getElementById('excludeAudio');
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
    discardPinnedCheckbox.checked = settings.discardPinnedTabs;
    excludeAudioCheckbox.checked = settings.excludeAudioTabs;
    
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
      timeLimit: parseInt(timeLimitSelect.value, 10),
      discardPinnedTabs: discardPinnedCheckbox.checked,
      excludeAudioTabs: excludeAudioCheckbox.checked
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
  // Replace all __MSG_ placeholders with localized strings
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    element.textContent = browser.i18n.getMessage(key);
  });
  
  // Replace all HTML content with localized strings
  const htmlContent = document.documentElement.innerHTML;
  document.documentElement.innerHTML = htmlContent.replace(
    /__MSG_(\w+)__/g,
    (match, key) => browser.i18n.getMessage(key) || match
  );
}

// Event listeners
function setupEventListeners() {
  timeLimitSelect.addEventListener('change', saveSettings);
  discardPinnedCheckbox.addEventListener('change', saveSettings);
  excludeAudioCheckbox.addEventListener('change', saveSettings);
  closeTabsButton.addEventListener('click', handleCloseTabsClick);
}

// Initialize popup
async function initializePopup() {
  // Apply internationalization
  applyI18n();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load settings and update UI
  await loadSettings();
}

// Start the popup
document.addEventListener('DOMContentLoaded', initializePopup);
