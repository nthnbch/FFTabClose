/**
 * FFTabClose - Popup Script
 * Handles popup UI interactions and communication with background script
 * 
 * Version 3.1.0
 */

// Import domain rules UI functions
import { addDomainRule, loadDomainRules } from './domain-rules-ui.js';

// Helper function to sanitize text content (XSS protection)
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  
  // Create a temporary element
  const tempElement = document.createElement('div');
  // Set its text content (not innerHTML) which escapes HTML
  tempElement.textContent = str;
  // Return the escaped content
  return tempElement.textContent;
}

// Apply reduced motion preferences
function applyReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
  }
}

// State tracking
let popupInitialized = false;

// Initialize the popup UI
async function initializePopup() {
  if (popupInitialized) {
    return;
  }
  
  try {
    // Apply reduced motion settings
    applyReducedMotion();
    
    // Listen for changes in reduced motion preference
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', applyReducedMotion);
    
    if (typeof browser !== 'undefined' && browser.i18n) {
      // Translate UI elements by ID with sanitization
      const elementsToTranslate = {
        "extensionName": "extensionName",
        "infoLink": "infoLinkText", // Add translation for info link
        "timeLimitLabel": "timeLimitLabel",
        "timeTest": "time1min",
        "time15min": "time15min",
        "time30min": "time30min",
        "time1hour": "time1hour",
        "time2hours": "time2hours",
        "time4hours": "time4hours",
        "time8hours": "time8hours",
        "time12hours": "time12hours",
        "time24hours": "time24hours",
        "time48hours": "time48hours",
        "domainRulesLabel": "domainRulesLabel",
        "noDomainRules": "noDomainRulesText",
        "closeTabsButton": "closeTabsButton",
        "totalTabsLabel": "totalTabsLabel",
        "eligibleTabsLabel": "eligibleTabsLabel",
        "oldestTabLabel": "oldestTabLabel"
      };
      
      for (const [id, msgKey] of Object.entries(elementsToTranslate)) {
        const element = document.getElementById(id);
        if (element) {
          const translated = browser.i18n.getMessage(msgKey);
          if (translated) {
            // Sanitize translated text to prevent XSS
            element.textContent = sanitizeHTML(translated);
          }
        }
      }
      
      // Ensure info link has correct text and is secure
      const infoLink = document.getElementById("infoLink");
      if (infoLink) {
        infoLink.textContent = sanitizeHTML(browser.i18n.getMessage("infoLinkText") || "Info");
        // Ensure link stays within the extension (security best practice)
        infoLink.setAttribute("href", "../info/info.html");
      }
      
      // Set up event listeners
      document.getElementById("timeLimit").addEventListener("change", saveSettings);
      document.getElementById("addDomainRule").addEventListener("click", addDomainRule);
      
      // Load settings on startup
      await loadSettings();
      
      // Load domain rules
      await loadDomainRules();
      
      popupInitialized = true;
    }
  } catch (error) {
    console.error("Error initializing popup:", error);
  }
}

// Update tab statistics in the popup
async function updateStats() {
  try {
    const stats = await browser.runtime.sendMessage({action: 'getTabStats'});
    document.getElementById("totalTabs").textContent = stats.totalTabs;
    document.getElementById("eligibleTabs").textContent = stats.oldTabs || 0;
    
    // Format the age of the oldest tab
    document.getElementById("oldestTab").textContent = formatTimeForDisplay(stats.oldestTabAge || 0);
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

// Format time duration for display (milliseconds to human-readable format)
function formatTimeForDisplay(milliseconds) {
  if (milliseconds < 60000) {
    return `${Math.floor(milliseconds / 1000)} ${browser.i18n.getMessage('timeSec') || 'sec'}`;
  } else if (milliseconds < 3600000) { // Less than 1 hour
    const minutes = Math.floor(milliseconds / 60000);
    return `${minutes} ${browser.i18n.getMessage('timeMin') || 'min'}`;
  } else if (milliseconds < 86400000) { // Less than 24 hours
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    const hoursText = browser.i18n.getMessage('timeHours') || 'hrs';
    const minsText = browser.i18n.getMessage('timeMin') || 'min';
    return `${hours} ${hoursText}${minutes > 0 ? ` ${minutes} ${minsText}` : ''}`;
  } else {
    const days = Math.floor(milliseconds / 86400000);
    const hours = Math.floor((milliseconds % 86400000) / 3600000);
    const daysText = browser.i18n.getMessage('timeDays') || 'days';
    const hoursText = browser.i18n.getMessage('timeHours') || 'hrs';
    return `${days} ${daysText}${hours > 0 ? ` ${hours} ${hoursText}` : ''}`;
  }
}

// Save user preferences to storage
async function saveSettings() {
  try {
    const timeLimit = document.getElementById("timeLimit").value;
    await browser.runtime.sendMessage({
      action: 'updateSettings',
      settings: {
        timeLimit: parseInt(timeLimit)
      }
    });
    updateStats();
  } catch (error) {
    console.error("Error saving settings:", error);
  }
}

// Load current settings from storage
async function loadSettings() {
  try {
    const settings = await browser.runtime.sendMessage({action: 'getSettings'});
    if (settings && settings.timeLimit) {
      document.getElementById("timeLimit").value = settings.timeLimit.toString();
    }
    updateStats();
  } catch (error) {
    console.error("Error loading settings:", error);
  }
}

// Process tabs according to settings
async function processTabs(dryRun = false) {
  try {
    const stats = await browser.runtime.sendMessage({
      action: 'processTabs',
      dryRun
    });
    updateStats();
    return stats;
  } catch (error) {
    console.error("Error processing tabs:", error);
    return null;
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);

// Export functions for other modules
export {
  updateStats,
  saveSettings,
  loadSettings,
  processTabs
};
