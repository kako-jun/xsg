#!/bin/bash
# Universal Build Script for XSG
# Detects platform and runs appropriate build script

set -e

echo "========================================"
echo "XSG Universal Build Script"
echo "========================================"
echo ""

# Detect platform
PLATFORM=""
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    PLATFORM="windows"
else
    echo "Error: Unsupported platform: $OSTYPE"
    exit 1
fi

echo "Detected platform: $PLATFORM"
echo ""

# Build frontend first
if [ ! -f "frontend/dist/index.html" ]; then
    echo "[1/2] Building frontend..."
    cd frontend
    npm install
    npm run build
    cd ..
    echo ""
else
    echo "[1/2] Frontend already built (skipping)"
    echo ""
fi

# Build backend
echo "[2/2] Building backend for $PLATFORM..."
cd backend

if [ "$PLATFORM" == "windows" ]; then
    ./build_windows.bat
elif [ "$PLATFORM" == "linux" ]; then
    chmod +x build_linux.sh
    ./build_linux.sh
elif [ "$PLATFORM" == "macos" ]; then
    chmod +x build_macos.sh
    ./build_macos.sh
fi

cd ..

echo ""
echo "========================================"
echo "Build completed!"
echo "========================================"
echo ""
echo "See backend/dist/ for output files"
echo ""
