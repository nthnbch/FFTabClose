/**
 * FFTabClose V4.0 - Script de test simplifié pour Firefox
 * 
 * Tests compatibles Firefox sans accès direct au background script
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
  console.log('🧪 FFTabClose V4.0 - Démarrage des tests Firefox...\n');
  
  try {
    // Test 1: Communication avec le background script
    await testBackgroundCommunication();
    
    // Test 2: Configuration
    await testConfiguration();
    
    // Test 3: Création et suivi d'onglets
    await testTabTracking();
    
    // Test 4: Persistance des données
    await testDataPersistence();
    
    // Test 5: Fonctionnement de base
    await testBasicFunctionality();
    
    // Résultats finaux
    printTestResults();
    
  } catch (error) {
    console.error('🚨 Erreur lors des tests:', error);
  }
}

// Test 1: Communication avec le background script
async function testBackgroundCommunication() {
  console.log('📡 Test 1: Communication background script...');
  
  try {
    // Tester la communication via messages
    const response = await browser.runtime.sendMessage({ action: 'getStats' });
    logTest('Message getStats', !!response, response ? 'Réponse reçue' : 'Pas de réponse');
    
    if (response && response.stats) {
      logTest('Format statistiques', true, `${Object.keys(response.stats).length} propriétés`);
      logTest('Extension activée', response.stats.enabled !== undefined, `Enabled: ${response.stats.enabled}`);
    } else {
      logTest('Format statistiques', false, 'Statistiques invalides');
    }
    
    // Tester forceProcess
    const processResponse = await browser.runtime.sendMessage({ action: 'forceProcess' });
    logTest('Message forceProcess', !!processResponse, processResponse?.success ? 'Succès' : 'Échec');
    
  } catch (error) {
    logTest('Communication background', false, error.message);
  }
  
  console.log('');
}

// Test 2: Configuration
async function testConfiguration() {
  console.log('⚙️ Test 2: Configuration...');
  
  try {
    // Sauvegarder la configuration de test
    await browser.storage.sync.set({ config: TEST_CONFIG });
    logTest('Sauvegarde config', true, 'Configuration de test sauvegardée');
    
    await sleep(200);
    
    // Vérifier que la configuration est chargée
    const result = await browser.storage.sync.get('config');
    const isCorrect = result.config && result.config.closeAfterMinutes === 1;
    logTest('Lecture config', isCorrect, `closeAfterMinutes: ${result.config?.closeAfterMinutes}`);
    
    // Vérifier le format
    if (result.config) {
      const requiredFields = ['enabled', 'closeAfterMinutes', 'discardPinnedTabs'];
      const hasAllFields = requiredFields.every(field => field in result.config);
      logTest('Format config complet', hasAllFields, `Champs: ${Object.keys(result.config).join(', ')}`);
    }
    
  } catch (error) {
    logTest('Configuration', false, error.message);
  }
  
  console.log('');
}

// Test 3: Création et suivi d'onglets
async function testTabTracking() {
  console.log('📑 Test 3: Suivi des onglets...');
  
  try {
    // Compter les onglets avant
    const tabsBefore = await browser.tabs.query({});
    const countBefore = tabsBefore.length;
    logTest('Comptage onglets initial', true, `${countBefore} onglets existants`);
    
    // Créer un nouvel onglet
    const newTab = await browser.tabs.create({ url: 'about:blank', active: false });
    logTest('Création onglet', !!newTab, `Onglet ${newTab.id} créé`);
    
    await sleep(1000); // Laisser le temps au background script de traiter
    
    // Vérifier que le nombre d'onglets a augmenté
    const tabsAfter = await browser.tabs.query({});
    const countAfter = tabsAfter.length;
    logTest('Onglet ajouté', countAfter === countBefore + 1, `${countBefore} → ${countAfter} onglets`);
    
    // Tester la création d'un onglet épinglé
    const pinnedTab = await browser.tabs.create({ 
      url: 'data:text/html,<h1>Test épinglé</h1>', 
      pinned: true,
      active: false 
    });
    logTest('Création onglet épinglé', pinnedTab.pinned, `Onglet ${pinnedTab.id} épinglé`);
    
    await sleep(500);
    
    // Obtenir les statistiques pour vérifier le suivi
    const statsResponse = await browser.runtime.sendMessage({ action: 'getStats' });
    if (statsResponse?.stats) {
      const pinnedCount = statsResponse.stats.pinnedTabs;
      logTest('Suivi onglets épinglés', pinnedCount > 0, `${pinnedCount} onglets épinglés suivis`);
    }
    
    // Nettoyer
    await browser.tabs.remove([newTab.id, pinnedTab.id]);
    
  } catch (error) {
    logTest('Suivi onglets', false, error.message);
  }
  
  console.log('');
}

// Test 4: Persistance des données
async function testDataPersistence() {
  console.log('💾 Test 4: Persistance des données...');
  
  try {
    // Créer un onglet de test
    const testTab = await browser.tabs.create({ url: 'about:blank', active: false });
    
    await sleep(500);
    
    // Vérifier que les données sont sauvegardées
    const tabData = await browser.storage.local.get('tabData');
    logTest('Données stockées', !!tabData.tabData, tabData.tabData ? `${Object.keys(tabData.tabData).length} onglets` : 'Aucune donnée');
    
    if (tabData.tabData) {
      const hasTestTab = testTab.id.toString() in tabData.tabData;
      logTest('Onglet test persisté', hasTestTab, hasTestTab ? 'Onglet trouvé dans storage' : 'Onglet non trouvé');
      
      if (hasTestTab) {
        const tabInfo = tabData.tabData[testTab.id.toString()];
        const hasTimestamps = tabInfo.createdAt && tabInfo.lastActiveAt;
        logTest('Timestamps présents', !!hasTimestamps, hasTimestamps ? 'createdAt et lastActiveAt OK' : 'Timestamps manquants');
      }
    }
    
    // Nettoyer
    await browser.tabs.remove(testTab.id);
    
  } catch (error) {
    logTest('Persistance données', false, error.message);
  }
  
  console.log('');
}

// Test 5: Fonctionnement de base
async function testBasicFunctionality() {
  console.log('🎯 Test 5: Fonctionnement de base...');
  
  try {
    // Vérifier les permissions
    const permissions = await browser.permissions.getAll();
    const requiredPerms = ['tabs', 'storage', 'alarms'];
    const hasRequiredPerms = requiredPerms.every(perm => 
      permissions.permissions.includes(perm)
    );
    logTest('Permissions requises', hasRequiredPerms, `Permissions: ${permissions.permissions.join(', ')}`);
    
    // Tester l'API alarms
    try {
      await browser.alarms.create('test-alarm', { delayInMinutes: 0.1 });
      await browser.alarms.clear('test-alarm');
      logTest('API Alarms', true, 'Création/suppression alarme OK');
    } catch (error) {
      logTest('API Alarms', false, error.message);
    }
    
    // Tester l'API storage
    const testData = { test: Date.now() };
    await browser.storage.local.set(testData);
    const retrieved = await browser.storage.local.get('test');
    const storageWorks = retrieved.test === testData.test;
    logTest('API Storage', storageWorks, storageWorks ? 'Lecture/écriture OK' : 'Échec storage');
    
    // Nettoyer
    await browser.storage.local.remove('test');
    
    // Test final: vérifier que l'extension répond
    const finalStats = await browser.runtime.sendMessage({ action: 'getStats' });
    logTest('Extension responsive', !!finalStats, finalStats ? 'Extension répond aux messages' : 'Extension non responsive');
    
  } catch (error) {
    logTest('Fonctionnement de base', false, error.message);
  }
  
  console.log('');
}

// Affichage des résultats
function printTestResults() {
  console.log('📊 Résultats des tests Firefox:');
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
    console.log('🎉 Tous les tests sont passés! L\'extension fonctionne parfaitement.');
  } else if (testResults.failed <= 2) {
    console.log('⚠️ Quelques tests mineurs ont échoué mais l\'extension devrait fonctionner.');
  } else {
    console.log('🚨 Plusieurs tests ont échoué. Vérifiez la configuration et les logs.');
  }
  
  // Instructions pour l'utilisateur
  console.log('\n📝 Instructions:');
  console.log('1. Configurez l\'extension via le popup');
  console.log('2. Ouvrez plusieurs onglets (dont des épinglés)');
  console.log('3. Attendez le délai configuré');
  console.log('4. Vérifiez que les onglets normaux se ferment et les épinglés se mettent en veille');
  
  return testResults;
}

// Fonction d'aide pour tests manuels
function quickTest() {
  console.log('🚀 Test rapide FFTabClose');
  browser.runtime.sendMessage({ action: 'getStats' })
    .then(response => {
      if (response?.stats) {
        console.log('✅ Extension active:', response.stats);
      } else {
        console.log('❌ Extension non responsive');
      }
    })
    .catch(error => {
      console.log('❌ Erreur:', error.message);
    });
}

// Exporter pour utilisation dans la console
if (typeof window !== 'undefined') {
  window.ffTabCloseTests = {
    runAllTests,
    quickTest,
    testResults
  };
  
  console.log('🔧 FFTabClose Tests Firefox chargés.');
  console.log('📋 Utilisez: window.ffTabCloseTests.runAllTests()');
  console.log('⚡ Test rapide: window.ffTabCloseTests.quickTest()');
}

export { runAllTests, quickTest, testResults };