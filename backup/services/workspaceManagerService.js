/**
 * FFTabClose - Workspace Manager Service
 * Service pour gérer les interactions entre les espaces de travail
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

import * as logger from '../common/logger.js';
import { zenService } from './zenService.js';

/**
 * Service de gestion des espaces de travail
 */
export class WorkspaceManagerService {
  constructor() {
    this.workspaces = [];
    this.initialized = false;
  }
  
  /**
   * Initialise le service en détectant tous les espaces de travail
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.refreshWorkspaces();
      this.initialized = true;
      logger.info(`Service de gestion des espaces initialisé avec ${this.workspaces.length} espaces`);
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation du service de gestion des espaces', error);
      this.workspaces = [];
      this.initialized = false;
    }
  }
  
  /**
   * Rafraîchit la liste des espaces de travail
   * @returns {Promise<Array>} - Liste mise à jour des espaces de travail
   */
  async refreshWorkspaces() {
    try {
      this.workspaces = await zenService.getAllWorkspaces();
      logger.debug(`Espaces de travail rafraîchis : ${this.workspaces.length} espaces détectés`);
      return this.workspaces;
    } catch (error) {
      logger.error('Erreur lors du rafraîchissement des espaces de travail', error);
      return this.workspaces;
    }
  }
  
  /**
   * Obtient tous les espaces de travail
   * @returns {Array} - Liste des espaces de travail
   */
  getWorkspaces() {
    return this.workspaces;
  }
  
  /**
   * Obtient un espace de travail par son ID
   * @param {string} id - ID de l'espace de travail
   * @returns {Object|null} - L'espace de travail ou null s'il n'est pas trouvé
   */
  getWorkspaceById(id) {
    return this.workspaces.find(workspace => workspace.id === id) || null;
  }
  
  /**
   * Obtient tous les onglets pour un espace de travail spécifique
   * @param {string} workspaceId - ID de l'espace de travail
   * @returns {Promise<Array>} - Liste des onglets dans cet espace de travail
   */
  async getTabsForWorkspace(workspaceId) {
    try {
      const allTabs = await zenService.getAllTabsAcrossWorkspaces();
      
      // Filtrer les onglets pour cet espace de travail
      const workspaceTabs = allTabs.filter(tab => tab.cookieStoreId === workspaceId);
      
      logger.debug(`Obtenu ${workspaceTabs.length} onglets pour l'espace de travail ${workspaceId}`);
      return workspaceTabs;
    } catch (error) {
      logger.error(`Erreur lors de l'obtention des onglets pour l'espace de travail ${workspaceId}`, error);
      return [];
    }
  }
  
  /**
   * Vérifie si un onglet appartient à un espace de travail Zen
   * @param {Object} tab - L'onglet à vérifier
   * @returns {boolean} - true si l'onglet est dans un espace Zen, false sinon
   */
  isTabInZenWorkspace(tab) {
    if (!tab || !tab.cookieStoreId) return false;
    
    // Chercher l'espace de travail correspondant au cookieStoreId de l'onglet
    const workspace = this.getWorkspaceById(tab.cookieStoreId);
    
    // Si l'espace de travail est trouvé, vérifier s'il s'agit d'un espace Zen
    if (workspace) {
      return workspace.isZen;
    }
    
    // Si l'espace de travail n'est pas trouvé, vérifier avec les patterns Zen
    return tab.cookieStoreId.includes('zen') || 
           tab.cookieStoreId.includes('container') || 
           tab.cookieStoreId.includes('userContext');
  }
  
  /**
   * Ferme tous les onglets inactifs dans un espace de travail spécifique
   * @param {string} workspaceId - ID de l'espace de travail
   * @param {Object} tabManager - Instance du service TabManagerService
   * @param {number} timeLimit - Limite de temps en millisecondes
   * @param {Function} shouldProcessTabFn - Fonction qui détermine si un onglet doit être traité
   * @returns {Promise<Object>} - Statistiques sur les opérations effectuées
   */
  async closeInactiveTabsInWorkspace(workspaceId, tabManager, timeLimit, shouldProcessTabFn) {
    const stats = {
      closed: 0,
      discarded: 0,
      skipped: 0
    };
    
    try {
      // Obtenir tous les onglets pour cet espace de travail
      const workspaceTabs = await this.getTabsForWorkspace(workspaceId);
      
      // Obtenir tous les onglets actifs
      const allActiveTabsIds = new Set((await tabManager.getAllActiveTabsAcrossWorkspaces()).map(tab => tab.id));
      
      const now = Date.now();
      
      // Traiter chaque onglet
      for (const tab of workspaceTabs) {
        // Vérifier si l'onglet est actif
        if (allActiveTabsIds.has(tab.id)) {
          stats.skipped++;
          continue;
        }
        
        // Vérifier les règles de domaine
        let shouldProcess = true;
        let timeout = timeLimit;
        
        if (shouldProcessTabFn) {
          const result = shouldProcessTabFn(tab, timeLimit);
          shouldProcess = result.shouldProcess;
          timeout = result.timeout !== null ? result.timeout : timeLimit;
        }
        
        // Si le domaine est configuré pour ne jamais être fermé, passer à l'onglet suivant
        if (!shouldProcess) {
          stats.skipped++;
          continue;
        }
        
        // Vérifier l'âge de l'onglet
        const tabAge = now - (tabManager.tabTimestamps[tab.id] || now);
        const tabTimeout = timeout !== null ? timeout : timeLimit;
        
        if (tabAge < tabTimeout) {
          stats.skipped++;
          continue;
        }
        
        // Gérer les onglets audio
        if (tab.audible) {
          stats.skipped++;
          continue;
        }
        
        // Gérer les onglets épinglés
        if (tab.pinned) {
          if (!tab.discarded) {
            const discarded = await tabManager.discardTabSafely(tab.id);
            if (discarded) {
              stats.discarded++;
            } else {
              stats.skipped++;
            }
          } else {
            stats.skipped++;
          }
          continue;
        }
        
        // Fermer l'onglet
        const closed = await tabManager.closeTabSafely(tab.id);
        if (closed) {
          stats.closed++;
        } else {
          stats.skipped++;
        }
      }
      
      logger.info(`Espace de travail ${workspaceId} : ${stats.closed} onglets fermés, ${stats.discarded} déchargés, ${stats.skipped} ignorés`);
      return stats;
    } catch (error) {
      logger.error(`Erreur lors de la fermeture des onglets inactifs dans l'espace de travail ${workspaceId}`, error);
      return stats;
    }
  }
  
  /**
   * Ferme les onglets inactifs dans tous les espaces de travail
   * @param {Object} tabManager - Instance du service TabManagerService
   * @param {number} timeLimit - Limite de temps en millisecondes
   * @param {Function} shouldProcessTabFn - Fonction qui détermine si un onglet doit être traité
   * @returns {Promise<Object>} - Statistiques sur les opérations effectuées
   */
  async closeInactiveTabsInAllWorkspaces(tabManager, timeLimit, shouldProcessTabFn) {
    // Rafraîchir les espaces de travail pour être sûr d'avoir la liste la plus à jour
    await this.refreshWorkspaces();
    
    const globalStats = {
      closed: 0,
      discarded: 0,
      skipped: 0,
      workspaces: 0
    };
    
    // Traiter chaque espace de travail
    for (const workspace of this.workspaces) {
      const stats = await this.closeInactiveTabsInWorkspace(
        workspace.id, 
        tabManager, 
        timeLimit, 
        shouldProcessTabFn
      );
      
      globalStats.closed += stats.closed;
      globalStats.discarded += stats.discarded;
      globalStats.skipped += stats.skipped;
      globalStats.workspaces++;
    }
    
    logger.info(`Tous les espaces de travail (${globalStats.workspaces}) : ${globalStats.closed} onglets fermés, ${globalStats.discarded} déchargés, ${globalStats.skipped} ignorés`);
    return globalStats;
  }
}