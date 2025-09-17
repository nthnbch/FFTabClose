#!/bin/bash
# Script de build pour créer un fichier XPI propre

# Créer un dossier temporaire
echo "Création du dossier temporaire pour le build..."
TMP_DIR=$(mktemp -d)

# Copier tous les fichiers nécessaires
echo "Copie des fichiers dans le dossier temporaire..."
cp -r background.js browser-polyfill.min.js manifest.json icons _locales info popup "$TMP_DIR"
cp README.md "$TMP_DIR"

# Créer le fichier XPI
echo "Création du fichier XPI..."
cd "$TMP_DIR"
zip -r ../fftabclose.xpi *

# Déplacer le XPI vers le dossier dist
echo "Déplacement du XPI vers le dossier dist..."
mkdir -p ../dist
mv ../fftabclose.xpi ../dist/

# Nettoyer
echo "Nettoyage..."
cd ..
rm -rf "$TMP_DIR"

echo "Build terminé! Le fichier XPI est disponible dans le dossier dist/"
