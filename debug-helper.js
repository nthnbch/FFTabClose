// FFTabClose - Debug Helper
// À coller dans la console Firefox pour diagnostiquer

console.log('🔍 FFTabClose Debug Helper');

// 1. Vérifier la configuration
browser.storage.sync.get('config').then(config => {
  console.log('📋 Configuration actuelle:', config);
});

// 2. Lister tous les onglets
browser.tabs.query({}).then(tabs => {
  console.log(`📊 ${tabs.length} onglets trouvés:`);
  tabs.forEach(tab => {
    console.log(`  Tab ${tab.id}: "${tab.title}" - Pinned: ${tab.pinned} - Active: ${tab.active} - Container: ${tab.cookieStoreId}`);
  });
});

// 3. Tester la détection Zen Browser
browser.runtime.getBrowserInfo().then(info => {
  const isZen = info.name.toLowerCase().includes('zen');
  console.log(`🌐 Navigateur: ${info.name} - Zen détecté: ${isZen}`);
});

// 4. Forcer un traitement manuel
console.log('🔄 Forçage d\'un traitement...');
browser.runtime.sendMessage({action: 'forceProcess'}).then(response => {
  console.log('✅ Résultat du traitement:', response);
}).catch(error => {
  console.error('❌ Erreur:', error);
});

// 5. Vérifier les statistiques
setTimeout(() => {
  browser.runtime.sendMessage({action: 'getStats'}).then(stats => {
    console.log('📈 Statistiques:', stats);
  });
}, 1000);