/**
 * FFTabClose - Content Security Policy Configuration
 * Configuration de sécurité pour l'extension
 */

// Configuration des permissions CSP
const CSP_CONFIG = {
  // Interdire l'exécution de code inline
  'script-src': "'self'",
  'style-src': "'self'",
  
  // Interdire les connexions externes non autorisées
  'connect-src': "'self'",
  
  // Interdire les ressources externes
  'img-src': "'self' data:",
  'font-src': "'self'",
  
  // Interdire les workers et les objets
  'worker-src': "'none'",
  'object-src': "'none'",
  
  // Interdire les frames
  'frame-src': "'none'",
  
  // Politique par défaut restrictive
  'default-src': "'none'"
};

// Validation des URLs
const ALLOWED_PROTOCOLS = ['moz-extension:', 'chrome-extension:'];

/**
 * Valider une URL
 */
function validateURL(url) {
  try {
    const parsed = new URL(url);
    return ALLOWED_PROTOCOLS.includes(parsed.protocol);
  } catch (error) {
    return false;
  }
}

/**
 * Nettoyer une chaîne de caractères
 */
function sanitizeString(str) {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str
    .replace(/[<>]/g, '') // Supprimer les balises HTML
    .replace(/javascript:/gi, '') // Supprimer les protocoles JavaScript
    .replace(/on\w+=/gi, '') // Supprimer les gestionnaires d'événements
    .trim();
}

/**
 * Valider un nombre dans une plage
 */
function validateNumber(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) {
    return false;
  }
  
  return value >= min && value <= max;
}

/**
 * Valider un ID de tab
 */
function validateTabId(tabId) {
  return typeof tabId === 'number' && tabId > 0 && Number.isInteger(tabId);
}

/**
 * Valider un timestamp
 */
function validateTimestamp(timestamp) {
  const now = Date.now();
  return typeof timestamp === 'number' && 
         timestamp > 0 && 
         timestamp <= now &&
         (now - timestamp) <= (30 * 24 * 60 * 60 * 1000); // 30 jours max
}

// Export des fonctions de validation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CSP_CONFIG,
    validateURL,
    sanitizeString,
    validateNumber,
    validateTabId,
    validateTimestamp
  };
}
