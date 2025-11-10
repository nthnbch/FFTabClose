# Guide de test pour FFTabClose

Ce guide vous aidera à vérifier que l'extension FFTabClose fonctionne correctement pour fermer les onglets plus vieux que la durée configurée.

## Préparation au test

1. Installez l'extension en mode développement comme décrit dans le README.md
2. L'extension est déjà configurée pour un temps de test de 1 minute (0.016667 heure)

## Test manuel

### Test 1: Vérification de la fonctionnalité de base

1. L'extension est déjà configurée pour vérifier toutes les 30 secondes :
   
   ```javascript
   // Dans la fonction setupPeriodicCheck:
   browser.alarms.create('checkOldTabs', {
     periodInMinutes: 0.5 // Vérifier toutes les 30 secondes pour le test
   });
   ```

2. Modifiez temporairement le fichier `background.js` pour simuler des onglets plus anciens :
   
   ```javascript
   // Dans la fonction trackExistingTabs, remplacez:
   tabs.forEach(tab => {
     // Pour le test, faisons comme si certains onglets étaient déjà vieux
     if (tab.index % 2 === 0) { // Les onglets avec index pair seront considérés comme anciens
       const fakeOldTime = now - (0.016667 * 3600000 + 10000); // Plus vieux que le seuil de 1 minute
       tabOpenTimes.set(tab.id, fakeOldTime);
     } else {
       tabOpenTimes.set(tab.id, now);
     }
   });
   ```

3. Ouvrez plusieurs onglets dans différents espaces de travail
4. Épinglez certains des onglets
5. Activez l'option "Exclure les onglets épinglés" dans les paramètres de l'extension
6. Attendez environ 10 secondes pour que l'alarme se déclenche

### Résultats attendus

- Les onglets avec un index pair non épinglés devraient être fermés automatiquement
- Les onglets épinglés devraient rester ouverts même s'ils ont un index pair
- Les onglets avec un index impair devraient rester ouverts

### Test 2: Vérification des paramètres

1. Désactivez l'option "Exclure les onglets épinglés" dans les paramètres
2. Modifiez la fonction `trackExistingTabs` comme précédemment si nécessaire
3. Attendez que l'alarme se déclenche

### Résultats attendus

- Tous les onglets avec un index pair, y compris les épinglés, devraient être fermés

### Test 3: Désactivation de la fonctionnalité

1. Désactivez la case à cocher "Activer la fermeture automatique" dans les paramètres
2. Modifiez la fonction `trackExistingTabs` comme précédemment si nécessaire
3. Attendez que l'alarme se déclenche (si elle était encore programmée)

### Résultats attendus

- Aucun onglet ne devrait être fermé automatiquement

## Nettoyage après le test

N'oubliez pas de remettre les valeurs originales dans le code si vous souhaitez revenir à un comportement standard (non test) :

1. Pour revenir à une vérification horaire, modifiez dans `setupPeriodicCheck` :
   ```javascript
   browser.alarms.create('checkOldTabs', {
     periodInMinutes: 60 // Vérifier une fois par heure
   });
   ```

2. Pour revenir à une durée de 12 heures, modifiez dans DEFAULT_SETTINGS :
   ```javascript
   closeAfterHours: 12,  // Close tabs after 12 hours by default
   ```

3. Restaurez la fonction `trackExistingTabs` originale :
   ```javascript
   tabs.forEach(tab => {
     tabOpenTimes.set(tab.id, now);
   });
   ```