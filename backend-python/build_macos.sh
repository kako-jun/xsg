#!/bin/bash
# macOS Build Script for XSG
# Builds standalone executable and creates .app bundle

set -e  # Exit on error

echo "========================================"
echo "XSG macOS Build Script"
echo "========================================"
echo ""

# Check if running from backend directory
if [ ! -f "app/main.py" ]; then
    echo "Error: Please run this script from the backend directory"
    exit 1
fi

# Check if frontend is built
if [ ! -f "../frontend/dist/index.html" ]; then
    echo "Error: Frontend not built. Please run 'npm run build' in frontend directory first."
    exit 1
fi

echo "[1/5] Installing dependencies..."
uv sync
if [ $? -ne 0 ]; then
    echo "Error: Failed to sync dependencies"
    exit 1
fi

echo ""
echo "[2/5] Installing PyInstaller..."
uv pip install pyinstaller
if [ $? -ne 0 ]; then
    echo "Error: Failed to install PyInstaller"
    exit 1
fi

echo ""
echo "[3/5] Building executable with PyInstaller..."
uv run pyinstaller --noconfirm \
    --onefile \
    --windowed \
    --name xsg \
    --icon=../frontend/public/favicon.ico \
    --add-data "../frontend/dist:frontend/dist" \
    --add-data "../patterns:patterns" \
    --add-data "../playlists:playlists" \
    --add-data "../presets:presets" \
    --add-data "../xsg-pattern.schema.json:." \
    --add-data "../playlist.schema.json:." \
    app/main.py

if [ $? -ne 0 ]; then
    echo "Error: PyInstaller build failed"
    exit 1
fi

echo ""
echo "[4/5] Creating .app bundle..."

APP_NAME="XSG.app"
APP_DIR="dist/$APP_NAME"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

# Clean previous build
rm -rf "$APP_DIR"

# Create directory structure
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Copy executable
cp dist/xsg "$MACOS_DIR/"

# Copy resources
cp -r ../playlists "$RESOURCES_DIR/"
cp -r ../patterns "$RESOURCES_DIR/"
cp ../README.md "$RESOURCES_DIR/" 2>/dev/null || true

# Create Info.plist
cat > "$CONTENTS_DIR/Info.plist" << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>CFBundleExecutable</key>
    <string>xsg</string>
    <key>CFBundleIdentifier</key>
    <string>com.kako-jun.xsg</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>XSG</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.13</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2025 kako-jun. MIT License.</string>
</dict>
</plist>
EOF

# Create PkgInfo
echo "APPL????" > "$CONTENTS_DIR/PkgInfo"

# Make executable
chmod +x "$MACOS_DIR/xsg"

echo ""
echo "[5/5] Creating DMG installer..."

DMG_NAME="XSG-macOS-x64.dmg"
DMG_TEMP="dist/dmg_temp"

# Clean previous DMG
rm -rf "$DMG_TEMP"
rm -f "dist/$DMG_NAME"

# Create temporary directory
mkdir -p "$DMG_TEMP"

# Copy .app bundle
cp -R "$APP_DIR" "$DMG_TEMP/"

# Create Applications symlink
ln -s /Applications "$DMG_TEMP/Applications"

# Create README
cat > "$DMG_TEMP/README.txt" << 'EOF'
XSG - Signal Generator
======================

Installation:
1. Drag XSG.app to Applications folder
2. Open XSG.app from Applications

Command-line usage:
  /Applications/XSG.app/Contents/MacOS/xsg --help

Screensaver usage:
  /Applications/XSG.app/Contents/MacOS/xsg --screensaver --playlist screensaver.yaml

For more information, see:
  https://github.com/kako-jun/xsg
EOF

# Create DMG
if command -v hdiutil &> /dev/null; then
    hdiutil create -volname "XSG" \
        -srcfolder "$DMG_TEMP" \
        -ov -format UDZO \
        "dist/$DMG_NAME"

    echo "DMG created: dist/$DMG_NAME"
else
    echo "Warning: hdiutil not found. Skipping DMG creation."
    echo "You can still use the .app bundle directly."
fi

# Clean up
rm -rf "$DMG_TEMP"

echo ""
echo "========================================"
echo "Build completed successfully!"
echo "========================================"
echo ""
echo "Output files:"
echo "  - dist/xsg (Standalone executable)"
echo "  - dist/XSG.app (macOS application bundle)"
if [ -f "dist/$DMG_NAME" ]; then
    echo "  - dist/$DMG_NAME (DMG installer)"
fi
echo ""
echo "To install:"
echo "  1. Open dist/$DMG_NAME (if created)"
echo "  2. Drag XSG.app to Applications folder"
echo ""
echo "To run from command line:"
echo "  /Applications/XSG.app/Contents/MacOS/xsg --help"
echo ""
echo "For more information, see SCREENSAVER_INSTALL.md"
echo ""
