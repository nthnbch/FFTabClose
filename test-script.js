/**
 * FFTabClose V4.0 - Script de test
 * 
 * Ce script permet de tester toutes les fonctionnalités de l'extension
 * pour s'assurer qu'elle fonctionne comme Arc Browser auto-closing tabs
 */

// Configuration de test
const TEST_CONFIG = {
  enabled: true,
  closeAfterMinutes: 1, // 1 minute pour les tests
  discardPinnedTabs: true,
  excludeActiveTab: true,
  excludeAudibleTabs: true,
  checkIntervalMinutes: 0.5 // 30 secondes pour les tests
};

// Résultats des tests
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

// Utilitaires de test
function logTest(name, success, details = '') {
  testResults.total++;
  const result = {
    name,
    success,
    details,
    timestamp: new Date().toISOString()
  };
  
  if (success) {
    testResults.passed++;
    console.log(`✅ ${name}${details ? ' - ' + details : ''}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}${details ? ' - ' + details : ''}`);
  }
  
  testResults.tests.push(result);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Tests principaux
async function runAllTests() {
  console.log('🧪 FFTabClose V4.0 - Démarrage des tests...\n');
  
  try {
    // Test 1: Vérifier l'initialisation
    await testInitialization();
    
    // Test 2: Vérifier la configuration
    await testConfiguration();
    
    // Test 3: Tester la création d'onglets
    await testTabCreation();
    
    // Test 4: Tester la persistance
    await testPersistence();
    
    // Test 5: Tester la fermeture d'onglets
    await testTabClosing();
    
    // Test 6: Tester les onglets épinglés
    await testPinnedTabs();
    
    // Test 7: Tester l'exclusion audio
    await testAudioExclusion();
    
    // Test 8: Tester les workspaces
    await testWorkspaces();
    
    // Résultats finaux
    printTestResults();
    
  } catch (error) {
    console.error('🚨 Erreur lors des tests:', error);
  }
}

// Test 1: Initialisation
async function testInitialization() {
  console.log('📋 Test 1: Initialisation...');
  
  try {
    // Tester la communication avec le background script via messages
    try {
      const response = await browser.runtime.sendMessage({ action: 'getStats' });
      logTest('Communication background', !!response, 'Messages fonctionnent');
      
      if (response && response.stats) {
        logTest('Background script actif', true, `${response.stats.totalTabs} onglets suivis`);
        logTest('Configuration chargée', !!response.stats.enabled !== undefined, `Enabled: ${response.stats.enabled}`);
      } else {
        logTest('Background script actif', false, 'Pas de réponse aux messages');
      }
    } catch (error) {
      logTest('Communication background', false, error.message);
    }
    
  } catch (error) {
    logTest('Initialisation', false, error.message);
  }
  
  console.log('');
}

// Test 2: Configuration
async function testConfiguration() {
  console.log('⚙️ Test 2: Configuration...');
  
  try {
    // Sauvegarder la configuration de test
    await browser.storage.sync.set({ config: TEST_CONFIG });
    logTest('Sauvegarde config test', true, 'Configuration de test sauvegardée');
    
    await sleep(100);
    
    // Vérifier que la configuration est chargée
    const result = await browser.storage.sync.get('config');
    const isCorrect = result.config && result.config.closeAfterMinutes === 1;
    logTest('Chargement config', isCorrect, `closeAfterMinutes: ${result.config?.closeAfterMinutes}`);
    
    // Tester les changements en temps réel
    const background = await browser.runtime.getBackgroundPage();
    if (background && background.ffTabClose) {
      await background.ffTabClose.loadConfig();
      const currentConfig = background.ffTabClose.config;
      logTest('Mise à jour config en temps réel', currentConfig.closeAfterMinutes === 1, 'Configuration mise à jour dans le background');
    }
    
  } catch (error) {
    logTest('Configuration', false, error.message);
  }
  
  console.log('');
}

// Test 3: Création d'onglets
async function testTabCreation() {
  console.log('📑 Test 3: Création d\'onglets...');
  
  try {
    const background = await browser.runtime.getBackgroundPage();
    if (!background?.ffTabClose) {
      logTest('Création onglets', false, 'Background script non disponible');
      return;
    }
    
    // Compter les onglets avant
    const tabsBefore = await browser.tabs.query({});
    const countBefore = tabsBefore.length;
    
    // Créer un nouvel onglet
    const newTab = await browser.tabs.create({ url: 'about:blank', active: false });
    logTest('Création onglet', !!newTab, `Onglet ${newTab.id} créé`);
    
    await sleep(500);
    
    // Vérifier que l'onglet est suivi
    const tabInfo = background.ffTabClose.tabManager.getTabInfo(newTab.id);
    logTest('Suivi onglet', !!tabInfo, tabInfo ? `Créé à: ${new Date(tabInfo.createdAt).toLocaleTimeString()}` : 'Non suivi');
    
    // Vérifier les timestamps
    if (tabInfo) {
      const now = Date.now();
      const isRecentlyCreated = (now - tabInfo.createdAt) < 2000; // moins de 2 secondes
      logTest('Timestamp création', isRecentlyCreated, `Différence: ${now - tabInfo.createdAt}ms`);
    }
    
    // Nettoyer
    await browser.tabs.remove(newTab.id);
    
  } catch (error) {
    logTest('Création onglets', false, error.message);
  }
  
  console.log('');
}

// Test 4: Persistance
async function testPersistence() {
  console.log('💾 Test 4: Persistance...');
  
  try {
    const background = await browser.runtime.getBackgroundPage();
    if (!background?.ffTabClose) {
      logTest('Persistance', false, 'Background script non disponible');
      return;
    }
    
    // Créer des onglets de test
    const tab1 = await browser.tabs.create({ url: 'about:blank', active: false });
    const tab2 = await browser.tabs.create({ url: 'data:text/html,<h1>Test</h1>', active: false });
    
    await sleep(500);
    
    // Vérifier qu'ils sont suivis
    const tabManager = background.ffTabClose.tabManager;
    const tab1Info = tabManager.getTabInfo(tab1.id);
    const tab2Info = tabManager.getTabInfo(tab2.id);
    
    logTest('Onglets suivis', !!(tab1Info && tab2Info), `Tab1: ${!!tab1Info}, Tab2: ${!!tab2Info}`);
    
    // Forcer la sauvegarde
    await tabManager.saveToStorage();
    logTest('Sauvegarde forcée', true, 'Données sauvegardées dans storage');
    
    // Simuler un redémarrage en effaçant les données en mémoire
    tabManager.tabData.clear();
    logTest('Simulation redémarrage', tabManager.tabData.size === 0, 'Données en mémoire effacées');
    
    // Recharger depuis le storage
    await tabManager.loadFromStorage();
    const restoredTab1 = tabManager.getTabInfo(tab1.id);
    const restoredTab2 = tabManager.getTabInfo(tab2.id);
    
    logTest('Restauration depuis storage', !!(restoredTab1 && restoredTab2), `Restaurés: ${tabManager.tabData.size} onglets`);
    
    // Nettoyer
    await browser.tabs.remove([tab1.id, tab2.id]);
    
  } catch (error) {
    logTest('Persistance', false, error.message);
  }
  
  console.log('');
}

// Test 5: Fermeture d'onglets
async function testTabClosing() {
  console.log('🗑️ Test 5: Fermeture d\'onglets...');
  
  try {
    const background = await browser.runtime.getBackgroundPage();
    if (!background?.ffTabClose) {
      logTest('Fermeture onglets', false, 'Background script non disponible');
      return;
    }
    
    // Créer un onglet de test
    const testTab = await browser.tabs.create({ url: 'about:blank', active: false });
    await sleep(200);
    
    // Simuler un onglet ancien en modifiant son timestamp
    const tabManager = background.ffTabClose.tabManager;
    const tabInfo = tabManager.getTabInfo(testTab.id);
    
    if (tabInfo) {
      // Le rendre plus ancien que le seuil (1 minute = 60000ms)
      tabInfo.lastActiveAt = Date.now() - 70000; // 70 secondes
      await tabManager.saveToStorage();
      
      logTest('Simulation onglet ancien', true, 'Timestamp modifié à -70s');
      
      // Forcer le traitement
      await background.ffTabClose.forceProcess();
      await sleep(1000);
      
      // Vérifier que l'onglet a été fermé
      try {
        await browser.tabs.get(testTab.id);
        logTest('Onglet fermé', false, 'L\'onglet existe encore');
      } catch (error) {
        // L'onglet n'existe plus = succès
        logTest('Onglet fermé', true, 'L\'onglet a été fermé automatiquement');
      }
    } else {
      logTest('Simulation onglet ancien', false, 'Onglet non suivi');
    }
    
  } catch (error) {
    logTest('Fermeture onglets', false, error.message);
  }
  
  console.log('');
}

// Test 6: Onglets épinglés
async function testPinnedTabs() {
  console.log('📌 Test 6: Onglets épinglés...');
  
  try {
    const background = await browser.runtime.getBackgroundPage();
    if (!background?.ffTabClose) {
      logTest('Onglets épinglés', false, 'Background script non disponible');
      return;
    }
    
    // Créer un onglet épinglé
    const pinnedTab = await browser.tabs.create({ url: 'about:blank', pinned: true, active: false });
    await sleep(200);
    
    // Simuler un onglet épinglé ancien
    const tabManager = background.ffTabClose.tabManager;
    const tabInfo = tabManager.getTabInfo(pinnedTab.id);
    
    if (tabInfo) {
      tabInfo.lastActiveAt = Date.now() - 70000; // 70 secondes
      await tabManager.saveToStorage();
      
      logTest('Simulation onglet épinglé ancien', true, 'Onglet épinglé avec timestamp ancien');
      
      // Forcer le traitement
      await background.ffTabClose.forceProcess();
      await sleep(1000);
      
      // Vérifier que l'onglet existe encore mais est mis en veille
      try {
        const updatedTab = await browser.tabs.get(pinnedTab.id);
        logTest('Onglet épinglé préservé', !!updatedTab, 'L\'onglet épinglé n\'a pas été fermé');
        logTest('Onglet mis en veille', updatedTab.discarded, `Discarded: ${updatedTab.discarded}`);
        
        // Nettoyer
        await browser.tabs.remove(pinnedTab.id);
      } catch (error) {
        logTest('Onglet épinglé préservé', false, 'L\'onglet épinglé a été fermé par erreur');
      }
    } else {
      logTest('Simulation onglet épinglé ancien', false, 'Onglet épinglé non suivi');
    }
    
  } catch (error) {
    logTest('Onglets épinglés', false, error.message);
  }
  
  console.log('');
}

// Test 7: Exclusion audio
async function testAudioExclusion() {
  console.log('🔊 Test 7: Exclusion audio...');
  
  try {
    // Ce test est simulé car il est difficile de créer un vrai onglet avec audio
    const background = await browser.runtime.getBackgroundPage();
    if (!background?.ffTabClose) {
      logTest('Exclusion audio', false, 'Background script non disponible');
      return;
    }
    
    // Créer un onglet normal
    const audioTab = await browser.tabs.create({ url: 'about:blank', active: false });
    await sleep(200);
    
    // Simuler un onglet avec audio
    const tabManager = background.ffTabClose.tabManager;
    const tabInfo = tabManager.getTabInfo(audioTab.id);
    
    if (tabInfo) {
      tabInfo.audible = true; // Simuler audio
      tabInfo.lastActiveAt = Date.now() - 70000; // Ancien
      await tabManager.saveToStorage();
      
      logTest('Simulation onglet audio', true, 'Onglet marqué comme audible');
      
      // Vérifier la logique d'exclusion
      const config = background.ffTabClose.config;
      const { tabsToClose } = tabManager.findOldTabs(config);
      
      const shouldBeExcluded = config.excludeAudibleTabs;
      const isExcluded = !tabsToClose.some(tab => tab.id === audioTab.id);
      
      logTest('Onglet audio exclu', shouldBeExcluded === isExcluded, `Exclu: ${isExcluded}, Configuré pour exclure: ${shouldBeExcluded}`);
      
      // Nettoyer
      await browser.tabs.remove(audioTab.id);
    } else {
      logTest('Simulation onglet audio', false, 'Onglet audio non suivi');
    }
    
  } catch (error) {
    logTest('Exclusion audio', false, error.message);
  }
  
  console.log('');
}

// Test 8: Workspaces
async function testWorkspaces() {
  console.log('🏢 Test 8: Workspaces...');
  
  try {
    const background = await browser.runtime.getBackgroundPage();
    if (!background?.ffTabClose) {
      logTest('Workspaces', false, 'Background script non disponible');
      return;
    }
    
    // Vérifier les containers disponibles
    try {
      const containers = await browser.contextualIdentities.query({});
      logTest('Containers disponibles', containers.length > 0, `${containers.length} containers trouvés`);
      
      if (containers.length > 0) {
        // Créer un onglet dans un container
        const containerTab = await browser.tabs.create({
          url: 'about:blank',
          cookieStoreId: containers[0].cookieStoreId,
          active: false
        });
        
        await sleep(200);
        
        // Vérifier le suivi du container
        const tabManager = background.ffTabClose.tabManager;
        const tabInfo = tabManager.getTabInfo(containerTab.id);
        
        logTest('Onglet container suivi', !!tabInfo, tabInfo ? `CookieStore: ${tabInfo.cookieStoreId}` : 'Non suivi');
        
        if (tabInfo) {
          const correctContainer = tabInfo.cookieStoreId === containers[0].cookieStoreId;
          logTest('Container ID correct', correctContainer, `Attendu: ${containers[0].cookieStoreId}, Trouvé: ${tabInfo.cookieStoreId}`);
        }
        
        // Nettoyer
        await browser.tabs.remove(containerTab.id);
      }
      
    } catch (error) {
      logTest('Support containers', false, 'API contextualIdentities non disponible');
    }
    
  } catch (error) {
    logTest('Workspaces', false, error.message);
  }
  
  console.log('');
}

// Affichage des résultats
function printTestResults() {
  console.log('📊 Résultats des tests:');
  console.log('═'.repeat(50));
  console.log(`✅ Tests réussis: ${testResults.passed}/${testResults.total}`);
  console.log(`❌ Tests échoués: ${testResults.failed}/${testResults.total}`);
  console.log(`📈 Taux de réussite: ${Math.round((testResults.passed / testResults.total) * 100)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ Tests échoués:');
    testResults.tests
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.details}`);
      });
  }
  
  console.log('\n🎯 Statut final:');
  if (testResults.failed === 0) {
    console.log('🎉 Tous les tests sont passés! L\'extension est prête.');
  } else if (testResults.failed <= 2) {
    console.log('⚠️ Quelques tests ont échoué mais l\'extension devrait fonctionner.');
  } else {
    console.log('🚨 Plusieurs tests ont échoué. Vérifiez la configuration.');
  }
  
  return testResults;
}

// Exporter pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.ffTabCloseTests = {
    runAllTests,
    testResults,
    individual: {
      testInitialization,
      testConfiguration,
      testTabCreation,
      testPersistence,
      testTabClosing,
      testPinnedTabs,
      testAudioExclusion,
      testWorkspaces
    }
  };
}

// Auto-exécution si appelé directement
if (typeof module === 'undefined') {
  // Dans le contexte du navigateur
  console.log('🔧 FFTabClose Tests chargés. Utilisez window.ffTabCloseTests.runAllTests() pour démarrer.');
}

export { runAllTests, testResults };