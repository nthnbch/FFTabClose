#!/bin/bash

# FFTabClose - Installation Script for Mozilla Add-ons Review
# This script prepares the build environment and validates source code
# Required by Mozilla for source code submission

set -e  # Exit on any error

echo "🚀 FFTabClose - Mozilla Source Code Installation"
echo "==============================================="
echo "This script validates the build environment for Mozilla Add-ons review"
echo ""

# Colors for output
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
SOURCE_DIR="source"

# Logging functions
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

# Step 1: Environment Check
check_environment() {
    log_info "Checking build environment..."
    
    # Check OS
    OS="$(uname -s)"
    case "${OS}" in
        Linux*)     MACHINE=Linux;;
        Darwin*)    MACHINE=Mac;;
        CYGWIN*)    MACHINE=Cygwin;;
        MINGW*)     MACHINE=MinGw;;
        *)          MACHINE="UNKNOWN:${OS}"
    esac
    log_info "Operating System: $MACHINE"
    
    # Check required tools
    if ! command -v zip &> /dev/null; then
        log_error "zip utility is required but not installed"
        log_info "Install with: sudo apt-get install zip (Ubuntu/Debian) or brew install zip (macOS)"
        exit 1
    fi
    log_success "zip utility found"
    
    if ! command -v bash &> /dev/null; then
        log_error "bash is required but not found"
        exit 1
    fi
    log_success "bash shell found"
    
    # Check optional tools
    if command -v jq &> /dev/null; then
        log_success "jq found - JSON validation available"
        JQ_AVAILABLE=true
    else
        log_warning "jq not found - JSON validation skipped (optional)"
        JQ_AVAILABLE=false
    fi
    
    if command -v git &> /dev/null; then
        log_success "git found"
    else
        log_warning "git not found - version control unavailable"
    fi
    
    log_success "Environment check completed"
}

# Step 2: Verify Source Files
verify_source_files() {
    log_info "Verifying source files..."
    
    # Core files
    required_files=(
        "manifest.json"
        "background.js"
        "popup.html"
        "popup.css"
        "popup.js"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            log_error "Required file missing: $file"
            exit 1
        fi
    done
    log_success "Core files verified"
    
    # Icons directory
    if [[ ! -d "icons" ]]; then
        log_error "Icons directory missing"
        exit 1
    fi
    log_success "Icons directory found"
    
    # Localization directory
    if [[ ! -d "_locales" ]]; then
        log_error "Localization directory missing"
        exit 1
    fi
    
    # Count language files
    lang_count=$(find _locales -name "messages.json" | wc -l)
    log_success "_locales directory found with $lang_count language files"
    
    # Validate JSON if jq is available
    if [[ "$JQ_AVAILABLE" == true ]]; then
        log_info "Validating JSON files..."
        
        if ! jq . manifest.json > /dev/null 2>&1; then
            log_error "manifest.json is invalid JSON"
            exit 1
        fi
        log_success "manifest.json validated"
        
        # Validate all messages.json files
        invalid_files=0
        for file in _locales/*/messages.json; do
            if ! jq . "$file" > /dev/null 2>&1; then
                log_error "Invalid JSON: $file"
                invalid_files=$((invalid_files + 1))
            fi
        done
        
        if [[ $invalid_files -eq 0 ]]; then
            log_success "All localization files validated"
        else
            log_error "$invalid_files localization files have invalid JSON"
            exit 1
        fi
    fi
    
    log_success "Source file verification completed"
}

# Step 3: Clean and prepare build directories
prepare_build() {
    log_info "Preparing build environment..."
    
    # Clean existing build/dist
    if [[ -d "$BUILD_DIR" ]]; then
        rm -rf "$BUILD_DIR"
        log_info "Cleaned existing build directory"
    fi
    
    if [[ -d "$DIST_DIR" ]]; then
        rm -rf "$DIST_DIR"
        log_info "Cleaned existing dist directory"
    fi
    
    # Create directories
    mkdir -p "$BUILD_DIR"
    mkdir -p "$DIST_DIR"
    mkdir -p "$SOURCE_DIR"
    
    log_success "Build directories created"
}

# Step 4: Copy source files to build directory
copy_source_files() {
    log_info "Copying source files to build directory..."
    
    # Copy core files
    cp manifest.json "$BUILD_DIR/"
    cp background.js "$BUILD_DIR/"
    cp popup.html "$BUILD_DIR/"
    cp popup.css "$BUILD_DIR/"
    cp popup.js "$BUILD_DIR/"
    log_success "Core files copied"
    
    # Copy icons
    mkdir -p "$BUILD_DIR/icons"
    cp icons/*.svg "$BUILD_DIR/icons/"
    log_success "Icons copied"
    
    # Copy localization files
    cp -r _locales "$BUILD_DIR/"
    log_success "Localization files copied"
    
    # Copy documentation
    if [[ -f "README.md" ]]; then
        cp README.md "$BUILD_DIR/"
        log_info "README.md copied"
    fi
    
    if [[ -f "LICENSE" ]]; then
        cp LICENSE "$BUILD_DIR/"
        log_info "LICENSE copied"
    fi
    
    log_success "Source files copied to build directory"
}

# Step 5: Create source code archive for Mozilla
create_source_archive() {
    log_info "Creating source code archive for Mozilla review..."
    
    # Files to include in source archive
    source_files=(
        "manifest.json"
        "background.js"
        "popup.html"
        "popup.css"
        "popup.js"
        "icons/"
        "_locales/"
        "build.sh"
        "install.sh"
        "README.md"
        "SOURCE_BUILD_README.md"
        "PRIVACY_POLICY.md"
        "LICENSE"
        "package.json"
    )
    
    # Create source archive
    zip -r "$DIST_DIR/fftabclose-v$VERSION-source.zip" \
        "${source_files[@]}" \
        -x "*.git*" "*.DS_Store*" "node_modules/*" "build/*" "dist/*" \
        > /dev/null 2>&1
    
    source_size=$(ls -lh "$DIST_DIR/fftabclose-v$VERSION-source.zip" | awk '{print $5}')
    log_success "Source archive created: $source_size"
}

# Step 6: Build extension package
build_extension() {
    log_info "Building extension package..."
    
    # Create XPI from build directory
    cd "$BUILD_DIR"
    zip -r "../$DIST_DIR/${EXTENSION_NAME}-v${VERSION}.xpi" . \
        -x "*.DS_Store*" "*.git*" \
        > /dev/null 2>&1
    cd ..
    
    # Get package size
    package_size=$(ls -lh "$DIST_DIR/${EXTENSION_NAME}-v${VERSION}.xpi" | awk '{print $5}')
    
    log_success "Extension package created: $package_size"
}

# Step 7: Verify build output
verify_build() {
    log_info "Verifying build output..."
    
    # Check XPI contents
    file_count=$(unzip -l "$DIST_DIR/${EXTENSION_NAME}-v${VERSION}.xpi" | tail -1 | awk '{print $2}')
    log_info "XPI contains $file_count files"
    
    # Verify essential files in XPI
    essential_files=("manifest.json" "background.js" "popup.html" "popup.js" "popup.css")
    missing_files=0
    
    for file in "${essential_files[@]}"; do
        if ! unzip -l "$DIST_DIR/${EXTENSION_NAME}-v${VERSION}.xpi" | grep -q "$file"; then
            log_error "Missing essential file in XPI: $file"
            missing_files=$((missing_files + 1))
        fi
    done
    
    if [[ $missing_files -eq 0 ]]; then
        log_success "All essential files present in XPI"
    else
        log_error "$missing_files essential files missing from XPI"
        exit 1
    fi
    
    log_success "Build verification completed"
}

# Step 8: Generate installation instructions
generate_instructions() {
    log_info "Generating installation instructions..."
    
    cat > "$DIST_DIR/INSTALLATION_INSTRUCTIONS.txt" << EOF
FFTabClose Extension - Installation Instructions
===============================================

For Mozilla Reviewers:

1. AUTOMATED BUILD (Recommended):
   ./install.sh

2. MANUAL BUILD:
   chmod +x build.sh
   ./build.sh

3. INSTALL IN FIREFOX:
   - Open Firefox
   - Go to about:debugging
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select: dist/fftabclose-v1.0.0.xpi

4. VERIFY FUNCTIONALITY:
   - Extension icon should appear in toolbar
   - Click icon to open popup interface
   - Test settings and manual "close tabs now"

SYSTEM REQUIREMENTS:
- Operating System: macOS, Linux, or Windows
- Firefox 109.0 or later
- Required tools: bash, zip
- Optional tools: jq (for JSON validation)

SOURCE CODE:
- All source files are in plain JavaScript, HTML, CSS
- No transpilation, minification, or build process required
- No external dependencies or node_modules
- Extension uses only native Firefox Web Extensions APIs

PACKAGE CONTENTS:
$(unzip -l dist/${EXTENSION_NAME}-v${VERSION}.xpi)

BUILD DATE: $(date)
PACKAGE SIZE: $(ls -lh "dist/${EXTENSION_NAME}-v${VERSION}.xpi" | awk '{print $5}')
SOURCE SIZE: $(ls -lh "dist/fftabclose-v${VERSION}-source.zip" | awk '{print $5}')
EOF
    
    log_success "Installation instructions generated"
}

# Main execution
main() {
    echo
    log_info "Starting FFTabClose build process for Mozilla review..."
    echo
    
    check_environment
    echo
    
    verify_source_files
    echo
    
    prepare_build
    echo
    
    copy_source_files
    echo
    
    create_source_archive
    echo
    
    build_extension
    echo
    
    verify_build
    echo
    
    generate_instructions
    echo
    
    log_success "🎉 Build completed successfully!"
    echo
    log_info "📦 Files created:"
    log_info "   Extension: dist/${EXTENSION_NAME}-v${VERSION}.xpi"
    log_info "   Source:    dist/fftabclose-v${VERSION}-source.zip"
    log_info "   Build:     build/ directory"
    log_info "   Guide:     dist/INSTALLATION_INSTRUCTIONS.txt"
    echo
    log_info "🚀 Ready for Mozilla Add-ons Store submission!"
    echo
}

# Run main function
main "$@"
