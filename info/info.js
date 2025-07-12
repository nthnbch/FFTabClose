/**
 * FFTabClose - Info Page Script
 * Handles internationalization for the info page
 */

document.addEventListener('DOMContentLoaded', function() {
  try {
    if (typeof browser !== 'undefined' && browser.i18n) {
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
        "infoPrivacy": "infoPrivacy",
        "infoPrivacyDescription": "infoPrivacyDescription"
      };
      
      for (const [id, msgKey] of Object.entries(elementsToTranslate)) {
        const element = document.getElementById(id);
        if (element) {
          const translated = browser.i18n.getMessage(msgKey);
          if (translated) {
            element.textContent = translated;
          }
        }
      }
    }
  } catch (error) {
    console.error("Error loading translations:", error);
  }
});
