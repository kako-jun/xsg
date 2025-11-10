#!/bin/bash
# XSG Development Mode Script

echo "[DEV] Starting XSG in development mode..."
echo ""
echo "Starting backend API server..."
echo "Make sure to run 'npm run dev' in frontend/ directory"
echo ""

# Install dependencies if needed
uv sync

# Run in development mode (assumes Vite dev server is running)
uv run python -m app.main --dev
