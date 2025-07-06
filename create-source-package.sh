#!/bin/bash

# FFTabClose - Source Code Package Creator for Mozilla Review
# Creates a ZIP package containing source code and build instructions

set -e

echo "📦 Creating Source Code Package for Mozilla Review"
echo "================================================="

# Variables
SOURCE_PACKAGE="FFTabClose-source-v1.0.0.zip"
TEMP_DIR="temp_source_package"

# Clean up any existing files
rm -f "$SOURCE_PACKAGE"
rm -rf "$TEMP_DIR"

# Create temporary directory
mkdir -p "$TEMP_DIR"

echo "📁 Copying source files..."

# Copy core source files
cp manifest.json "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.css "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"

# Copy directories
cp -r icons "$TEMP_DIR/"
cp -r _locales "$TEMP_DIR/"

# Copy build and documentation files
cp build.sh "$TEMP_DIR/"
cp install.sh "$TEMP_DIR/"
cp README.md "$TEMP_DIR/"
cp LICENSE "$TEMP_DIR/"
cp PRIVACY_POLICY.md "$TEMP_DIR/"
cp README-BUILD.md "$TEMP_DIR/"
cp SOURCE_BUILD_README.md "$TEMP_DIR/"

# Make scripts executable
chmod +x "$TEMP_DIR/build.sh"
chmod +x "$TEMP_DIR/install.sh"

echo "🗂️  Creating source package..."

# Create ZIP package
cd "$TEMP_DIR"
zip -r "../$SOURCE_PACKAGE" . -x "*.DS_Store*" "*.git*"
cd ..

# Clean up temp directory
rm -rf "$TEMP_DIR"

# Display package info
echo ""
echo "✅ Source code package created: $SOURCE_PACKAGE"
echo "📊 Package size: $(ls -lh "$SOURCE_PACKAGE" | awk '{print $5}')"
echo "📋 Package contents:"
unzip -l "$SOURCE_PACKAGE"

echo ""
echo "📝 Instructions for Mozilla Reviewers:"
echo "======================================"
echo "1. Extract: unzip $SOURCE_PACKAGE"
echo "2. Install: ./install.sh"
echo "3. Build: ./build.sh"
echo "4. Verify: ls dist/fftabclose-v1.0.0.xpi"
echo ""
echo "🎯 Expected result: Identical files between source and built extension"
echo "⚠️  Note: This extension uses NO minification, bundling, or obfuscation"
echo ""
