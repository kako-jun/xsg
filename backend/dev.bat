@echo off
REM XSG Development Mode Script

echo Starting XSG in development mode...
echo.
echo Starting backend API server...
echo Make sure to run 'npm run dev' in frontend\ directory
echo.

REM Install dependencies if needed
uv sync

REM Run in development mode (assumes Vite dev server is running)
uv run python -m app.main --dev
