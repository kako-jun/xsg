#!/bin/bash
# Linux Build Script for XSG
# Builds standalone executable and creates installer package

set -e  # Exit on error

echo "========================================"
echo "XSG Linux Build Script"
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
echo "[4/5] Creating installation package..."
mkdir -p dist/xsg-linux
cp dist/xsg dist/xsg-linux/
cp ../README.md dist/xsg-linux/ 2>/dev/null || true
cp ../LICENSE dist/xsg-linux/ 2>/dev/null || true
cp -r ../playlists dist/xsg-linux/
cp -r ../patterns dist/xsg-linux/

# Create install script
cat > dist/xsg-linux/install.sh << 'EOF'
#!/bin/bash
# XSG Installation Script for Linux

set -e

echo "Installing XSG..."

# Check if running as root for system-wide install
if [ "$EUID" -eq 0 ]; then
    echo "Installing to /usr/local/bin/ (system-wide)..."
    cp xsg /usr/local/bin/
    chmod +x /usr/local/bin/xsg

    # Install playlists and patterns
    mkdir -p /usr/local/share/xsg
    cp -r playlists /usr/local/share/xsg/
    cp -r patterns /usr/local/share/xsg/

    echo ""
    echo "XSG installed successfully!"
    echo "Run 'xsg --help' to get started"
else
    echo "Installing to ~/.local/bin/ (user-only)..."
    mkdir -p ~/.local/bin
    cp xsg ~/.local/bin/
    chmod +x ~/.local/bin/xsg

    # Install playlists and patterns
    mkdir -p ~/.local/share/xsg
    cp -r playlists ~/.local/share/xsg/
    cp -r patterns ~/.local/share/xsg/

    # Add to PATH if not already
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo ""
        echo "Add ~/.local/bin to your PATH by adding this to ~/.bashrc:"
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi

    echo ""
    echo "XSG installed successfully!"
    echo "Run '~/.local/bin/xsg --help' to get started"
fi

# Setup XScreenSaver integration (optional)
read -p "Setup XScreenSaver integration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SCREENSAVER_FILE="$HOME/.xscreensaver"

    if [ -f "$SCREENSAVER_FILE" ]; then
        echo "Adding XSG to XScreenSaver..."

        # Check if already exists
        if grep -q "xsg --screensaver" "$SCREENSAVER_FILE"; then
            echo "XSG already in XScreenSaver config"
        else
            # Backup
            cp "$SCREENSAVER_FILE" "${SCREENSAVER_FILE}.bak"

            # Add to programs
            sed -i '/^programs:/a\  xsg --screensaver --playlist ~/.xsg/screensaver.yaml -root \\n\\' "$SCREENSAVER_FILE"

            echo "XSG added to XScreenSaver"
        fi

        # Copy default screensaver playlist
        mkdir -p ~/.xsg
        cp playlists/random-screensaver.yaml ~/.xsg/screensaver.yaml 2>/dev/null || true

        # Restart XScreenSaver
        xscreensaver-command -restart 2>/dev/null || true

        echo "XScreenSaver integration complete!"
    else
        echo "XScreenSaver config not found. Please set up manually."
    fi
fi
EOF

chmod +x dist/xsg-linux/install.sh

echo ""
echo "[5/5] Creating tarball..."
cd dist
tar -czf xsg-linux-x64.tar.gz xsg-linux/
cd ..

echo ""
echo "========================================"
echo "Build completed successfully!"
echo "========================================"
echo ""
echo "Output files:"
echo "  - dist/xsg (Standalone executable)"
echo "  - dist/xsg-linux-x64.tar.gz (Installation package)"
echo ""
echo "To install:"
echo "  1. Extract: tar -xzf xsg-linux-x64.tar.gz"
echo "  2. Run: cd xsg-linux && ./install.sh"
echo ""
echo "For more information, see SCREENSAVER_INSTALL.md"
echo ""
