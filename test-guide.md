# Guide de test pour Tab Auto Closer

Ce guide vous aidera à vérifier que l'extension Tab Auto Closer fonctionne correctement pour fermer les onglets plus vieux que la durée configurée.

## Préparation au test

1. Installez l'extension en mode développement comme décrit dans le README.md
2. Assurez-vous que le paramètre `closeAfterHours` est défini sur une valeur très petite (par exemple, 0.05 pour 3 minutes) pour le test

## Test manuel

### Test 1: Vérification de la fonctionnalité de base

1. Modifiez temporairement le fichier `background.js` pour utiliser un délai plus court pour le test :
   
   ```javascript
   // Dans la fonction setupPeriodicCheck, changez:
   browser.alarms.create('checkOldTabs', {
     periodInMinutes: 0.1 // Vérifier toutes les 6 secondes pour le test
   });
   ```

2. Modifiez temporairement le fichier `background.js` pour simuler des onglets plus anciens :
   
   ```javascript
   // Dans la fonction trackExistingTabs, remplacez:
   tabs.forEach(tab => {
     // Pour le test, faisons comme si certains onglets étaient déjà vieux
     if (tab.index % 2 === 0) { // Les onglets avec index pair seront considérés comme anciens
       const fakeOldTime = now - (settings.closeAfterHours * 3600000 + 60000); // Plus vieux que le seuil
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

N'oubliez pas de remettre les valeurs originales dans le code après avoir effectué les tests :

1. Restaurez la période de vérification originale dans `setupPeriodicCheck` :
   ```javascript
   browser.alarms.create('checkOldTabs', {
     periodInMinutes: 60 // Vérifier une fois par heure
   });
   ```

2. Restaurez la fonction `trackExistingTabs` originale :
   ```javascript
   tabs.forEach(tab => {
     tabOpenTimes.set(tab.id, now);
   });
   ```