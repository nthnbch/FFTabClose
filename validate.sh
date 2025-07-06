#!/bin/bash

# FFTabClose Store Validation Script
# Vérifie que l'extension respecte les standards du Firefox Add-ons Store

set -e

echo "🔍 Validation FFTabClose pour Firefox Store..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
PASSED=0
FAILED=0
WARNINGS=0

# Fonctions d'affichage
pass() {
    echo -e "${GREEN}✅ $1${NC}"
    PASSED=$((PASSED + 1))
}

fail() {
    echo -e "${RED}❌ $1${NC}"
    FAILED=$((FAILED + 1))
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Validation du manifest.json
echo ""
info "Validation du manifest.json..."

if [[ -f "manifest.json" ]]; then
    pass "manifest.json existe"
    
    # Vérifier Manifest V3
    if grep -q '"manifest_version": 3' manifest.json; then
        pass "Utilise Manifest V3"
    else
        fail "Doit utiliser Manifest V3"
    fi
    
    # Vérifier les champs requis
    required_fields=("name" "version" "description" "permissions")
    for field in "${required_fields[@]}"; do
        if grep -q "\"$field\"" manifest.json; then
            pass "Champ '$field' présent"
        else
            fail "Champ '$field' manquant"
        fi
    done
    
    # Vérifier la version
    if grep -q '"version": "1.0.0"' manifest.json; then
        pass "Version correcte (1.0.0)"
    else
        warn "Version pourrait être mise à jour"
    fi
    
    # Vérifier les permissions
    if grep -q '"tabs"' manifest.json; then
        pass "Permission 'tabs' déclarée"
    else
        fail "Permission 'tabs' manquante"
    fi
    
    if grep -q '"storage"' manifest.json; then
        pass "Permission 'storage' déclarée"
    else
        fail "Permission 'storage' manquante"
    fi
    
    if grep -q '"alarms"' manifest.json; then
        pass "Permission 'alarms' déclarée"
    else
        fail "Permission 'alarms' manquante"
    fi
    
else
    fail "manifest.json manquant"
fi

# Validation des fichiers JavaScript
echo ""
info "Validation des fichiers JavaScript..."

if [[ -f "background.js" ]]; then
    pass "background.js existe"
    
    # Vérifier l'absence de code dangereux
    if grep -q "eval(" background.js; then
        fail "Utilisation d'eval() détectée (non autorisé)"
    else
        pass "Pas d'eval() détecté"
    fi
    
    if grep -q "innerHTML" background.js; then
        warn "Utilisation d'innerHTML détectée (potentiellement risqué)"
    else
        pass "Pas d'innerHTML détecté"
    fi
    
    # Vérifier les APIs utilisées
    if grep -q "browser\." background.js; then
        pass "Utilise l'API WebExtensions standard"
    else
        warn "N'utilise pas l'API browser standard"
    fi
    
    # Vérifier les commentaires en anglais
    if grep -q "/\*\*" background.js; then
        pass "Documentation JSDoc présente"
    else
        warn "Documentation JSDoc manquante"
    fi
    
else
    fail "background.js manquant"
fi

if [[ -f "popup.js" ]]; then
    pass "popup.js existe"
    
    # Mêmes vérifications que background.js
    if grep -q "eval(" popup.js; then
        fail "Utilisation d'eval() détectée dans popup.js"
    else
        pass "Pas d'eval() dans popup.js"
    fi
    
else
    fail "popup.js manquant"
fi

# Validation de l'interface utilisateur
echo ""
info "Validation de l'interface utilisateur..."

if [[ -f "popup.html" ]]; then
    pass "popup.html existe"
    
    # Vérifier DOCTYPE
    if grep -q "<!DOCTYPE html>" popup.html; then
        pass "DOCTYPE HTML5 correct"
    else
        fail "DOCTYPE HTML5 manquant"
    fi
    
    # Vérifier meta charset
    if grep -q 'charset="utf-8"' popup.html || grep -q "charset='utf-8'" popup.html; then
        pass "Charset UTF-8 défini"
    else
        warn "Charset UTF-8 pourrait être explicite"
    fi
    
else
    fail "popup.html manquant"
fi

if [[ -f "popup.css" ]]; then
    pass "popup.css existe"
else
    fail "popup.css manquant"
fi

# Validation des icônes
echo ""
info "Validation des icônes..."

icon_sizes=(16 32 48 128)
for size in "${icon_sizes[@]}"; do
    if [[ -f "icons/icon-${size}.svg" ]]; then
        pass "Icône ${size}x${size} existe (SVG)"
    else
        warn "Icône ${size}x${size} manquante"
    fi
done

# Validation de la documentation
echo ""
info "Validation de la documentation..."

if [[ -f "README.md" ]]; then
    pass "README.md existe"
    
    # Vérifier les sections importantes
    if grep -q "# FFTabClose" README.md; then
        pass "Titre principal présent"
    else
        warn "Titre principal pourrait être amélioré"
    fi
    
    if grep -q "Installation" README.md; then
        pass "Section installation présente"
    else
        warn "Section installation manquante"
    fi
    
else
    warn "README.md manquant"
fi

if [[ -f "LICENSE" ]]; then
    pass "LICENSE existe"
else
    warn "LICENSE manquant (recommandé pour le store)"
fi

# Validation de la structure de packaging
echo ""
info "Validation du packaging..."

if [[ -f "build.sh" ]]; then
    pass "Script de build présent"
else
    warn "Script de build manquant"
fi

if [[ -d "dist" ]]; then
    pass "Dossier dist existe"
    
    if [[ -f "dist/fftabclose-v1.0.0.xpi" ]]; then
        pass "Package XPI généré"
        
        # Vérifier la taille du package
        size=$(stat -f%z "dist/fftabclose-v1.0.0.xpi" 2>/dev/null || stat -c%s "dist/fftabclose-v1.0.0.xpi" 2>/dev/null)
        if [[ $size -gt 0 ]]; then
            pass "Package XPI non vide ($size bytes)"
        else
            fail "Package XPI vide"
        fi
        
        # Vérifier que le package est valide
        if unzip -t "dist/fftabclose-v1.0.0.xpi" &>/dev/null; then
            pass "Package XPI valide"
        else
            fail "Package XPI corrompu"
        fi
    else
        fail "Package XPI manquant"
    fi
else
    warn "Dossier dist manquant"
fi

# Validation des bonnes pratiques
echo ""
info "Validation des bonnes pratiques..."

# Vérifier l'absence de fichiers inutiles
bad_files=(".DS_Store" "Thumbs.db" "*.log" "node_modules")
for pattern in "${bad_files[@]}"; do
    if find . -name "$pattern" -type f 2>/dev/null | grep -q .; then
        warn "Fichiers temporaires détectés: $pattern"
    else
        pass "Pas de fichiers temporaires: $pattern"
    fi
done

# Vérifier la taille totale
total_size=$(du -sh . | cut -f1)
info "Taille totale du projet: $total_size"

# Résumé
echo ""
echo "=============================="
echo "📊 RÉSUMÉ DE LA VALIDATION"
echo "=============================="
echo -e "${GREEN}✅ Tests réussis: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Avertissements: $WARNINGS${NC}"
echo -e "${RED}❌ Tests échoués: $FAILED${NC}"
echo ""

if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 Extension prête pour soumission au store Firefox!${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "1. Créer un compte développeur Firefox"
    echo "2. Soumettre le fichier dist/fftabclose-v1.0.0.xpi"
    echo "3. Remplir les métadonnées (voir STORE_SUBMISSION.md)"
    echo "4. Ajouter des captures d'écran"
    echo "5. Attendre la review (généralement 1-7 jours)"
    exit 0
else
    echo -e "${RED}⚠️  Des problèmes doivent être corrigés avant soumission${NC}"
    exit 1
fi
