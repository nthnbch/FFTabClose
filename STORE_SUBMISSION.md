# FFTabClose - Extension Firefox Store Submission

## Informations pour le store Firefox

### Nom de l'extension
**FFTabClose - Auto Tab Closer**

### Description courte (250 caractères max)
Automatically close non-pinned tabs after a configurable time period. Perfect for productivity and memory management in Firefox and Zen Browser.

### Description détaillée

FFTabClose is a professional Firefox extension that automatically closes unused tabs after a configurable timeout period, helping you maintain a clean browser workspace and optimize memory usage.

**Key Features:**
- ⏰ **Configurable timeout**: Set custom delays from 1 hour to 72 hours
- 📌 **Smart exclusions**: Never closes pinned tabs or tabs with audio
- 🎛️ **Easy configuration**: Modern popup interface with preset options
- 📊 **Real-time statistics**: Monitor tab count and oldest tab age
- 🔧 **Manual controls**: Force close old tabs or reset timers
- 🛡️ **Privacy-focused**: No data collection or external connections
- 🎨 **Modern UI**: Beautiful, responsive interface

**Perfect for:**
- Developers who accumulate documentation tabs
- Researchers managing multiple sources
- Zen Browser users seeking enhanced tab management
- Anyone wanting to optimize browser memory usage

**How it works:**
1. Install the extension and click the icon to configure
2. Set your preferred timeout period (default: 12 hours)
3. The extension automatically tracks tab activity
4. Inactive tabs are closed after the timeout period
5. Pinned tabs and tabs with audio are always preserved

**Privacy & Security:**
- All data stays on your device
- No tracking or analytics
- Minimal required permissions
- Open source code available

Compatible with Firefox 109+ and Zen Browser.

### Tags/Catégories
- Productivity
- Tab Management
- Memory Optimization
- Browser Tools
- Utilities

### Captures d'écran à fournir
1. **Popup interface principale** - Montrant les contrôles et statistiques
2. **Configuration des délais** - Interface de sélection du temps
3. **Extension en action** - Badge de notification après fermeture
4. **Options avancées** - Checkboxes d'exclusion

### Permissions justifiées

1. **"tabs"** - Required to:
   - Monitor tab creation and activation
   - Close expired tabs
   - Check tab properties (pinned, audible)

2. **"storage"** - Required to:
   - Save user configuration settings
   - Persist tab timestamps across browser sessions

3. **"alarms"** - Required to:
   - Schedule periodic checks for expired tabs
   - Ensure reliable operation in Manifest V3

### Support et contact
- **GitHub**: https://github.com/votre-username/FFTabClose
- **Issues**: https://github.com/votre-username/FFTabClose/issues
- **Documentation**: README.md included

### Versions de test
- **Version actuelle**: 1.0.0
- **Minimum Firefox**: 109.0
- **Testé sur**: Firefox 118+, Zen Browser latest

### Politique de confidentialité
FFTabClose does not collect, store, or transmit any personal data. All configuration and usage data remains locally on the user's device. No analytics, tracking, or external connections are made.

### Notes pour les reviewers

Cette extension utilise:
- **Manifest V3** pour la compatibilité future
- **Service Worker** au lieu d'un background script
- **API Alarms** pour un timing précis et fiable
- **Pas de eval() ou code dynamique** - sécurisé
- **Commentaires en anglais** dans le code pour review
- **Structure modulaire** et bien documentée

Le code est entièrement auditable et suit les meilleures pratiques Firefox.

### Fichiers principaux
- `manifest.json` - Configuration Manifest V3
- `background.js` - Service Worker principal  
- `popup.html/css/js` - Interface utilisateur
- `icons/` - Icônes SVG de l'extension
- `README.md` - Documentation complète
