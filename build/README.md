# FFTabClose - Auto Tab Closer

![Extension Icon](icons/icon-48.svg)

Une extension Firefox professionnelle qui ferme automatiquement les onglets non utilisés après un délai configurable. Parfait pour optimiser les performances et la gestion de la mémoire de votre navigateur.

## 🚀 Fonctionnalités

- ⏰ **Fermeture automatique** des onglets après un délai personnalisable (1h à 72h)
- 📌 **Respect des onglets épinglés** - ne ferme jamais les onglets épinglés
- 🔊 **Protection audio** - exclut les onglets qui diffusent de l'audio
- 📊 **Statistiques en temps réel** - suivi des onglets et de leur âge
- 🎛️ **Interface intuitive** - popup moderne et facile à utiliser
- 🔧 **Configuration flexible** - préréglages rapides ou délai personnalisé
- 💾 **Sauvegarde automatique** - vos préférences sont conservées
- 🛡️ **Sécurisé** - aucune donnée envoyée vers l'extérieur

## 🎯 Cas d'usage

- **Développeurs** : Éviter l'accumulation d'onglets de documentation
- **Chercheurs** : Garder seulement les ressources importantes
- **Utilisateurs Zen Browser** : Améliorer l'expérience de navigation
- **Optimisation mémoire** : Réduire la consommation RAM du navigateur

## 📦 Installation

### Méthode 1: Installation développeur (recommandée pour test)

1. **Télécharger l'extension**
   ```bash
   git clone https://github.com/votre-username/FFTabClose.git
   cd FFTabClose
   ```

2. **Ouvrir Firefox et accéder aux extensions**
   - Tapez `about:debugging` dans la barre d'adresse
   - Cliquez sur "Ce Firefox" dans le menu de gauche
   - Cliquez sur "Charger un module complémentaire temporaire..."

3. **Sélectionner le fichier manifest**
   - Naviguez vers le dossier FFTabClose
   - Sélectionnez le fichier `manifest.json`
   - L'extension sera installée temporairement

### Méthode 2: Installation via fichier XPI (production)

1. **Créer le package XPI**
   ```bash
   cd FFTabClose
   zip -r fftabclose.xpi * -x "*.git*" "*.DS_Store*" "README.md"
   ```

2. **Installer le XPI**
   - Ouvrez Firefox
   - Glissez-déposez le fichier `fftabclose.xpi` dans Firefox
   - Confirmez l'installation

## 🔧 Configuration

### Paramètres principaux

- **État** : Activer/désactiver l'extension
- **Délai de fermeture** : De 1 heure à 72 heures (3 jours)
- **Onglets épinglés** : Exclure automatiquement les onglets épinglés
- **Onglets avec audio** : Exclure les onglets qui diffusent de l'audio

### Préréglages rapides

- **1 heure** : Pour une gestion très stricte
- **6 heures** : Pour une demi-journée de travail
- **12 heures** : Paramètre par défaut (recommandé)
- **24 heures** : Pour conserver les onglets une journée complète

### Actions manuelles

- **Fermer maintenant** : Force la fermeture des onglets éligibles
- **Réinitialiser** : Remet à zéro les compteurs de temps

## 📊 Interface utilisateur

L'extension affiche en temps réel :
- **Nombre total d'onglets** ouverts
- **Onglets éligibles** pour fermeture
- **Âge du plus ancien** onglet (en minutes)

## 🔒 Sécurité et confidentialité

- **Aucune donnée externe** : Tout reste sur votre appareil
- **Permissions minimales** : Seules les permissions nécessaires
- **Code open source** : Entièrement auditable
- **Pas de télémétrie** : Aucun suivi ou analyse

## 🛠️ Développement

### Structure du projet

```
FFTabClose/
├── manifest.json          # Configuration de l'extension
├── background.js          # Logique principale
├── popup.html            # Interface utilisateur
├── popup.css             # Styles de l'interface
├── popup.js              # Interactions utilisateur
├── icons/                # Icônes de l'extension
│   ├── icon-16.svg
│   ├── icon-32.svg
│   ├── icon-48.svg
│   └── icon-128.svg
└── README.md             # Documentation
```

### Architecture technique

- **WebExtensions API** : Compatible Firefox/Chrome
- **Background script** : Surveillance continue des onglets
- **Storage API** : Sauvegarde des préférences utilisateur
- **Tabs API** : Gestion intelligente des onglets

### Fonctionnalités avancées

- **Détection d'état** : Vérifie si les onglets sont actifs, épinglés, ou diffusent de l'audio
- **Gestion temporelle** : Suivi précis de l'âge de chaque onglet
- **Interface réactive** : Mise à jour automatique des statistiques
- **Gestion d'erreurs** : Récupération gracieuse en cas de problème

## 🎨 Personnalisation

### Modifier les délais

Vous pouvez ajuster les délais dans `background.js` :

```javascript
// Délais personnalisés (en millisecondes)
const CUSTOM_DELAYS = {
  quick: 30 * 60 * 1000,     // 30 minutes
  normal: 12 * 60 * 60 * 1000, // 12 heures
  long: 48 * 60 * 60 * 1000   // 48 heures
};
```

### Modifier l'apparence

Les styles sont dans `popup.css`. Vous pouvez :
- Changer les couleurs du thème
- Ajuster la taille du popup
- Modifier les animations

## 🐛 Dépannage

### L'extension ne fonctionne pas

1. **Vérifier les permissions**
   - L'extension a-t-elle accès aux onglets ?
   - Les permissions de stockage sont-elles accordées ?

2. **Consulter la console**
   - Ouvrez `about:debugging`
   - Cliquez sur "Inspecter" à côté de l'extension
   - Vérifiez les erreurs dans la console

3. **Réinstaller l'extension**
   - Supprimez l'extension
   - Redémarrez Firefox
   - Réinstallez l'extension

### Les onglets ne se ferment pas

1. **Vérifier la configuration**
   - L'extension est-elle activée ?
   - Le délai est-il approprié ?

2. **Vérifier les exclusions**
   - Les onglets sont-ils épinglés ?
   - Diffusent-ils de l'audio ?
   - Sont-ils actuellement actifs ?

## 🤝 Contribution

1. **Fork** le projet
2. **Créer** une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. **Commiter** vos changements (`git commit -am 'Ajouter nouvelle fonctionnalite'`)
4. **Pusher** vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. **Créer** une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🙏 Remerciements

- **Arc Browser** : Inspiration pour la fonctionnalité de fermeture automatique
- **Zen Browser** : Compatibilité et test sur cette variante Firefox
- **Communauté Firefox** : Pour les APIs et la documentation

## 📞 Support

- **Issues** : [GitHub Issues](https://github.com/votre-username/FFTabClose/issues)
- **Email** : support@fftabclose.extension
- **Documentation** : [Wiki du projet](https://github.com/votre-username/FFTabClose/wiki)

---

**Fait avec ❤️ pour améliorer votre expérience de navigation**
