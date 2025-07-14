/**
 * FFTabClose - Popup Script
 * Handles popup UI interactions and communication with background script
 * 
 * Version 2.0.1 (Security Enhanced)
 * Last updated: 14 juillet 2025
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

// Fonction pour charger les traductions avec validation
document.addEventListener('DOMContentLoaded', function() {
  try {
    if (typeof browser !== 'undefined' && browser.i18n) {
      // Traduire les éléments par ID avec sanitization
      const elementsToTranslate = {
        "extensionName": "extensionName",
        "infoLink": "infoLinkText", // Ajout de la traduction du lien info
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
      
      // S'assurer que le lien d'info a le texte correct et est sécurisé
      const infoLink = document.getElementById("infoLink");
      if (infoLink) {
        infoLink.textContent = sanitizeHTML(browser.i18n.getMessage("infoLinkText") || "Info");
        // S'assurer que le lien reste dans l'extension (sécurité)
        infoLink.setAttribute("href", "../info/info.html");
      }
      
      // Configurer les événements
      document.getElementById("timeLimit").addEventListener("change", saveSettings);
      document.getElementById("closeTabsButton").addEventListener("click", closeOldTabs);
      
      // Charger les paramètres au démarrage
      loadSettings();
    }
  } catch (error) {
    console.error("Error loading translations:", error);
  }
});

// Fonction pour mettre à jour les statistiques
async function updateStats() {
  try {
    const stats = await browser.runtime.sendMessage({action: 'getTabStats'});
    document.getElementById("totalTabs").textContent = stats.totalTabs;
    document.getElementById("eligibleTabs").textContent = stats.eligibleTabs;
    
    // Formater l'âge de l'onglet le plus ancien
    document.getElementById("oldestTab").textContent = formatTimeForDisplay(stats.oldestTabAge || 0);
  } catch (error) {
    console.error("Error updating stats:", error);
  }
}

// Formater le temps pour l'affichage
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

// Fonction pour sauvegarder les paramètres
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

// Fonction pour fermer les onglets anciens
async function closeOldTabs() {
  try {
    document.getElementById("closeTabsButton").textContent = browser.i18n.getMessage("closingTabsProgress") || "Closing...";
    document.getElementById("closeTabsButton").disabled = true;
    
    await browser.runtime.sendMessage({action: 'closeOldTabs'});
    
    // Petit délai pour permettre l'actualisation des statistiques
    setTimeout(() => {
      updateStats();
      document.getElementById("closeTabsButton").textContent = browser.i18n.getMessage("closeTabsButton") || "Close Old Tabs Now";
      document.getElementById("closeTabsButton").disabled = false;
    }, 1000);
  } catch (error) {
    console.error("Error closing tabs:", error);
    document.getElementById("closeTabsButton").textContent = browser.i18n.getMessage("closeTabsButton") || "Close Old Tabs Now";
    document.getElementById("closeTabsButton").disabled = false;
  }
}

// Charger les paramètres actuels
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
