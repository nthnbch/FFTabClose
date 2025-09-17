/**
 * FFTabClose - Storage Manager Service
 * Service pour gérer les opérations de stockage local
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

import * as logger from '../common/logger.js';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '../common/constants.js';

/**
 * Service de gestion du stockage
 */
export class StorageService {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.initialized = false;
  }
  
  /**
   * Initialise le service en chargeant les paramètres depuis le stockage
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.loadSettings();
      this.initialized = true;
      logger.info('Service de stockage initialisé');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du service de stockage', error);
      this.settings = { ...DEFAULT_SETTINGS };
      this.initialized = false;
    }
  }
  
  /**
   * Charge les paramètres depuis le stockage local
   * @returns {Promise<Object>} - Les paramètres chargés
   */
  async loadSettings() {
    try {
      const storage = await browser.storage.local.get(SETTINGS_KEY);
      this.settings = { ...DEFAULT_SETTINGS, ...(storage[SETTINGS_KEY] || {}) };
      logger.debug('Paramètres chargés depuis le stockage local', this.settings);
      return this.settings;
    } catch (error) {
      logger.error('Erreur lors du chargement des paramètres', error);
      this.settings = { ...DEFAULT_SETTINGS };
      return this.settings;
    }
  }
  
  /**
   * Sauvegarde les paramètres dans le stockage local
   * @param {Object} newSettings - Les nouveaux paramètres à sauvegarder
   * @returns {Promise<Object>} - Les paramètres mis à jour
   */
  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await browser.storage.local.set({ [SETTINGS_KEY]: this.settings });
      logger.debug('Paramètres sauvegardés dans le stockage local', this.settings);
      return this.settings;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde des paramètres', error);
      return this.settings;
    }
  }
  
  /**
   * Obtient les paramètres actuels
   * @returns {Object} - Les paramètres actuels
   */
  getSettings() {
    return this.settings;
  }
  
  /**
   * Met à jour un paramètre spécifique
   * @param {string} key - La clé du paramètre à mettre à jour
   * @param {any} value - La nouvelle valeur
   * @returns {Promise<Object>} - Les paramètres mis à jour
   */
  async updateSetting(key, value) {
    const newSettings = { ...this.settings };
    newSettings[key] = value;
    return this.saveSettings(newSettings);
  }
  
  /**
   * Réinitialise les paramètres aux valeurs par défaut
   * @returns {Promise<Object>} - Les paramètres réinitialisés
   */
  async resetSettings() {
    try {
      this.settings = { ...DEFAULT_SETTINGS };
      await browser.storage.local.set({ [SETTINGS_KEY]: this.settings });
      logger.debug('Paramètres réinitialisés aux valeurs par défaut');
      return this.settings;
    } catch (error) {
      logger.error('Erreur lors de la réinitialisation des paramètres', error);
      return this.settings;
    }
  }
  
  /**
   * Nettoie le stockage local en supprimant les entrées obsolètes
   * @param {Array<number>} validTabIds - Liste des IDs d'onglets valides
   * @param {Object} tabTimestamps - Objet contenant les timestamps des onglets
   * @returns {Promise<Object>} - Les timestamps nettoyés
   */
  async cleanupTabTimestamps(validTabIds, tabTimestamps) {
    try {
      // Convertir en Set pour des recherches plus rapides
      const validTabIdsSet = new Set(validTabIds);
      
      // Identifier les entrées à supprimer
      const keysToRemove = [];
      for (const tabId in tabTimestamps) {
        if (!validTabIdsSet.has(parseInt(tabId, 10))) {
          keysToRemove.push(tabId);
        }
      }
      
      // Supprimer les entrées obsolètes
      for (const tabId of keysToRemove) {
        delete tabTimestamps[tabId];
      }
      
      logger.debug(`Nettoyage des timestamps : ${keysToRemove.length} entrées obsolètes supprimées`);
      return tabTimestamps;
    } catch (error) {
      logger.error('Erreur lors du nettoyage des timestamps', error);
      return tabTimestamps;
    }
  }
}