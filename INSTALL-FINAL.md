# 🚀 Installation FFTabClose V4.0 - Guide Final

## ⚡ Installation rapide (2 minutes)

### 1. Backup et installation
```bash
# Sauvegarde de l'ancienne version
mkdir backup-$(date +%Y%m%d)
cp manifest.json backup-*/
cp -r background backup-*/
cp -r popup backup-*/

# Installation de la V4.0
mv manifest.json manifest-v3.json
mv manifest-new.json manifest.json

mv background/background.js background/background-v3.js  
mv background/background-new.js background/background.js

mv popup/popup.html popup/popup-v3.html
mv popup/popup.js popup/popup-v3.js
mv popup/popup.css popup/popup-v3.css

mv popup/popup-new.html popup/popup.html
mv popup/popup-new.js popup/popup.js  
mv popup/popup-new.css popup/popup.css
```

### 2. Chargement dans Firefox
1. Ouvrez Firefox
2. Tapez `about:debugging` dans la barre d'adresse
3. Cliquez sur "Ce Firefox" 
4. Cliquez sur "Charger un module complémentaire temporaire"
5. Sélectionnez le fichier `manifest.json`

### 3. Test de fonctionnement (30 secondes)
1. **Ouvrez la console** : F12 → Console
2. **Chargez les tests** : Copiez-collez le contenu de `test-script-firefox.js`
3. **Lancez le test** : Tapez `window.ffTabCloseTests.runAllTests()`
4. **Vérifiez** : Vous devriez voir `🎉 Tous les tests sont passés!`

## ⚙️ Configuration recommandée

### Configuration optimale
1. **Cliquez sur l'icône** FFTabClose dans la barre d'outils
2. **Configurez** :
   - ✅ Activer la fermeture automatique
   - ⏰ Délai : 12 heures (ou votre préférence)
   - 📌 Mettre en veille les onglets épinglés : ✅
   - 🔊 Ne pas fermer les onglets avec audio : ✅
3. **Sauvegardez**

### Test en conditions réelles
```bash
# Créer des onglets de test
# 1. Ouvrez plusieurs onglets normaux
# 2. Épinglez 1-2 onglets  
# 3. Configurez un délai court (1 minute) pour test
# 4. Attendez et observez le comportement
```

## 🎯 Fonctionnement attendu

### Onglets normaux
- ⏰ **Timer** : Se remet à zéro à chaque activation
- 🗑️ **Fermeture** : Automatique après le délai configuré  
- 🎵 **Audio** : Exclus automatiquement si configuré
- 🖱️ **Actifs** : Jamais fermés

### Onglets épinglés  
- 💤 **Mise en veille** : Page de placeholder après le délai
- 🔄 **Auto-restauration** : Se rechargent quand cliqués
- 💾 **URL sauvegardée** : L'URL originale est préservée
- ⚡ **Instantané** : Rechargement immédiat à l'activation

### Workspaces/Containers
- 🌐 **Tous workspaces** : Traitement simultané
- 🏢 **Containers** : Support natif Firefox
- 🦊 **Zen Spaces** : Compatibilité totale
- 📊 **Suivi global** : Statistiques unifiées

## 🐛 Résolution de problèmes

### L'extension ne se charge pas
```bash
# Vérifiez le manifest
cat manifest.json | grep manifest_version
# Doit afficher: "manifest_version": 2

# Vérifiez les erreurs dans about:debugging
# Rechargez l'extension si nécessaire
```

### Les onglets ne se ferment pas
1. **Vérifiez l'activation** : Popup → Extension activée ✅
2. **Vérifiez les logs** : Console F12 → Filtrez "FFTabClose"
3. **Test manuel** : Popup → "Traiter maintenant"
4. **Vérifiez le délai** : Assurez-vous qu'il est écoulé

### Les statistiques ne s'affichent pas
```javascript
// Test dans la console
window.ffTabCloseTests.quickTest()
// Doit afficher les statistiques actuelles
```

### Problème de persistance
```javascript
// Vérifiez les données stockées
browser.storage.local.get().then(console.log)
// Doit montrer tabData et config
```

## 📊 Vérification post-installation

### Checklist de validation ✅

- [ ] Extension chargée sans erreur
- [ ] Interface popup s'ouvre et fonctionne  
- [ ] Configuration se sauvegarde
- [ ] Statistiques s'affichent (nombre d'onglets)
- [ ] Tests automatiques passent (script de test)
- [ ] Onglets normaux se ferment après délai
- [ ] Onglets épinglés se mettent en veille
- [ ] Persistance après redémarrage Firefox
- [ ] Fonctionne sur plusieurs workspaces

### Test de stress (optionnel)
```bash
# 1. Ouvrez 20+ onglets dans différents workspaces
# 2. Épinglez quelques-uns
# 3. Configurez délai 1 minute
# 4. Redémarrez Firefox  
# 5. Vérifiez que tout continue de fonctionner
```

## 🎉 Félicitations !

Votre extension FFTabClose V4.0 est maintenant installée et configurée. Elle fonctionne exactement comme Arc Browser auto-closing tabs :

- 🔄 **Persistance totale** à travers les redémarrages
- 🌐 **Support universel** des workspaces Firefox/Zen
- 💤 **Gestion intelligente** des onglets épinglés  
- 🎵 **Exclusions automatiques** (audio, onglets actifs)
- 📊 **Interface moderne** avec statistiques temps réel

## 📞 Support

En cas de problème :
1. **Consultez les logs** : Console Firefox (F12)
2. **Lancez les tests** : `test-script-firefox.js`  
3. **Vérifiez la config** : Données dans storage Firefox
4. **Reset complet** si nécessaire : Supprimez et réinstallez

L'extension est maintenant prête pour un usage quotidien ! 🚀