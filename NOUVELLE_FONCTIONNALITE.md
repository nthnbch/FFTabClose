# FFTabClose - Nouvelle Fonctionnalité : Mise en Veille des Onglets Épinglés

## 🎉 Fonctionnalité Implémentée

J'ai ajouté une nouvelle fonctionnalité à l'extension FFTabClose qui permet de **décharger (mettre en veille)** les onglets épinglés au lieu de les fermer après le délai configuré.

## 🔧 Modifications Techniques

### 1. Configuration
- Ajout de l'option `discardPinned: true` dans la configuration par défaut
- Nouvelle logique pour distinguer fermeture vs déchargement

### 2. Logique de Background (`background.js`)
- **Nouvelle fonction `getTabAction()`** : Détermine l'action à prendre (close, discard, ou none)
- **Mise à jour de `checkAndCloseTabs()`** : Gère séparément les fermetures et les déchargements
- **API `browser.tabs.discard()`** : Utilisée pour mettre en veille les onglets épinglés
- **Statistiques étendues** : Suivi des onglets épinglés à décharger

### 3. Interface Utilisateur
- **Nouvelle case à cocher** : "Décharger les onglets épinglés (au lieu de les fermer)"
- **Logique d'affichage intelligente** : Masque l'option si "Exclure les onglets épinglés" est activé
- **Nouvelle statistique** : Affichage du nombre d'onglets épinglés à décharger

### 4. Traductions
Ajout des nouvelles clés de traduction dans les 4 langues :
- **Anglais** : "Discard pinned tabs (instead of closing)"
- **Français** : "Décharger les onglets épinglés (au lieu de les fermer)"
- **Espagnol** : "Descargar pestañas fijadas (en lugar de cerrarlas)"
- **Allemand** : "Gepinnte Tabs entladen (anstatt schließen)"

## 🚀 Comportement

### Quand "Décharger les onglets épinglés" est activé :
1. **Onglets normaux** → Fermés après le délai
2. **Onglets épinglés** → Déchargés (unloaded) après le délai
3. **Onglets avec son** → Exclus selon la configuration

### Avantages du déchargement :
- ✅ **Économie de mémoire** : L'onglet est déchargé de la RAM
- ✅ **Onglet toujours visible** : Reste dans la barre d'onglets
- ✅ **Rechargement automatique** : Se recharge au clic
- ✅ **Parfait pour les onglets importants** : Garde l'accès sans impact mémoire

## 📝 Configuration UI

L'interface s'adapte intelligemment :
- Si "Exclure les onglets épinglés" est coché → L'option "Décharger" est masquée
- Si "Exclure les onglets épinglés" est décoché → L'option "Décharger" apparaît
- Les statistiques affichent le nombre d'onglets épinglés à décharger quand applicable

## 🔄 Persistance

- Le compte à rebours persiste à travers les redémarrages de navigateur
- Les onglets déchargés voient leur timestamp remis à zéro pour un nouveau délai
- Configuration sauvegardée automatiquement

## ✅ Tests et Validation

- ✅ Construction réussie sans erreurs
- ✅ Validation du package XPI
- ✅ Toutes les traductions complètes
- ✅ Interface utilisateur cohérente
- ✅ Logique métier robuste

L'extension est maintenant prête avec cette nouvelle fonctionnalité professionnelle !
