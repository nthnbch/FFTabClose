/**
 * FFTabClose - Zen Browser Utilities
 * 
 * This module provides utilities for detecting and working with Zen Browser workspaces.
 * Zen Browser workspaces are implemented as Firefox containers but with specific naming
 * and identification patterns.
 * 
 * Version 1.0.1
 * Last updated: 2023-09-17
 */

// Pattern de noms d'espaces Zen
const ZEN_NAME_PATTERNS = [
  'zen',
  'Zen',
  'space',
  'Space',
  'workspace',
  'Workspace',
  'container',
  'Container'
];

// Pattern d'IDs d'espaces Zen
const ZEN_ID_PATTERNS = [
  'zen',
  'container-',
  'firefox-container-',
  'userContext'
];

// DEBUG
const DEBUG_MODE = true;

/**
 * Détermine si un conteneur est un espace de travail Zen
 * @param {Object} container - Objet conteneur de Firefox
 * @returns {boolean} - true si c'est un espace Zen, false sinon
 */
export function isZenWorkspace(container) {
  if (!container) return false;
  
  // Pour tous les conteneurs non-défaut, on considère qu'il s'agit d'un espace Zen/workspace
  if (container.cookieStoreId && container.cookieStoreId !== 'firefox-default' && container.cookieStoreId !== 'firefox-private') {
    return true;
  }
  
  // Vérifier le nom du conteneur
  if (container.name) {
    for (const pattern of ZEN_NAME_PATTERNS) {
      if (container.name.toLowerCase().includes(pattern.toLowerCase())) {
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
    // Si le cookieStoreId ne commence pas par "firefox-default", considérer comme conteneur
    if (tab.cookieStoreId !== "firefox-default" && tab.cookieStoreId !== "firefox-private") {
      return true;
    }
    
    // Vérifier si l'ID du conteneur correspond à un pattern Zen
    for (const pattern of ZEN_ID_PATTERNS) {
      if (tab.cookieStoreId.includes(pattern)) {
        return true;
      }
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
    
    if (DEBUG_MODE) {
      console.log(`getAllTabsAcrossWorkspaces - Méthode 1: Trouvé ${allTabs.length} onglets avec requête globale`);
      
      // Détecter les espaces Zen
      const zenTabs = allTabs.filter(tab => isTabInZenWorkspace(tab));
      if (zenTabs.length > 0) {
        console.log(`  Dont ${zenTabs.length} onglets dans des espaces Zen`);
      }
    }
    
    // Méthode 2: Requête par fenêtre
    const allWindows = await browser.windows.getAll();
    if (DEBUG_MODE) {
      console.log(`getAllTabsAcrossWorkspaces - Méthode 2: Trouvé ${allWindows.length} fenêtres`);
    }
    
    for (const window of allWindows) {
      try {
        const windowTabs = await browser.tabs.query({ windowId: window.id });
        
        if (DEBUG_MODE) {
          console.log(`  Fenêtre ${window.id}: ${windowTabs.length} onglets`);
        }
        
        // Ajouter uniquement les onglets qui ne sont pas déjà dans allTabs
        const newTabs = windowTabs.filter(wTab => 
          !allTabs.some(existingTab => existingTab.id === wTab.id)
        );
        
        if (newTabs.length > 0) {
          if (DEBUG_MODE) {
            console.log(`  Ajout de ${newTabs.length} nouveaux onglets de la fenêtre ${window.id}`);
          }
          allTabs = allTabs.concat(newTabs);
        }
      } catch (error) {
        console.error(`Error getting tabs for window ${window.id}:`, error);
      }
    }
    
    // Méthode 3: Requête par conteneur
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        if (DEBUG_MODE) {
          console.log(`getAllTabsAcrossWorkspaces - Méthode 3: Trouvé ${containers.length} conteneurs`);
        }
        
        for (const container of containers) {
          try {
            const containerTabs = await browser.tabs.query({ 
              cookieStoreId: container.cookieStoreId 
            });
            
            if (DEBUG_MODE) {
              console.log(`  Conteneur ${container.name} (${container.cookieStoreId}): ${containerTabs.length} onglets`);
            }
            
            // Ajouter uniquement les onglets qui ne sont pas déjà dans allTabs
            const newTabs = containerTabs.filter(cTab => 
              !allTabs.some(existingTab => existingTab.id === cTab.id)
            );
            
            if (newTabs.length > 0) {
              if (DEBUG_MODE) {
                console.log(`  Ajout de ${newTabs.length} nouveaux onglets du conteneur ${container.name}`);
                
                // Vérifier si ce conteneur est un espace Zen
                if (isZenWorkspace(container)) {
                  console.log(`  Le conteneur ${container.name} est un espace Zen`);
                }
              }
              
              allTabs = allTabs.concat(newTabs);
            }
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
  
  if (DEBUG_MODE) {
    if (uniqueTabs.length !== allTabs.length) {
      console.log(`getAllTabsAcrossWorkspaces: Suppression de ${allTabs.length - uniqueTabs.length} onglets dupliqués`);
    }
    
    console.log(`getAllTabsAcrossWorkspaces: Total final de ${uniqueTabs.length} onglets uniques`);
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
    
    if (DEBUG_MODE) {
      console.log(`getAllActiveTabsAcrossWorkspaces - Méthode 1: Trouvé ${activeTabs.length} onglets actifs avec requête globale`);
    }
    
    // Méthode 2: Requête par fenêtre
    const allWindows = await browser.windows.getAll();
    for (const window of allWindows) {
      try {
        const windowActiveTabs = await browser.tabs.query({ 
          windowId: window.id,
          active: true 
        });
        
        if (windowActiveTabs.length > 0) {
          if (DEBUG_MODE) {
            console.log(`  Fenêtre ${window.id}: trouvé ${windowActiveTabs.length} onglet(s) actif(s)`);
          }
          
          // Ajouter uniquement les onglets qui ne sont pas déjà dans activeTabs
          const newTabs = windowActiveTabs.filter(wTab => 
            !activeTabs.some(existingTab => existingTab.id === wTab.id)
          );
          
          if (newTabs.length > 0) {
            if (DEBUG_MODE) {
              console.log(`  Ajout de ${newTabs.length} nouveaux onglets actifs de la fenêtre ${window.id}`);
            }
            
            activeTabs = activeTabs.concat(newTabs);
          }
        }
      } catch (error) {
        console.error(`Error getting active tabs for window ${window.id}:`, error);
      }
    }
    
    // Méthode 3: Requête par conteneur
    if (browser.contextualIdentities) {
      try {
        const containers = await browser.contextualIdentities.query({});
        
        if (DEBUG_MODE && containers.length > 0) {
          console.log(`getAllActiveTabsAcrossWorkspaces - Méthode 3: Vérification de ${containers.length} conteneurs`);
        }
        
        for (const container of containers) {
          try {
            const containerActiveTabs = await browser.tabs.query({ 
              cookieStoreId: container.cookieStoreId,
              active: true 
            });
            
            if (containerActiveTabs.length > 0) {
              if (DEBUG_MODE) {
                console.log(`  Conteneur ${container.name}: trouvé ${containerActiveTabs.length} onglet(s) actif(s)`);
              }
              
              // Ajouter uniquement les onglets qui ne sont pas déjà dans activeTabs
              const newTabs = containerActiveTabs.filter(cTab => 
                !activeTabs.some(existingTab => existingTab.id === cTab.id)
              );
              
              if (newTabs.length > 0) {
                if (DEBUG_MODE) {
                  console.log(`  Ajout de ${newTabs.length} nouveaux onglets actifs du conteneur ${container.name}`);
                  
                  // Vérifier si ce conteneur est un espace Zen
                  if (isZenWorkspace(container)) {
                    console.log(`  Le conteneur ${container.name} est un espace Zen`);
                  }
                }
                
                activeTabs = activeTabs.concat(newTabs);
              }
            }
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
  
  if (DEBUG_MODE) {
    if (uniqueTabs.length !== activeTabs.length) {
      console.log(`getAllActiveTabsAcrossWorkspaces: Suppression de ${activeTabs.length - uniqueTabs.length} onglets actifs dupliqués`);
    }
    
    console.log(`getAllActiveTabsAcrossWorkspaces: Total final de ${uniqueTabs.length} onglets actifs uniques`);
  }
  
  return uniqueTabs;
}