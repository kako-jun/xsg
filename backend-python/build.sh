#!/bin/bash
# XSG Build Script for Linux/macOS

set -e

echo "[BUILD] Building XSG Signal Generator..."

# Step 1: Build frontend
echo ""
echo "[BUILD] Building frontend (Vite)..."
cd ../frontend
npm install
npm run build
cd ../backend

# Step 2: Install Python dependencies
echo ""
echo "[BUILD] Installing Python dependencies..."
uv sync
uv pip install pyinstaller

# Step 3: Package with PyInstaller
echo ""
echo "[BUILD] Packaging desktop application..."
pyinstaller --noconfirm \
    --onefile \
    --windowed \
    --name XSG \
    --add-data "../frontend/dist:frontend/dist" \
    app/main.py

echo ""
echo "[SUCCESS] Build complete!"
echo "[INFO] Output: backend/dist/XSG"
echo ""
echo "To run the application:"
echo "  ./dist/XSG"
