/**
 * FFTabClose - Zen Browser Utilities
 * 
 * This module provides utilities for detecting and working with Zen Browser workspaces.
 * Zen Browser workspaces are implemented as Firefox containers but with specific naming
 * and identification patterns.
 * 
 * Version 1.0.0
 * Last updated: 2023-10-02
 */

// Pattern de noms d'espaces Zen
const ZEN_NAME_PATTERNS = [
  'zen',
  'Zen',
  'space',
  'Space',
  'workspace',
  'Workspace'
];

// Pattern d'IDs d'espaces Zen
const ZEN_ID_PATTERNS = [
  'zen',
  'container-',
  'firefox-container-'
];

/**
 * Détermine si un conteneur est un espace de travail Zen
 * @param {Object} container - Objet conteneur de Firefox
 * @returns {boolean} - true si c'est un espace Zen, false sinon
 */
export function isZenWorkspace(container) {
  if (!container) return false;
  
  // Vérifier le nom du conteneur
  if (container.name) {
    for (const pattern of ZEN_NAME_PATTERNS) {
      if (container.name.includes(pattern)) {
        return true;
      }
    }
  }
  
  // Vérifier l'ID du conteneur
  if (container.cookieStoreId) {
    for (const pattern of ZEN_ID_PATTERNS) {
      if (container.cookieStoreId.includes(pattern)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Détermine si un onglet est dans un espace de travail Zen
 * @param {Object} tab - Objet onglet de Firefox
 * @returns {boolean} - true si l'onglet est dans un espace Zen, false sinon
 */
export function isTabInZenWorkspace(tab) {
  if (!tab) return false;
  
  // Vérifier si l'onglet a un cookieStoreId (ce qui indique qu'il est dans un conteneur)
  if (tab.cookieStoreId) {
    // Vérifier si l'ID du conteneur correspond à un pattern Zen
    for (const pattern of ZEN_ID_PATTERNS) {
      if (tab.cookieStoreId.includes(pattern)) {
        return true;
      }
    }
    
    // Si le cookieStoreId ne commence pas par "firefox-default", considérer comme conteneur
    if (tab.cookieStoreId !== "firefox-default") {
      return true;
    }
  }
  
  return false;
}

/**
 * Récupère tous les onglets de tous les espaces, y compris Zen
 * Cette fonction combine plusieurs méthodes pour maximiser la détection
 * @returns {Promise<Array>} - Promise résolvant vers un tableau d'onglets
 */
export async function getAllTabsAcrossWorkspaces() {
  let allTabs = [];
  
  try {
    // Méthode 1: Requête globale - devrait récupérer TOUS les onglets
    allTabs = await browser.tabs.query({});
    
    // Méthode 2: Requête par fenêtre
    const allWindows = await browser.windows.getAll();
    for (const window of allWindows) {
      try {
        const windowTabs = await browser.tabs.query({ windowId: window.id });
        
        // Ajouter uniquement les onglets qui ne sont pas déjà dans allTabs
        const newTabs = windowTabs.filter(wTab => 
          !allTabs.some(existingTab => existingTab.id === wTab.id)
        );
        
        allTabs = allTabs.concat(newTabs);
      } catch (error) {
        console.error(`Error getting tabs for window ${window.id}:`, error);
      }
    }
    
    // Méthode 3: Requête par conteneur
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        for (const container of containers) {
          try {
            const containerTabs = await browser.tabs.query({ 
              cookieStoreId: container.cookieStoreId 
            });
            
            // Ajouter uniquement les onglets qui ne sont pas déjà dans allTabs
            const newTabs = containerTabs.filter(cTab => 
              !allTabs.some(existingTab => existingTab.id === cTab.id)
            );
            
            allTabs = allTabs.concat(newTabs);
          } catch (error) {
            console.error(`Error getting tabs for container ${container.name}:`, error);
          }
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities:", error);
      }
    }
  } catch (error) {
    console.error("Error getting all tabs across workspaces:", error);
  }
  
  // Dédupliquer les onglets pour éviter les doublons
  const uniqueTabIds = new Set();
  const uniqueTabs = [];
  
  for (const tab of allTabs) {
    if (!uniqueTabIds.has(tab.id)) {
      uniqueTabIds.add(tab.id);
      uniqueTabs.push(tab);
    }
  }
  
  return uniqueTabs;
}

/**
 * Récupère tous les onglets actifs dans tous les espaces de travail
 * @returns {Promise<Array>} - Promise résolvant vers un tableau d'onglets actifs
 */
export async function getAllActiveTabsAcrossWorkspaces() {
  let activeTabs = [];
  
  try {
    // Méthode 1: Requête globale pour tous les onglets actifs
    activeTabs = await browser.tabs.query({ active: true });
    
    // Méthode 2: Requête par fenêtre
    const allWindows = await browser.windows.getAll();
    for (const window of allWindows) {
      try {
        const windowActiveTabs = await browser.tabs.query({ 
          windowId: window.id,
          active: true 
        });
        
        // Ajouter uniquement les onglets qui ne sont pas déjà dans activeTabs
        const newTabs = windowActiveTabs.filter(wTab => 
          !activeTabs.some(existingTab => existingTab.id === wTab.id)
        );
        
        activeTabs = activeTabs.concat(newTabs);
      } catch (error) {
        console.error(`Error getting active tabs for window ${window.id}:`, error);
      }
    }
    
    // Méthode 3: Requête par conteneur
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        for (const container of containers) {
          try {
            const containerActiveTabs = await browser.tabs.query({ 
              cookieStoreId: container.cookieStoreId,
              active: true 
            });
            
            // Ajouter uniquement les onglets qui ne sont pas déjà dans activeTabs
            const newTabs = containerActiveTabs.filter(cTab => 
              !activeTabs.some(existingTab => existingTab.id === cTab.id)
            );
            
            activeTabs = activeTabs.concat(newTabs);
          } catch (error) {
            console.error(`Error getting active tabs for container ${container.name}:`, error);
          }
        }
      } catch (error) {
        console.warn("Error querying contextualIdentities for active tabs:", error);
      }
    }
  } catch (error) {
    console.error("Error getting all active tabs across workspaces:", error);
  }
  
  // Dédupliquer les onglets pour éviter les doublons
  const uniqueTabIds = new Set();
  const uniqueTabs = [];
  
  for (const tab of activeTabs) {
    if (!uniqueTabIds.has(tab.id)) {
      uniqueTabIds.add(tab.id);
      uniqueTabs.push(tab);
    }
  }
  
  return uniqueTabs;
}