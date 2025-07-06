# Guide de Soumission Firefox Add-ons Store

## 📋 Checklist de Soumission

### ✅ Fichiers Préparés
- [x] **Extension packagée** : `dist/fftabclose-v1.0.0.xpi`
- [x] **Politique de confidentialité** : `PRIVACY_POLICY.md`
- [x] **Description store** : `STORE_DESCRIPTION.md`
- [x] **Configuration production** : Timeout par défaut 12h
- [x] **Manifest mis à jour** : Développeur et homepage ajoutés

### 🚀 Étapes de Soumission

#### 1. Création du Compte Développeur
- Aller sur [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
- Créer un compte développeur Mozilla
- Confirmer l'email

#### 2. Upload de l'Extension
- Cliquer sur "Submit a New Add-on"
- Uploader le fichier `dist/fftabclose-v1.0.0.xpi`
- Attendre la validation automatique

#### 3. Informations Requises

**Nom** : FFTabClose

**Description courte** (60 caractères max) :
```
Automatically close inactive tabs to boost browser performance
```

**Description détaillée** :
Copier le contenu de la section "Detailed Description" du fichier `STORE_DESCRIPTION.md`

**Politique de confidentialité** :
Copier le contenu complet du fichier `PRIVACY_POLICY.md`

**Catégories** :
- Primary: "Productivity"
- Secondary: "Privacy & Security"

**Tags** :
- tab management
- performance
- automation
- memory optimization
- productivity

#### 4. Captures d'écran
Préparer 3-5 captures d'écran montrant :
1. Interface principale (popup)
2. Paramètres de configuration
3. Statistiques en temps réel
4. Écran "avant/après" avec gestion des onglets

#### 5. Support et Contact
- **Homepage** : https://github.com/nthnbch/FFTabClose
- **Support URL** : https://github.com/nthnbch/FFTabClose/issues
- **Email développeur** : [Votre email]

#### 6. Informations Techniques
- **Version** : 1.0.0
- **Compatibilité** : Firefox 109.0+
- **Permissions utilisées** :
  - `tabs` : Pour détecter et fermer les onglets inactifs
  - `storage` : Pour sauvegarder les préférences utilisateur
  - `alarms` : Pour programmer les vérifications périodiques

### 📝 Réponses aux Questions Fréquentes

**Q: Votre extension collecte-t-elle des données ?**
R: Uniquement des timestamps techniques stockés localement. Aucune donnée personnelle ou transmission externe.

**Q: Comment l'extension améliore-t-elle les performances ?**
R: En fermant automatiquement les onglets inactifs et en déchargeant les onglets épinglés pour libérer la mémoire.

**Q: L'extension fonctionne-t-elle avec Zen Browser ?**
R: Oui, entièrement compatible avec les espaces de travail Zen Browser.

**Q: Puis-je désactiver temporairement l'extension ?**
R: Oui, via le bouton toggle dans l'interface principale.

### 🔍 Points de Révision Mozilla

#### Conformité Vérifiée ✅
- ✅ **Permissions minimales** : Seulement ce qui est nécessaire
- ✅ **Pas de code distant** : Tout self-contained
- ✅ **Code lisible** : Pas d'obfuscation
- ✅ **Fonctionnalité claire** : Pas de surprises
- ✅ **Politique de confidentialité** : Complète et transparente
- ✅ **Pas de collecte abusive** : Données techniques uniquement

#### Avantages Concurrentiels
- ✅ **Innovation** : Premier à offrir le déchargement intelligent des onglets épinglés
- ✅ **Performance** : Optimisé pour minimiser l'impact système
- ✅ **Multilingue** : Support de 15 langues
- ✅ **Open Source** : Code transparent et reviewable
- ✅ **Compatible Multi-fenêtres** : Gère tous les espaces de travail

### 📈 Estimation du Temps d'Approbation
- **Première soumission** : 1-3 semaines
- **Révisions mineures** : 3-7 jours
- **Statut pendant la révision** : Visible dans le dashboard développeur

### 🎯 Prêt pour Soumission !

Votre extension FFTabClose est **100% conforme** aux guidelines Mozilla et prête pour soumission. Tous les éléments nécessaires sont en place pour une approbation réussie.

**Bon courage pour votre soumission ! 🚀**
