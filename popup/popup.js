/**
 * FFTabClose - Popup Script
 * Handles popup UI interactions and communication with background script
 * 
 * Version 3.0.0
 * Last updated: 18 July 2025
 */

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

// Import domain rules UI functions
import { addDomainRule, loadDomainRules } from './domain-rules-ui.js';

// Apply reduced motion preferences
function applyReducedMotion() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  if (prefersReducedMotion) {
    document.documentElement.setAttribute('data-reduced-motion', 'true');
  } else {
    document.documentElement.removeAttribute('data-reduced-motion');
  }
}

// Load translations and initialize the UI
document.addEventListener('DOMContentLoaded', function() {
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
      loadSettings();
      
      // Load domain rules
      loadDomainRules();
    }
  } catch (error) {
    console.error("Error loading translations:", error);
  }
});

// Update tab statistics in the popup
async function updateStats() {
  try {
    const stats = await browser.runtime.sendMessage({action: 'getTabStats'});
    document.getElementById("totalTabs").textContent = stats.totalTabs;
    document.getElementById("eligibleTabs").textContent = stats.eligibleTabs;
    
    // Format the age of the oldest tab
    document.getElementById("oldestTab").textContent = formatTimeForDisplay(stats.oldestTabAge || 0);
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

// Format time duration for display (minutes to human-readable format)
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

// Function to close old tabs (not used directly by UI anymore)
async function closeOldTabs() {
  try {
    await browser.runtime.sendMessage({action: 'closeOldTabs'});
    updateStats();
  } catch (error) {
    console.error("Error closing tabs:", error);
  }
}
