/**
 * FFTabClose - Info Page Script
 * Handles internationalization for the info page
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

// Load and display changelog information
function displayChangelog() {
  try {
    if (typeof browser !== 'undefined' && browser.runtime) {
      // Request changelog data from background script
      browser.runtime.sendMessage({ action: 'getChangelog' }).then(changelog => {
        if (changelog && changelog.version) {
          const changelogSection = document.getElementById('changelog-section');
          if (changelogSection) {
            // Create version heading
            const versionHeading = document.createElement('h2');
            versionHeading.textContent = `Version ${sanitizeHTML(changelog.version)} (${sanitizeHTML(changelog.date)})`;
            changelogSection.appendChild(versionHeading);
            
            // Create list of changes
            const changesList = document.createElement('ul');
            changesList.className = 'changelog-list';
            
            if (Array.isArray(changelog.changes)) {
              changelog.changes.forEach(change => {
                const changeItem = document.createElement('li');
                changeItem.textContent = sanitizeHTML(change);
                changesList.appendChild(changeItem);
              });
            }
            
            changelogSection.appendChild(changesList);
            changelogSection.style.display = 'block';
          }
        }
      }).catch(error => {
        console.error("Error loading changelog:", error);
      });
    }
  } catch (error) {
    console.error("Error in displayChangelog:", error);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Display changelog information
  displayChangelog();
  
  try {
    if (typeof browser !== 'undefined' && browser.i18n) {
      // Définir la langue du document selon la locale courante
      const locale = browser.i18n.getUILanguage();
      document.documentElement.lang = locale;
      
      // Définir le titre de la page
      document.title = browser.i18n.getMessage("infoPageTitle") || "FFTabClose - About & Help";
      
      // Traduire les éléments par ID
      const elementsToTranslate = {
        "infoHeading": "infoHeading",
        "infoFeatures": "infoFeatures",
        "infoDescription": "infoDescription",
        "infoTimerHeading": "infoTimerHeading",
        "infoTimerDescription": "infoTimerDescription",
        "infoExclusionsHeading": "infoExclusionsHeading",
        "infoExclusionsDescription": "infoExclusionsDescription",
        "infoDiscardHeading": "infoDiscardHeading",
        "infoDiscardDescription": "infoDiscardDescription",
        "infoPrivacy": "infoPrivacy",
        "infoPrivacyDescription": "infoPrivacyDescription",
        "permTabs": "permTabsDescription",
        "permStorage": "permStorageDescription",
        "permAlarms": "permAlarmsDescription",
        "permContextualIdentities": "permContextualIdentitiesDescription",
        "permCookies": "permCookiesDescription"
      };
      
      // Appliquer toutes les traductions
      for (const [id, msgKey] of Object.entries(elementsToTranslate)) {
        const element = document.getElementById(id);
        if (element) {
          const translated = browser.i18n.getMessage(msgKey);
          if (translated) {
            element.textContent = translated;
          } else {
            console.warn(`Missing translation for key: ${msgKey}`);
          }
        } else {
          console.warn(`Element with ID not found: ${id}`);
        }
      }
    }
  } catch (error) {
    console.error("Error loading translations:", error);
  }
});
