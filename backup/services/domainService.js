/**
 * FFTabClose - Domain Rules Service
 * Service pour gérer les règles de domaine spécifiques
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

import * as logger from '../common/logger.js';
import { extractDomain } from '../common/utils.js';
import { DOMAIN_RULES_KEY } from '../common/constants.js';

/**
 * Service de gestion des règles de domaine
 */
export class DomainRuleService {
  constructor() {
    this.rules = [];
    this.initialized = false;
  }
  
  /**
   * Initialise le service en chargeant les règles de domaine depuis le stockage
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.loadRules();
      this.initialized = true;
      logger.info(`Service de règles de domaine initialisé avec ${this.rules.length} règles`);
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du service de règles de domaine', error);
      this.rules = [];
      this.initialized = false;
    }
  }
  
  /**
   * Charge les règles de domaine depuis le stockage local
   * @returns {Promise<Array>} - Les règles chargées
   */
  async loadRules() {
    try {
      const storage = await browser.storage.local.get(DOMAIN_RULES_KEY);
      this.rules = storage[DOMAIN_RULES_KEY] || [];
      logger.debug(`Chargé ${this.rules.length} règles de domaine`);
      return this.rules;
    } catch (error) {
      logger.error('Erreur lors du chargement des règles de domaine', error);
      this.rules = [];
      return [];
    }
  }
  
  /**
   * Sauvegarde les règles de domaine dans le stockage local
   * @returns {Promise<void>}
   */
  async saveRules() {
    try {
      await browser.storage.local.set({ [DOMAIN_RULES_KEY]: this.rules });
      logger.debug(`Sauvegardé ${this.rules.length} règles de domaine`);
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde des règles de domaine', error);
    }
  }
  
  /**
   * Ajoute une nouvelle règle de domaine
   * @param {Object} rule - La règle à ajouter
   * @returns {Promise<void>}
   */
  async addRule(rule) {
    // Vérifier si une règle existe déjà pour ce domaine
    const existingRuleIndex = this.rules.findIndex(r => r.domain === rule.domain);
    
    if (existingRuleIndex >= 0) {
      // Mettre à jour la règle existante
      this.rules[existingRuleIndex] = rule;
      logger.debug(`Mis à jour la règle pour le domaine: ${rule.domain}`);
    } else {
      // Ajouter une nouvelle règle
      this.rules.push(rule);
      logger.debug(`Ajouté une nouvelle règle pour le domaine: ${rule.domain}`);
    }
    
    await this.saveRules();
  }
  
  /**
   * Supprime une règle de domaine
   * @param {string} domain - Le domaine de la règle à supprimer
   * @returns {Promise<void>}
   */
  async removeRule(domain) {
    const initialLength = this.rules.length;
    this.rules = this.rules.filter(rule => rule.domain !== domain);
    
    if (this.rules.length < initialLength) {
      logger.debug(`Supprimé la règle pour le domaine: ${domain}`);
      await this.saveRules();
    }
  }
  
  /**
   * Obtient toutes les règles de domaine
   * @returns {Array} - Les règles de domaine
   */
  getRules() {
    return this.rules;
  }
  
  /**
   * Obtient une règle spécifique par domaine
   * @param {string} domain - Le domaine à rechercher
   * @returns {Object|null} - La règle trouvée ou null
   */
  getRule(domain) {
    return this.rules.find(rule => rule.domain === domain) || null;
  }
  
  /**
   * Détermine si un onglet doit être traité et avec quel délai
   * @param {Object} tab - L'onglet à vérifier
   * @param {number} defaultTimeout - Le délai par défaut en millisecondes
   * @returns {Object} - { shouldProcess: boolean, timeout: number|null }
   */
  shouldProcessTab(tab, defaultTimeout) {
    // Vérifier que le service est initialisé
    if (!this.initialized) {
      return { shouldProcess: true, timeout: defaultTimeout };
    }
    
    // Extraire le domaine de l'URL de l'onglet
    const domain = extractDomain(tab.url);
    
    // Si aucun domaine ne peut être extrait, utiliser le comportement par défaut
    if (!domain) {
      return { shouldProcess: true, timeout: defaultTimeout };
    }
    
    // Rechercher une règle correspondant exactement au domaine
    let rule = this.getRule(domain);
    
    // Si aucune règle exacte n'est trouvée, rechercher des règles avec des wildcards
    if (!rule) {
      // Séparer le domaine en parties
      const domainParts = domain.split('.');
      
      // Essayer de trouver une règle avec wildcard qui correspond
      for (const currentRule of this.rules) {
        if (currentRule.domain.includes('*')) {
          const rulePattern = currentRule.domain
            .replace(/\./g, '\\.')  // Échapper les points
            .replace(/\*/g, '.*');  // Remplacer * par .*
          const regex = new RegExp(`^${rulePattern}$`);
          
          if (regex.test(domain)) {
            rule = currentRule;
            break;
          }
        }
      }
    }
    
    // Si une règle est trouvée, appliquer ses paramètres
    if (rule) {
      logger.debug(`Règle trouvée pour le domaine ${domain}: ${JSON.stringify(rule)}`);
      
      // Si la règle spécifie de ne jamais fermer
      if (rule.neverClose) {
        return { shouldProcess: false, timeout: null };
      }
      
      // Si la règle spécifie un délai personnalisé
      if (rule.customTimeout) {
        return { shouldProcess: true, timeout: rule.timeout || defaultTimeout };
      }
    }
    
    // Par défaut, traiter l'onglet avec le délai par défaut
    return { shouldProcess: true, timeout: defaultTimeout };
  }
}