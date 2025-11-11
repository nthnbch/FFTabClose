// FFTabClose - Popup Safe Mode
console.log('🔒 Popup Safe Mode: Chargé');

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Popup Safe: DOM chargé');
    
    // Éléments
    const totalTabsEl = document.getElementById('totalTabs');
    const pinnedTabsEl = document.getElementById('pinnedTabs');
    const protectedTabsEl = document.getElementById('protectedTabs');
    const oldTabsEl = document.getElementById('oldTabs');
    const closeAfterEl = document.getElementById('closeAfter');
    const refreshButton = document.getElementById('refreshStats');
    const testButton = document.getElementById('testProcess');
    
    // Fonction pour charger les stats
    async function loadStats() {
        console.log('🔒 Popup Safe: Chargement stats...');
        
        try {
            const response = await browser.runtime.sendMessage({ type: 'getStats' });
            console.log('🔒 Popup Safe: Stats reçues:', response);
            
            if (response && !response.error) {
                totalTabsEl.textContent = response.totalTabs || '0';
                pinnedTabsEl.textContent = response.pinnedTabs || '0';
                protectedTabsEl.textContent = response.protectedTabs || '0';
                oldTabsEl.textContent = response.oldTabs || '0';
                closeAfterEl.textContent = (response.closeAfterMinutes || 30) + ' min';
            } else {
                console.error('🔒 Popup Safe: Erreur dans la réponse:', response);
                totalTabsEl.textContent = 'Erreur';
            }
        } catch (error) {
            console.error('🔒 Popup Safe: Erreur communication:', error);
            totalTabsEl.textContent = 'Erreur';
        }
    }
    
    // Test simulation
    async function runTestSimulation() {
        console.log('🔒 Popup Safe: Lancement test simulation...');
        testButton.textContent = '⏳ Test en cours...';
        testButton.disabled = true;
        
        try {
            const response = await browser.runtime.sendMessage({ type: 'testProcess' });
            console.log('🔒 Popup Safe: Résultat test:', response);
            
            if (response) {
                // Afficher les résultats dans la console (visible dans les dev tools)
                console.log('🔒 RÉSULTAT SIMULATION:');
                console.log(`  - Onglets qui seraient fermés: ${response.tabsToClose.length}`);
                console.log(`  - Onglets épinglés qui seraient mis en veille: ${response.tabsToDiscard.length}`);
                
                // Mettre à jour l'interface
                setTimeout(() => {
                    loadStats();
                }, 1000);
            }
        } catch (error) {
            console.error('🔒 Popup Safe: Erreur test:', error);
        } finally {
            testButton.textContent = '🧪 Test Simulation (Sans Danger)';
            testButton.disabled = false;
        }
    }
    
    // Événements
    refreshButton.addEventListener('click', loadStats);
    testButton.addEventListener('click', runTestSimulation);
    
    // Charger les stats au démarrage
    loadStats();
    
    // Actualiser toutes les 5 secondes
    setInterval(loadStats, 5000);
    
    console.log('🔒 Popup Safe: Initialisé avec succès');
});