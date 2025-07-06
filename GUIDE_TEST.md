# Guide de Test FFTabClose

## 🐛 Problèmes Identifiés et Corrections

### Problèmes Trouvés
1. **Onglets épinglés jamais enregistrés** - Les timestamps n'étaient créés que pour les onglets non-épinglés
2. **Logique de mise à jour incomplète** - Les onglets épinglés n'étaient pas trackés
3. **Manque de logging** - Difficile de diagnostiquer les problèmes

### Corrections Appliquées
1. ✅ **Tous les onglets sont maintenant trackés** - Épinglés et non-épinglés
2. ✅ **Logging détaillé ajouté** - Pour diagnostiquer les problèmes
3. ✅ **Fonction de debug ajoutée** - Bouton "Debug" dans l'interface

## 🧪 Comment Tester

### 1. Installer l'Extension
```bash
# Dans le dossier FFTabClose
./build.sh
# Puis installer le fichier XPI dans Firefox
```

### 2. Configuration pour Test Rapide
1. Ouvrir le popup de l'extension
2. Changer le délai à **15 minutes**
3. S'assurer que l'extension est **activée**

### 3. Créer des Onglets de Test
1. **Ouvrir 3-4 onglets normaux** (ex: différents sites web)
2. **Épingler 1-2 onglets** (clic droit → "Épingler l'onglet")
3. **Attendre 15+ minutes** OU utiliser le bouton "Fermer anciens onglets maintenant"

### 4. Utiliser le Debug
1. Cliquer sur le bouton **"Debug"** dans le popup
2. Ouvrir la **Console de développement** (F12)
3. Regarder les informations détaillées :
   - Configuration actuelle
   - Timestamps de chaque onglet
   - Âge de chaque onglet
   - Action prévue pour chaque onglet

### 5. Test Manuel
1. Cliquer sur **"Fermer les anciens onglets maintenant"**
2. Observer le comportement :
   - Les onglets normaux anciens doivent être **fermés**
   - Les onglets épinglés anciens doivent être **déchargés** (si l'option est activée)

## 🔍 Vérifications dans la Console

Ouvrir **about:debugging** → **Ce Firefox** → Extension → **Inspecter**

### Messages à Surveiller
```
FFTabClose: Extension initialized
FFTabClose: Initialized timestamps for X existing tabs
FFTabClose: Registered new tab XXX
FFTabClose: Manual check triggered
FFTabClose: Checking X tabs (timeout: 900000ms)
Tab XXX: age=XXmin, timeout=15min, pinned=false, audible=false
Tab XXX is EXPIRED (XXmin > 15min)
FFTabClose: Closing X expired tabs
```

### Troubleshooting

#### Si aucun onglet n'est fermé :
1. Vérifier que `enabled: true` dans le debug
2. Vérifier que les timestamps existent
3. Vérifier que l'âge > délai configuré

#### Si les onglets épinglés sont fermés au lieu d'être déchargés :
1. Vérifier `excludePinned: false` et `discardPinned: true`
2. Regarder les logs pour voir l'action prévue

#### Si le bouton ne fonctionne pas :
1. Regarder la console pour les erreurs
2. Vérifier que le message `Manual check triggered` apparaît

## 📊 Comportement Attendu

### Configuration par Défaut
- `enabled: true`
- `excludePinned: true` (les onglets épinglés sont exclus)
- `discardPinned: true` (si pas exclus, ils sont déchargés)
- `excludeAudible: true`

### Test avec 15 Minutes
1. **Onglets récents** (< 15min) → Aucune action
2. **Onglets anciens normaux** (> 15min) → Fermés
3. **Onglets anciens épinglés** (> 15min) → Déchargés (si discardPinned=true) ou exclus
4. **Onglets avec audio** → Exclus

### Vérification Visuelle
- **Onglets fermés** : Disparaissent complètement
- **Onglets déchargés** : Restent visibles mais deviennent grisés avec un indicateur de rechargement

## 🔧 Debug Mode

Le bouton "Debug" vous donne accès à :
- Configuration actuelle complète
- Liste de tous les onglets avec leur âge exact
- Action prévue pour chaque onglet
- Timestamps bruts pour diagnostic

Cette information est cruciale pour comprendre pourquoi l'extension ne fonctionne pas comme attendu.
