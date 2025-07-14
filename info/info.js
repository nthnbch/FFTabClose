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

// Helper function for logging with locale info
function logWithLocale(message, ...args) {
  const locale = browser?.i18n?.getUILanguage() || 'unknown';
  console.log(`[${locale}] ${message}`, ...args);
}

// Load and display changelog information
function displayChangelog() {
  try {
    // Use static changelog if already in the DOM
    const changelogContent = document.getElementById('changelog-content');
    if (changelogContent) {
      logWithLocale("Using static changelog content");
      return; // Static content exists, no need to fetch dynamic content
    }
    
    if (typeof browser !== 'undefined' && browser.runtime) {
      // Request changelog data from background script
      browser.runtime.sendMessage({ action: 'getChangelog' }).then(changelog => {
        if (changelog && changelog.version) {
          const changelogSection = document.getElementById('changelog-section');
          if (changelogSection) {
            // Create content container
            const changelogContent = document.createElement('div');
            changelogContent.id = 'changelog-content';
            
            // Create version heading
            const versionHeading = document.createElement('h3');
            versionHeading.textContent = `Version ${sanitizeHTML(changelog.version)} (${sanitizeHTML(changelog.date)})`;
            changelogContent.appendChild(versionHeading);
            
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
            
            changelogContent.appendChild(changesList);
            changelogSection.appendChild(changelogContent);
            changelogSection.style.display = 'block';
            
            logWithLocale("Dynamic changelog loaded");
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
  try {
    if (typeof browser !== 'undefined' && browser.i18n) {
      // Définir la langue du document selon la locale courante
      const locale = browser.i18n.getUILanguage();
      document.documentElement.lang = locale;
      logWithLocale(`Setting document language to: ${locale}`);
      
      // Définir le titre de la page
      const pageTitle = browser.i18n.getMessage("infoPageTitle");
      if (pageTitle) {
        document.title = pageTitle;
      } else {
        document.title = "FFTabClose - About & Help";
        logWithLocale("Using fallback page title");
      }
      
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
      let translationsApplied = 0;
      let missingTranslations = 0;
      
      for (const [id, msgKey] of Object.entries(elementsToTranslate)) {
        const element = document.getElementById(id);
        if (element) {
          const translated = browser.i18n.getMessage(msgKey);
          if (translated) {
            element.textContent = translated;
            translationsApplied++;
          } else {
            missingTranslations++;
            logWithLocale(`Missing translation for key: ${msgKey}`);
          }
        } else {
          logWithLocale(`Element with ID not found: ${id}`);
        }
      }
      
      logWithLocale(`Applied ${translationsApplied} translations, ${missingTranslations} missing`);
    } else {
      console.warn("browser.i18n API not available");
    }
  } catch (error) {
    console.error("Error loading translations:", error);
  }
  
  // Display changelog information - do this after translations
  displayChangelog();
});
