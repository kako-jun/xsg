@echo off
REM Windows Build Script for XSG
REM Builds both .exe and .scr (screensaver) versions

echo ========================================
echo XSG Windows Build Script
echo ========================================
echo.

REM Check if running from backend directory
if not exist "app\main.py" (
    echo Error: Please run this script from the backend directory
    exit /b 1
)

REM Check if frontend is built
if not exist "..\frontend\dist\index.html" (
    echo Error: Frontend not built. Please run 'npm run build' in frontend directory first.
    exit /b 1
)

echo [1/4] Installing dependencies...
call uv sync
if errorlevel 1 (
    echo Error: Failed to sync dependencies
    exit /b 1
)

echo.
echo [2/4] Installing PyInstaller...
call uv pip install pyinstaller
if errorlevel 1 (
    echo Error: Failed to install PyInstaller
    exit /b 1
)

echo.
echo [3/4] Building executable with PyInstaller...
call uv run pyinstaller --noconfirm ^
    --onefile ^
    --windowed ^
    --name XSG ^
    --icon=..\frontend\public\favicon.ico ^
    --add-data "..\frontend\dist;frontend\dist" ^
    --add-data "..\patterns;patterns" ^
    --add-data "..\playlists;playlists" ^
    --add-data "..\presets;presets" ^
    --add-data "..\xsg-pattern.schema.json;." ^
    --add-data "..\playlist.schema.json;." ^
    app\main.py

if errorlevel 1 (
    echo Error: PyInstaller build failed
    exit /b 1
)

echo.
echo [4/4] Creating .scr screensaver file...
copy /Y dist\XSG.exe dist\XSG.scr
if errorlevel 1 (
    echo Error: Failed to create .scr file
    exit /b 1
)

echo.
echo ========================================
echo Build completed successfully!
echo ========================================
echo.
echo Output files:
echo   - dist\XSG.exe (Standard executable)
echo   - dist\XSG.scr (Screensaver)
echo.
echo To install as screensaver:
echo   1. Copy dist\XSG.scr to C:\Windows\System32\
echo      (requires administrator privileges)
echo   OR
echo   2. Right-click dist\XSG.scr and select "Install"
echo.
echo For more information, see SCREENSAVER_INSTALL.md
echo.
