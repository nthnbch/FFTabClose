# Instructions d'installation FFTabClose

## 🚀 Installation rapide pour Firefox/Zen Browser

### Étape 1: Préparation

1. **Vérifiez votre navigateur**
   - Firefox 57+ ou Zen Browser basé sur Firefox
   - Mode développeur activé (recommandé pour les tests)

2. **Téléchargez les fichiers**
   - Assurez-vous d'avoir tous les fichiers dans le dossier FFTabClose

### Étape 2: Installation temporaire (développement)

1. **Ouvrez Firefox/Zen Browser**

2. **Accédez au mode debug**
   - Tapez `about:debugging` dans la barre d'adresse
   - Appuyez sur Entrée

3. **Sélectionnez "Ce Firefox"**
   - Dans le menu de gauche, cliquez sur "Ce Firefox"

4. **Chargez l'extension**
   - Cliquez sur "Charger un module complémentaire temporaire..."
   - Naviguez vers votre dossier FFTabClose
   - Sélectionnez le fichier `manifest.json`
   - Cliquez sur "Ouvrir"

5. **Vérifiez l'installation**
   - L'extension devrait apparaître dans la liste
   - Une icône FFTabClose devrait être visible dans la barre d'outils

### Étape 3: Configuration initiale

1. **Cliquez sur l'icône FFTabClose**
   - Un popup moderne devrait s'ouvrir

2. **Configurez vos préférences**
   - Activez l'extension (toggle en haut)
   - Choisissez un délai (par défaut: 12 heures)
   - Configurez les options d'exclusion

3. **Testez la fonctionnalité**
   - Ouvrez plusieurs onglets
   - Vérifiez les statistiques dans le popup
   - Testez le bouton "Fermer les anciens maintenant"

## 📦 Création d'un package XPI (production)

### Prérequis
- Terminal/ligne de commande
- Utilitaire `zip` installé

### Commandes

```bash
# Naviguez vers le dossier du projet
cd /Users/bubu/Documents/GitHub/FFTabClose

# Créez le fichier XPI
zip -r fftabclose-v1.0.0.xpi . -x "*.git*" "*.DS_Store*" "README.md" "INSTALL.md" "*.svg"

# Vérifiez le contenu (optionnel)
unzip -l fftabclose-v1.0.0.xpi
```

### Installation du XPI

1. **Ouvrez Firefox**
2. **Installez le fichier XPI**
   - Méthode 1: Glissez-déposez le fichier .xpi dans Firefox
   - Méthode 2: `Ctrl+O` (Cmd+O sur Mac) et sélectionnez le fichier .xpi
3. **Confirmez l'installation**
   - Cliquez sur "Ajouter" dans la popup de confirmation

## 🛠️ Dépannage installation

### Extension non visible
- **Vérifiez** que l'extension est activée dans `about:addons`
- **Redémarrez** Firefox/Zen Browser
- **Vérifiez** les permissions dans les paramètres de l'extension

### Erreurs de manifest
- **Vérifiez** la syntaxe JSON du manifest.json
- **Assurez-vous** que tous les fichiers référencés existent
- **Consultez** la console d'erreurs dans `about:debugging`

### Popup ne s'ouvre pas
- **Vérifiez** que popup.html existe et est syntaxiquement correct
- **Testez** l'ouverture du fichier popup.html directement dans le navigateur
- **Vérifiez** les erreurs JavaScript dans la console

### Extension inactive
- **Vérifiez** les permissions accordées
- **Consultez** les logs du background script
- **Redémarrez** le navigateur

## 🔧 Configuration avancée

### Zen Browser spécifique

Zen Browser étant basé sur Firefox, l'extension est entièrement compatible. Cependant, pour optimiser l'expérience :

1. **Désactivez** les fonctionnalités de gestion d'onglets natives de Zen si elles entrent en conflit
2. **Configurez** FFTabClose avec un délai plus court (6-8h) car Zen Browser est optimisé pour beaucoup d'onglets
3. **Activez** l'exclusion des onglets épinglés pour préserver les "essentials" de Zen

### Paramètres recommandés par cas d'usage

**Développeur web:**
- Délai: 6 heures
- Exclure épinglés: ✅
- Exclure audio: ✅

**Recherche/étude:**
- Délai: 12 heures
- Exclure épinglés: ✅
- Exclure audio: ✅

**Usage général:**
- Délai: 24 heures
- Exclure épinglés: ✅
- Exclure audio: ✅

## 📋 Checklist de validation

Avant de considérer l'installation comme réussie :

- [ ] Extension visible dans about:addons
- [ ] Icône FFTabClose dans la barre d'outils
- [ ] Popup s'ouvre correctement
- [ ] Statistiques s'affichent (nombre d'onglets, etc.)
- [ ] Toggle activation/désactivation fonctionne
- [ ] Slider de délai répond correctement
- [ ] Boutons de preset changent la valeur
- [ ] Options d'exclusion sont sauvegardées
- [ ] "Fermer maintenant" fonctionne sur les onglets test
- [ ] Indicateur de sauvegarde apparaît lors des changements

## 🆘 Support

Si vous rencontrez des problèmes :

1. **Consultez** les logs dans about:debugging
2. **Vérifiez** la compatibilité de votre version Firefox
3. **Testez** avec un profil Firefox vierge
4. **Ouvrez** une issue sur GitHub avec les détails de l'erreur

---

**Installation réussie ? Profitez d'une navigation plus propre ! 🎉**
