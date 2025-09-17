/**
 * FFTabClose - Background Script
 * Script principal pour la gestion des onglets et leur fermeture automatique
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

import * as logger from '../common/logger.js';
import { ALARM_NAME, UPDATE_TIMESTAMPS_ALARM, CHECK_INTERVAL } from '../common/constants.js';
import { getBrowserInfo } from '../common/utils.js';
import { TabManagerService } from '../services/tabManagerService.js';
import { StorageService } from '../services/storageService.js';
import { DomainRuleService } from '../services/domainService.js';
import { WorkspaceManagerService } from '../services/workspaceManagerService.js';
import { zenService } from '../services/zenService.js';

// Instanciation des services
const tabManager = new TabManagerService();
const storageService = new StorageService();
const domainRuleService = new DomainRuleService();
const workspaceManager = new WorkspaceManagerService();

// Initialisation de l'extension
async function initialize() {
  try {
    // Configurer le logger
    if (process.env.NODE_ENV === 'production') {
      logger.setLogLevel('info');
    } else {
      logger.setLogLevel('debug');
    }
    
    // Journaliser les informations sur le navigateur
    const browserInfo = await getBrowserInfo();
    logger.info(`Navigateur: ${browserInfo.browser.name} ${browserInfo.browser.version}`);
    logger.info(`Plateforme: ${browserInfo.platform.os} ${browserInfo.platform.arch}`);
    
    // Initialiser les services
    await storageService.initialize();
    await tabManager.initialize();
    await domainRuleService.initialize();
    await workspaceManager.initialize();
    
    // Détecter les espaces de travail
    const workspaces = workspaceManager.getWorkspaces();
    logger.info(`Détecté ${workspaces.length} espaces de travail`);
    
    // Configurer les alarmes pour les vérifications périodiques
    browser.alarms.create(ALARM_NAME, { periodInMinutes: CHECK_INTERVAL });
    browser.alarms.create(UPDATE_TIMESTAMPS_ALARM, { periodInMinutes: 0.25 }); // Toutes les 15 secondes
    
    // Enregistrer tous les onglets actuels
    await tabManager.recordAllCurrentTabs();
    
    // Exécuter la vérification initiale si activée
    const settings = storageService.getSettings();
    if (settings.closeOnStart) {
      logger.info('closeOnStart est activé, exécution du traitement initial des onglets');
      await processTabs();
    }
    
    logger.info('Initialisation de l\'extension terminée');
  } catch (error) {
    logger.error('Erreur lors de l\'initialisation de l\'extension', error);
  }
}

// Fonction principale pour traiter les onglets
async function processTabs() {
  const settings = storageService.getSettings();
  
  // Utiliser le gestionnaire d'espaces de travail pour fermer les onglets dans tous les espaces
  const stats = await workspaceManager.closeInactiveTabsInAllWorkspaces(
    tabManager,
    settings.timeLimit,
    (tab, timeLimit) => domainRuleService.shouldProcessTab(tab, timeLimit)
  );
  
  logger.info(`Traitement des onglets terminé : ${stats.closed} fermés, ${stats.discarded} déchargés, ${stats.skipped} ignorés dans ${stats.workspaces} espaces de travail`);
  return stats;
}

// Gestionnaire d'alarmes
browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    logger.debug('Alarme de vérification des onglets déclenchée');
    await processTabs();
  } else if (alarm.name === UPDATE_TIMESTAMPS_ALARM) {
    await tabManager.updateActiveTabsTimestamps();
  }
});

// Gestionnaire d'événements pour les onglets
browser.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const now = Date.now();
    tabManager.tabTimestamps[activeInfo.tabId] = now;
    await tabManager.saveTabTimestamps();
    logger.debug(`Onglet ${activeInfo.tabId} activé, timestamp mis à jour`);
  } catch (error) {
    logger.error(`Erreur lors de la mise à jour du timestamp pour l'onglet ${activeInfo.tabId}`, error);
  }
});

browser.tabs.onCreated.addListener(async (tab) => {
  try {
    const now = Date.now();
    tabManager.tabTimestamps[tab.id] = now;
    await tabManager.saveTabTimestamps();
    logger.debug(`Nouvel onglet ${tab.id} créé, timestamp enregistré`);
  } catch (error) {
    logger.error(`Erreur lors de l'enregistrement du timestamp pour le nouvel onglet ${tab.id}`, error);
  }
});

browser.tabs.onRemoved.addListener(async (tabId) => {
  try {
    delete tabManager.tabTimestamps[tabId];
    await tabManager.saveTabTimestamps();
    logger.debug(`Onglet ${tabId} supprimé, timestamp retiré`);
  } catch (error) {
    logger.error(`Erreur lors de la suppression du timestamp pour l'onglet ${tabId}`, error);
  }
});

// Gestionnaire de messages pour la communication avec la popup
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    if (message.action === 'getTabStats') {
      const settings = storageService.getSettings();
      const stats = await tabManager.getTabStats(settings);
      return stats;
    } else if (message.action === 'getWorkspaces') {
      await workspaceManager.refreshWorkspaces();
      return workspaceManager.getWorkspaces();
    } else if (message.action === 'getTabsWithWorkspaces') {
      const tabsWithWorkspaces = await zenService.getAllTabsWithWorkspaceInfo();
      return tabsWithWorkspaces;
    } else if (message.action === 'closeOldTabs') {
      const stats = await processTabs();
      const tabStats = await tabManager.getTabStats(storageService.getSettings());
      return { stats, tabStats };
    } else if (message.action === 'closeWorkspaceTabs') {
      const settings = storageService.getSettings();
      const stats = await workspaceManager.closeInactiveTabsInWorkspace(
        message.workspaceId,
        tabManager,
        settings.timeLimit,
        (tab, timeLimit) => domainRuleService.shouldProcessTab(tab, timeLimit)
      );
      const tabStats = await tabManager.getTabStats(settings);
      return { stats, tabStats };
    } else if (message.action === 'getSettings') {
      return storageService.getSettings();
    } else if (message.action === 'saveSettings') {
      return await storageService.saveSettings(message.settings);
    } else if (message.action === 'resetSettings') {
      return await storageService.resetSettings();
    } else if (message.action === 'getDomainRules') {
      return domainRuleService.getRules();
    } else if (message.action === 'saveDomainRule') {
      await domainRuleService.addRule(message.rule);
      return { success: true };
    } else if (message.action === 'deleteDomainRule') {
      await domainRuleService.removeRule(message.domain);
      return { success: true };
    }
  } catch (error) {
    logger.error('Erreur lors du traitement du message', error);
    return { error: error.message };
  }
});

// Démarrer l'initialisation
initialize();