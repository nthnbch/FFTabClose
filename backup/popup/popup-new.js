/**
 * FFTabClose - Popup Script
 * Script pour la popup de l'extension
 * 
 * Version 3.1.0
 * Last updated: 2025-09-17
 */

// Éléments DOM
const elements = {
  loading: document.getElementById('loading'),
  statsContainer: document.getElementById('stats-container'),
  workspacesContainer: document.getElementById('workspaces-container'),
  workspacesList: document.getElementById('workspace-list'),
  totalTabs: document.getElementById('totalTabs'),
  activeTabs: document.getElementById('activeTabs'),
  inactiveTabs: document.getElementById('inactiveTabs'),
  eligibleTabs: document.getElementById('eligibleTabs'),
  eligibleProgress: document.getElementById('eligibleProgress'),
  closeOldTabsButton: document.getElementById('closeOldTabsButton'),
  workspacesTitle: document.getElementById('workspacesTitle'),
  workspacesCount: document.getElementById('workspacesCount'),
  settingsLink: document.getElementById('settingsLink'),
  workspaceCardTemplate: document.getElementById('workspace-card-template')
};

// Traduction des éléments de l'interface
async function translateUI() {
  const elementsToTranslate = {
    'extensionName': 'extensionName',
    'infoText': 'infoLink',
    'totalTabsLabel': 'totalTabsLabel',
    'activeTabsLabel': 'activeTabsLabel',
    'inactiveTabsLabel': 'inactiveTabsLabel',
    'eligibleTabsLabel': 'eligibleTabsLabel',
    'closeOldTabsText': 'closeOldTabsButton',
    'workspacesTitle': 'workspacesTitle',
    'settingsText': 'settingsLink',
    'workspaceActiveLabel': 'workspaceActiveLabel',
    'workspaceInactiveLabel': 'workspaceInactiveLabel',
    'workspaceEligibleLabel': 'workspaceEligibleLabel',
    'workspaceCloseText': 'workspaceCloseText',
    'githubLink': 'githubLink'
  };

  // Traduire chaque élément
  for (const [id, message] of Object.entries(elementsToTranslate)) {
    const element = document.getElementById(id);
    if (element) {
      try {
        element.textContent = browser.i18n.getMessage(message) || element.textContent;
      } catch (error) {
        console.error(`Erreur de traduction pour ${id}:`, error);
      }
    }
  }
}

// Charger les statistiques des onglets
async function loadTabStats() {
  try {
    showLoading(true);
    
    // Obtenir les statistiques des onglets
    const stats = await browser.runtime.sendMessage({ action: 'getTabStats' });
    
    // Obtenir les espaces de travail
    const workspaces = await browser.runtime.sendMessage({ action: 'getWorkspaces' });
    
    // Mettre à jour les statistiques globales
    updateGlobalStats(stats);
    
    // Mettre à jour les espaces de travail
    updateWorkspaces(workspaces, stats);
    
    showLoading(false);
  } catch (error) {
    console.error('Erreur lors du chargement des statistiques des onglets:', error);
    showLoading(false);
    showError('Erreur lors du chargement des statistiques des onglets');
  }
}

// Mettre à jour les statistiques globales
function updateGlobalStats(stats) {
  elements.totalTabs.textContent = stats.total;
  elements.activeTabs.textContent = stats.active;
  elements.inactiveTabs.textContent = stats.inactive;
  elements.eligibleTabs.textContent = stats.eligibleForClose;
  
  // Mettre à jour la barre de progression
  const progressPercentage = stats.total > 0 ? (stats.eligibleForClose / stats.total) * 100 : 0;
  elements.eligibleProgress.style.width = `${progressPercentage}%`;
  
  // Afficher les statistiques
  elements.statsContainer.style.display = 'block';
}

// Mettre à jour la section des espaces de travail
function updateWorkspaces(workspaces, stats) {
  // Vider la liste des espaces de travail
  elements.workspacesList.innerHTML = '';
  
  // Mettre à jour le compteur d'espaces de travail
  elements.workspacesCount.textContent = `(${workspaces.length})`;
  
  // Ajouter chaque espace de travail
  workspaces.forEach(workspace => {
    // Trouver les statistiques de cet espace de travail
    const workspaceStats = stats.workspaces.find(ws => ws.id === workspace.id) || {
      total: 0,
      active: 0,
      inactive: 0,
      eligibleForClose: 0
    };
    
    // Créer la carte d'espace de travail
    const workspaceCard = createWorkspaceCard(workspace, workspaceStats);
    
    // Ajouter la carte à la liste
    elements.workspacesList.appendChild(workspaceCard);
  });
  
  // Afficher la section des espaces de travail
  elements.workspacesContainer.style.display = 'block';
}

// Créer une carte d'espace de travail
function createWorkspaceCard(workspace, stats) {
  // Cloner le template
  const template = elements.workspaceCardTemplate.content.cloneNode(true);
  
  // Récupérer les éléments de la carte
  const card = template.querySelector('.workspace-card');
  const workspaceName = template.querySelector('.workspace-name');
  const workspaceType = template.querySelector('.workspace-type');
  const workspaceTabCount = template.querySelector('.workspace-tab-count');
  const workspaceActive = template.querySelector('.workspace-active');
  const workspaceInactive = template.querySelector('.workspace-inactive');
  const workspaceEligible = template.querySelector('.workspace-eligible');
  const workspaceCloseButton = template.querySelector('.workspace-close-button');
  
  // Ajouter la classe appropriée pour le style
  if (workspace.isZen) {
    card.classList.add('workspace-zen');
  } else if (workspace.id === 'firefox-default') {
    card.classList.add('workspace-default');
  } else {
    card.classList.add('workspace-container');
  }
  
  // Définir les valeurs
  workspaceName.textContent = workspace.name || 'Unknown';
  workspaceType.textContent = workspace.isZen ? 'ZEN' : (workspace.type || 'Container');
  workspaceTabCount.textContent = `${stats.total} ${browser.i18n.getMessage('tabsLabel') || 'tabs'}`;
  
  workspaceActive.textContent = stats.active;
  workspaceInactive.textContent = stats.inactive;
  workspaceEligible.textContent = stats.eligibleForClose;
  
  // Ajouter l'événement pour fermer les onglets de cet espace de travail
  workspaceCloseButton.addEventListener('click', async () => {
    try {
      showLoading(true);
      
      // Fermer les onglets inactifs de cet espace de travail
      const result = await browser.runtime.sendMessage({ 
        action: 'closeWorkspaceTabs', 
        workspaceId: workspace.id
      });
      
      // Mettre à jour les statistiques
      updateGlobalStats(result.tabStats);
      
      // Mettre à jour les espaces de travail
      const workspaces = await browser.runtime.sendMessage({ action: 'getWorkspaces' });
      updateWorkspaces(workspaces, result.tabStats);
      
      showLoading(false);
    } catch (error) {
      console.error(`Erreur lors de la fermeture des onglets de l'espace de travail ${workspace.id}:`, error);
      showLoading(false);
      showError(`Erreur lors de la fermeture des onglets de l'espace de travail ${workspace.name}`);
    }
  });
  
  return template;
}

// Fermer tous les onglets inactifs
async function closeOldTabs() {
  try {
    showLoading(true);
    
    // Fermer les onglets inactifs
    const result = await browser.runtime.sendMessage({ action: 'closeOldTabs' });
    
    // Mettre à jour les statistiques
    updateGlobalStats(result.tabStats);
    
    // Mettre à jour les espaces de travail
    const workspaces = await browser.runtime.sendMessage({ action: 'getWorkspaces' });
    updateWorkspaces(workspaces, result.tabStats);
    
    showLoading(false);
  } catch (error) {
    console.error('Erreur lors de la fermeture des onglets inactifs:', error);
    showLoading(false);
    showError('Erreur lors de la fermeture des onglets inactifs');
  }
}

// Afficher ou masquer l'indicateur de chargement
function showLoading(show) {
  elements.loading.style.display = show ? 'flex' : 'none';
  elements.statsContainer.style.display = show ? 'none' : 'block';
  elements.workspacesContainer.style.display = show ? 'none' : 'block';
}

// Afficher un message d'erreur
function showError(message) {
  alert(message);
}

// Initialiser la popup
async function initialize() {
  try {
    // Traduire l'interface
    await translateUI();
    
    // Charger les statistiques des onglets
    await loadTabStats();
    
    // Ajouter les événements
    elements.closeOldTabsButton.addEventListener('click', closeOldTabs);
    
    // Événement pour ouvrir les paramètres
    elements.settingsLink.addEventListener('click', (e) => {
      e.preventDefault();
      browser.runtime.openOptionsPage();
    });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la popup:', error);
    showError('Erreur lors de l\'initialisation de la popup');
  }
}

// Démarrer l'initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', initialize);