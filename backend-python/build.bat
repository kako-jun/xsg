@echo off
REM XSG Build Script for Windows

echo Building XSG Signal Generator...
echo.

REM Step 1: Build frontend
echo Building frontend (Vite)...
cd ..\frontend
call npm install
call npm run build
cd ..\backend

REM Step 2: Install Python dependencies
echo.
echo Installing Python dependencies...
uv sync
uv pip install pyinstaller

REM Step 3: Package with PyInstaller
echo.
echo Packaging desktop application...
pyinstaller --noconfirm ^
    --onefile ^
    --windowed ^
    --name XSG ^
    --add-data "..\frontend\dist;frontend\dist" ^
    app\main.py

echo.
echo Build complete!
echo Output: backend\dist\XSG.exe
echo.
echo To run the application:
echo   dist\XSG.exe
