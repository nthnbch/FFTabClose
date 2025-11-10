# FFTabClose

Une extension pour Firefox et Zen Browser qui ferme automatiquement les onglets ouverts depuis plus de 1 minute (pour le test), quel que soit l'espace de travail dans lequel ils se trouvent.

## Fonctionnalités

- Fermeture automatique des onglets plus vieux qu'une durée configurable (1 minute par défaut pour les tests)
- Fonctionne dans tous les espaces de travail/conteneurs de Zen Browser et Firefox
- Ferme tous les onglets basés sur leur âge, y compris les onglets épinglés
- Interface simple pour configurer les paramètres
- Multilingue (Anglais/Français)
- Conserve les informations de temps entre les redémarrages du navigateur

## Installation

### Pour le développement

1. Clonez ce dépôt :
   ```
   git clone https://github.com/nthnbch/FFTabClose.git
   ```

2. Convertissez les icônes SVG en PNG (nécessite ImageMagick) :
   ```
   cd icons
   ./convert_icons.sh
   ```

3. Dans Firefox ou Zen Browser :
   - Ouvrez `about:debugging`
   - Cliquez sur "Ce Firefox" (ou "This Firefox")
   - Cliquez sur "Charger un module temporaire..." (ou "Load Temporary Add-on...")
   - Naviguez jusqu'au dossier de l'extension et sélectionnez le fichier `manifest.json`

### Installation normale

1. Téléchargez la dernière version de l'extension depuis la [page des releases](https://github.com/nthnbch/FFTabClose/releases)
2. Dans Firefox ou Zen Browser, ouvrez `about:addons`
3. Cliquez sur l'icône d'engrenage et sélectionnez "Installer un module depuis un fichier..."
4. Sélectionnez le fichier .xpi téléchargé

## Utilisation

1. Après l'installation, cliquez sur l'icône de l'extension dans la barre d'outils
2. Configurez vos préférences :
   - Activez ou désactivez la fermeture automatique
   - Définissez le nombre d'heures après lequel les onglets doivent être fermés
3. Cliquez sur "Enregistrer" pour appliquer les paramètres

L'extension vérifiera automatiquement toutes les 30 secondes s'il y a des onglets à fermer selon vos paramètres. Les informations sur le temps d'ouverture des onglets sont conservées même si vous fermez et rouvrez le navigateur.

## Création d'une version empaquetée

Pour créer un fichier .xpi installable :

1. Assurez-vous d'avoir convertit les icônes SVG en PNG
2. Utilisez l'outil web-ext :
   ```
   npm install -g web-ext
   web-ext build
   ```
3. Le fichier .xpi sera créé dans le dossier `web-ext-artifacts`

## Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.