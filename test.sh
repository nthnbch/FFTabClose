#!/bin/bash

# Test script for FFTabClose extension
echo "🧪 Testing FFTabClose Extension..."
echo "=================================="

# Check if Firefox is available
if ! command -v firefox &> /dev/null; then
    echo "❌ Firefox not found. Please install Firefox to test the extension."
    exit 1
fi

echo "✅ Firefox found"

# Check if extension files exist
if [ ! -f "dist/fftabclose-v1.0.0.xpi" ]; then
    echo "❌ Extension package not found. Please run ./build.sh first."
    exit 1
fi

echo "✅ Extension package found"

# Check manifest
if [ ! -f "manifest.json" ]; then
    echo "❌ manifest.json not found"
    exit 1
fi

echo "✅ Manifest found"

# Validate manifest
echo "📋 Manifest details:"
cat manifest.json | grep -E "(name|version|description)" | head -3

echo ""
echo "🎯 Test Configuration:"
echo "- Default timeout: 12 hours"
echo "- Exclude pinned: false (allow processing)"
echo "- Exclude audible: true"
echo "- Discard pinned: true"
echo ""

echo "🚀 Testing Instructions:"
echo "1. Install the extension using:"
echo "   - Open Firefox"
echo "   - Go to about:debugging"
echo "   - Click 'This Firefox'"
echo "   - Click 'Load Temporary Add-on'"
echo "   - Select: $(pwd)/dist/fftabclose-v1.0.0.xpi"
echo ""
echo "2. To test with 15 minutes:"
echo "   - Open extension popup"
echo "   - Change timer to '15 minutes'"
echo "   - Create some non-pinned tabs"
echo "   - Wait 15 minutes OR click 'Close old tabs now'"
echo ""
echo "3. To test tab discarding:"
echo "   - Pin some tabs"
echo "   - Make sure 'Discard pinned tabs' is checked"
echo "   - Wait for timeout or use manual button"
echo "   - Pinned tabs should be unloaded but stay visible"
echo ""
echo "4. Debug information:"
echo "   - Click 'Debug' button in popup"
echo "   - Check browser console for logs"
echo ""

echo "✅ Test setup complete!"
