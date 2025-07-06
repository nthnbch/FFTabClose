#!/bin/bash

# FFTabClose Build Script
# Construit et package l'extension Firefox

set -e

echo "🚀 Construction de FFTabClose..."

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
EXTENSION_NAME="fftabclose"
VERSION="1.0.0"
BUILD_DIR="build"
DIST_DIR="dist"

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification des prérequis
check_requirements() {
    log_info "Vérification des prérequis..."
    
    if ! command -v zip &> /dev/null; then
        log_error "zip n'est pas installé"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq n'est pas installé (optionnel pour la validation JSON)"
    fi
    
    log_success "Prérequis vérifiés"
}

# Validation des fichiers
validate_files() {
    log_info "Validation des fichiers requis..."
    
    required_files=(
        "manifest.json"
        "background.js"
        "popup.html"
        "popup.css"
        "popup.js"
        "icons/icon-16.svg"
        "icons/icon-32.svg"
        "icons/icon-48.svg"
        "icons/icon-128.svg"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Fichier manquant: $file"
            exit 1
        fi
    done
    
    # Validation JSON du manifest
    if command -v jq &> /dev/null; then
        if ! jq empty manifest.json 2>/dev/null; then
            log_error "manifest.json contient du JSON invalide"
            exit 1
        fi
    fi
    
    log_success "Tous les fichiers requis sont présents"
}

# Nettoyage des répertoires
clean_directories() {
    log_info "Nettoyage des répertoires de construction..."
    
    rm -rf "$BUILD_DIR"
    rm -rf "$DIST_DIR"
    
    mkdir -p "$BUILD_DIR"
    mkdir -p "$DIST_DIR"
    
    log_success "Répertoires nettoyés"
}

# Copie des fichiers
copy_files() {
    log_info "Copie des fichiers source..."
    
    # Fichiers principaux
    cp manifest.json "$BUILD_DIR/"
    cp background.js "$BUILD_DIR/"
    cp popup.html "$BUILD_DIR/"
    cp popup.css "$BUILD_DIR/"
    cp popup.js "$BUILD_DIR/"
    
    # Icônes
    mkdir -p "$BUILD_DIR/icons"
    cp icons/*.svg "$BUILD_DIR/icons/"
    
    # Fichiers de localisation
    if [[ -d "_locales" ]]; then
        cp -r _locales "$BUILD_DIR/"
        log_success "Fichiers de localisation copiés"
    fi
    
    # Documentation (optionnelle)
    if [[ -f "README.md" ]]; then
        cp README.md "$BUILD_DIR/"
    fi
    
    log_success "Fichiers copiés vers $BUILD_DIR"
}

# Optimisation des fichiers
optimize_files() {
    log_info "Optimisation des fichiers..."
    
    # Minification CSS (basique)
    if command -v sed &> /dev/null; then
        # Suppression des commentaires CSS et espaces excessifs
        sed -i.bak 's|/\*.*\*/||g' "$BUILD_DIR/popup.css" 2>/dev/null || true
        rm -f "$BUILD_DIR/popup.css.bak" 2>/dev/null || true
    fi
    
    # Suppression des commentaires de développement dans le JS (plus sûr)
    if command -v sed >/dev/null 2>&1; then
        sed -i.bak '/console\.log/d' "$BUILD_DIR/background.js" 2>/dev/null || true
        sed -i.bak '/console\.log/d' "$BUILD_DIR/popup.js" 2>/dev/null || true
        rm -f "$BUILD_DIR/"*.bak 2>/dev/null || true
    fi
    
    log_success "Fichiers optimisés"
}

# Création du package XPI
create_package() {
    log_info "Création du package XPI..."
    
    cd "$BUILD_DIR"
    
    # Nom du fichier XPI avec version
    XPI_NAME="${EXTENSION_NAME}-v${VERSION}.xpi"
    
    # Création du zip
    zip -r "../$DIST_DIR/$XPI_NAME" . -q
    
    cd ..
    
    # Création d'un lien symbolique vers la dernière version
    cd "$DIST_DIR"
    ln -sf "$XPI_NAME" "${EXTENSION_NAME}-latest.xpi"
    cd ..
    
    log_success "Package créé: $DIST_DIR/$XPI_NAME"
}

# Validation du package
validate_package() {
    log_info "Validation du package..."
    
    XPI_PATH="$DIST_DIR/${EXTENSION_NAME}-v${VERSION}.xpi"
    
    # Vérification de la taille
    size=$(stat -f%z "$XPI_PATH" 2>/dev/null || stat -c%s "$XPI_PATH" 2>/dev/null)
    
    if [[ $size -lt 1000 ]]; then
        log_error "Le package semble trop petit ($size bytes)"
        exit 1
    fi
    
    # Vérification du contenu
    if ! unzip -t "$XPI_PATH" &>/dev/null; then
        log_error "Le package XPI est corrompu"
        exit 1
    fi
    
    # Liste du contenu
    log_info "Contenu du package:"
    unzip -l "$XPI_PATH"
    
    log_success "Package validé (taille: $size bytes)"
}

# Affichage des instructions d'installation
show_instructions() {
    log_info "Instructions d'installation:"
    echo ""
    echo "1. Ouvrir Firefox ou Zen Browser"
    echo "2. Aller à about:debugging"
    echo "3. Cliquer sur 'Ce Firefox'"
    echo "4. Cliquer sur 'Charger un module complémentaire temporaire...'"
    echo "5. Sélectionner le fichier: $PWD/$DIST_DIR/${EXTENSION_NAME}-v${VERSION}.xpi"
    echo ""
    echo "Ou glisser-déposer le fichier XPI directement dans Firefox."
    echo ""
    log_success "Build terminé avec succès! 🎉"
}

# Script principal
main() {
    echo "================================"
    echo "🛠️  FFTabClose Build Script"
    echo "================================"
    echo ""
    
    check_requirements
    validate_files
    clean_directories
    copy_files
    optimize_files
    create_package
    validate_package
    show_instructions
}

# Exécution du script principal
main "$@"
