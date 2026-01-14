// FFTabClose - Debug Helper
// À coller dans la console Firefox pour diagnostiquer

console.log('🔍 FFTabClose Debug Helper');

// 1. Vérifier la configuration
browser.storage.sync.get('config').then(config => {
  console.log('📋 Configuration actuelle:', config);
});

// 2. Lister tous les onglets avec workspaces
browser.tabs.query({}).then(tabs => {
  console.log(`📊 ${tabs.length} onglets trouvés:`);
  tabs.forEach(tab => {
    console.log(`  Tab ${tab.id}: "${tab.title}" - Pinned: ${tab.pinned} - Active: ${tab.active} - Workspace: ${tab.cookieStoreId || 'default'}`);
  });

  // Identifier le workspace actuel
  const activeTabs = tabs.filter(tab => tab.active);
  if (activeTabs.length > 0) {
    const currentWorkspace = activeTabs[0].cookieStoreId || 'default';
    console.log(`🎯 Workspace actuel: ${currentWorkspace}`);

    const otherWorkspaceTabs = tabs.filter(tab => !tab.active && (tab.cookieStoreId || 'default') !== currentWorkspace);
    console.log(`📂 Onglets dans autres workspaces: ${otherWorkspaceTabs.length}`);
    otherWorkspaceTabs.forEach(tab => {
      console.log(`    - Tab ${tab.id}: "${tab.title}" (workspace: ${tab.cookieStoreId || 'default'})`);
    });
  }
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

// 6. Test spécifique Zen workspaces
setTimeout(() => {
  browser.tabs.query({}).then(allTabs => {
    const workspaces = {};
    allTabs.forEach(tab => {
      const ws = tab.cookieStoreId || 'default';
      if (!workspaces[ws]) workspaces[ws] = [];
      workspaces[ws].push(tab);
    });

    console.log('🏢 Analyse des workspaces:');
    Object.entries(workspaces).forEach(([ws, tabs]) => {
      const activeCount = tabs.filter(t => t.active).length;
      const pinnedCount = tabs.filter(t => t.pinned).length;
      console.log(`  ${ws}: ${tabs.length} onglets (${activeCount} actif(s), ${pinnedCount} épinglé(s))`);
    });
  });
}, 1500);