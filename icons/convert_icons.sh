#!/bin/bash
# Script pour convertir les SVG en PNG

# Vérifie si ImageMagick est installé
if ! command -v convert &> /dev/null
then
    echo "Error: ImageMagick n'est pas installé. Veuillez l'installer avec 'brew install imagemagick'"
    exit 1
fi

# Chemin vers le répertoire des icônes
ICON_DIR="/Users/bubu/Documents/GitHub/FFTabClose/new-extension/icons"
PNG_DIR="$ICON_DIR/png"

# Création du répertoire PNG s'il n'existe pas
mkdir -p "$PNG_DIR"

# Conversion des SVG en PNG
convert "$ICON_DIR/icon-16.svg" "$PNG_DIR/icon-16.png"
convert "$ICON_DIR/icon-48.svg" "$PNG_DIR/icon-48.png"
convert "$ICON_DIR/icon-128.svg" "$PNG_DIR/icon-128.png"

echo "Conversion terminée !"