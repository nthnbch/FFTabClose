/**
 * FFTabClose - Info Page Script
 * Handles internationalization for the info page
 */

document.addEventListener('DOMContentLoaded', function() {
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
        "infoDiscardHeading": "infoDiscardHeading", // Ajout de cette entrée manquante
        "infoDiscardDescription": "infoDiscardDescription", // Ajout de cette entrée manquante
        "infoPrivacy": "infoPrivacy",
        "infoPrivacyDescription": "infoPrivacyDescription",
        "permTabs": "permTabsDescription",
        "permStorage": "permStorageDescription",
        "permAlarms": "permAlarmsDescription"
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
