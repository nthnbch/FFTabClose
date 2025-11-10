# FFTabClose V4.0 - Extension Firefox/Zen Auto-Fermeture d'Onglets

## 🎯 Vue d'ensemble

FFTabClose est une extension Firefox/Zen Browser conçue pour fermer automatiquement les onglets anciens et mettre en veille les onglets épinglés, exactement comme la fonctionnalité "Auto-closing tabs" d'Arc Browser.

### ✨ Fonctionnalités principales

- **Fermeture automatique** : Ferme les onglets normaux après un délai configurable
- **Mise en veille des épinglés** : Met en veille (discard) les onglets épinglés au lieu de les fermer
- **Compatible tous workspaces** : Fonctionne sur TOUS les workspaces/spaces Firefox/Zen
- **Persistance totale** : Survit aux redémarrages de Firefox
- **Gestion intelligente** : Exclut les onglets actifs et ceux qui jouent de l'audio
- **Interface moderne** : Popup avec statistiques en temps réel

## 🚀 Installation

### Option 1: Installer les nouveaux fichiers
1. Remplacez `manifest.json` par `manifest-new.json` :
   ```bash
   mv manifest.json manifest-old.json
   mv manifest-new.json manifest.json
   ```

2. Remplacez les fichiers popup :
   ```bash
   mv popup/popup.html popup/popup-old.html
   mv popup/popup.js popup/popup-old.js
   mv popup/popup.css popup/popup-old.css
   
   mv popup/popup-new.html popup/popup.html
   mv popup/popup-new.js popup/popup.js
   mv popup/popup-new.css popup/popup.css
   ```

3. Remplacez le background script :
   ```bash
   mv background/background.js background/background-old.js
   mv background/background-new.js background/background.js
   ```

### Option 2: Installation Firefox
1. Ouvrez Firefox
2. Allez dans `about:debugging`
3. Cliquez sur "Ce Firefox"
4. Cliquez sur "Charger un module complémentaire temporaire"
5. Sélectionnez le fichier `manifest.json`

## ⚙️ Configuration

### Interface utilisateur
- **Activation** : Toggle pour activer/désactiver l'extension
- **Délai** : Choisir entre des durées prédéfinies ou personnalisées
- **Onglets épinglés** : Mettre en veille au lieu de fermer
- **Audio** : Exclure les onglets qui jouent de l'audio
- **Statistiques** : Voir le nombre d'onglets total, anciens et épinglés

### Options de délai
- 1 minute (test)
- 5 minutes, 15 minutes, 30 minutes
- 1 heure, 3 heures, 6 heures
- 12 heures (par défaut), 24 heures
- Délai personnalisé (heures + minutes)

## 🔧 Architecture technique

### Background Script persistant
- **Persistance complète** : Script background persistant pour une continuité garantie
- **Stockage robuste** : Toutes les données sont sauvegardées et restaurées
- **Gestion des événements** : Écoute tous les changements d'onglets et fenêtres
- **Système d'alarmes** : Vérifications périodiques via l'API browser.alarms

### Gestion des onglets
```javascript
// Structure des données d'un onglet
{
  id: number,
  url: string,
  title: string,
  windowId: number,
  cookieStoreId: string, // Pour les workspaces
  pinned: boolean,
  createdAt: timestamp,
  lastActiveAt: timestamp,
  lastSeenAt: timestamp,
  discarded: boolean,
  audible: boolean
}
```

### Stockage des données
- **Storage.local** : Données des onglets (timestamps, états)
- **Storage.sync** : Configuration utilisateur (synchronisée)
- **Persistance** : Survit aux redémarrages et crashs de Firefox

## 🎮 Utilisation

### Contrôle manuel
- **Popup** : Clic sur l'icône pour ouvrir les paramètres
- **Traiter maintenant** : Bouton pour forcer un traitement immédiat
- **Statistiques** : Aperçu en temps réel des onglets

### Comportement automatique
1. **Suivi** : Tous les onglets sont suivis dès leur création
2. **Activité** : Le timer se remet à zéro quand un onglet devient actif
3. **Vérification** : Processus automatique toutes les minutes
4. **Action** :
   - Onglets normaux → Fermeture
   - Onglets épinglés → Mise en veille (discard)
   - Onglets audio → Exclusion (configurable)

## 🌐 Compatible avec

### Navigateurs
- ✅ **Firefox** (toutes versions récentes)
- ✅ **Zen Browser** (tous workspaces/spaces)
- ✅ **Autres dérivés Firefox** avec WebExtensions

### Workspaces/Containers
- ✅ Workspaces Firefox natifs
- ✅ Zen Browser Spaces
- ✅ Container Tabs (contextualIdentities)
- ✅ Multi-Window setup

## 🔍 Fonctionnement interne

### Détection d'activité
- **Focus onglet** : `tabs.onActivated`
- **Focus fenêtre** : `windows.onFocusChanged`
- **Mise à jour onglet** : `tabs.onUpdated`
- **Audio** : Détection automatique via `tab.audible`

### Persistance
```javascript
// Sauvegarde automatique après chaque changement
await browser.storage.local.set({
  tabData: serializableTabData,
  lastSaved: Date.now()
});

// Restauration au démarrage
await loadFromStorage();
await syncWithExistingTabs();
```

### Gestion des workspaces
- Chaque onglet conserve son `cookieStoreId`
- Fonctionne indépendamment du workspace actif
- Traite tous les workspaces simultanément

## 📊 Différences avec l'ancienne version

| Fonctionnalité | V3.x (ancienne) | V4.0 (nouvelle) |
|---|---|---|
| Background script | Non-persistant ❌ | Persistant ✅ |
| Survie redémarrage | Partielle ⚠️ | Complète ✅ |
| Gestion workspaces | Basique ⚠️ | Native ✅ |
| Interface | Simple ⚠️ | Moderne ✅ |
| Statistiques | Aucune ❌ | Temps réel ✅ |
| Onglets épinglés | Fermeture ⚠️ | Mise en veille ✅ |
| Audio detection | Aucune ❌ | Automatique ✅ |
| Configuration | Limitée ⚠️ | Complète ✅ |

## 🐛 Debug et logs

Ouvrez la console Firefox (F12) et filtrez par "FFTabClose" pour voir les logs :

```javascript
// Statistiques en temps réel
console.log(window.ffTabClose.getStats());

// Forcer un traitement
await window.ffTabClose.forceProcess();

// État des données
console.log(window.ffTabClose.tabManager.getAllTabsData());
```

## 🤝 Contribution

Cette extension est maintenant conçue pour être robuste et extensible. Les contributions sont bienvenues pour :

- Nouvelles fonctionnalités
- Optimisations de performance
- Support d'autres navigateurs
- Améliorations de l'interface

## 📝 Changelog V4.0

### 🆕 Nouvelles fonctionnalités
- Architecture complètement repensée
- Background script persistant
- Gestion native des workspaces
- Interface utilisateur moderne
- Statistiques en temps réel
- Mise en veille des onglets épinglés
- Exclusion des onglets audio
- Configuration avancée

### 🔧 Améliorations
- Persistance à travers les redémarrages
- Performance optimisée
- Gestion d'erreurs robuste
- Logs détaillés pour le debug
- API moderne (Manifest V3 ready)

### 🐛 Corrections
- Timer qui ne se sauvegarde pas
- Onglets qui échappent au traitement
- Problèmes avec les workspaces
- Interface qui ne se met pas à jour
- Configuration qui ne persiste pas