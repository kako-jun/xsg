"""
XSG Backend - Signal Generator Desktop Application
FastAPI + PyWebView integrated application
"""

import os
import sys
import threading
import time
from pathlib import Path
from typing import Optional

import uvicorn
import webview
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


# FastAPI application
app = FastAPI(
    title="XSG Signal Generator API",
    description="API for controlling test pattern generation",
    version="0.1.0",
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Models
# ============================================================================


class PatternInfo(BaseModel):
    """Test pattern information"""

    id: str
    name: str
    description: str
    category: str


class GammaSettings(BaseModel):
    """Gamma correction settings"""

    value: float
    enabled: bool


# ============================================================================
# API Endpoints
# ============================================================================


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "XSG Signal Generator API", "version": "0.1.0"}


@app.get("/api/patterns")
async def get_patterns():
    """Get all available test patterns"""
    patterns = [
        {
            "id": "colorbar",
            "name": "Color Bar",
            "description": "SMPTE color bars",
            "category": "basic",
        },
        {
            "id": "gridpattern",
            "name": "Grid Pattern",
            "description": "Geometric grid pattern",
            "category": "geometry",
        },
        {
            "id": "checkerboard",
            "name": "Checkerboard",
            "description": "Black and white checkerboard",
            "category": "geometry",
        },
        {
            "id": "grayscale",
            "name": "Grayscale Ramp",
            "description": "8-step grayscale ramp",
            "category": "calibration",
        },
    ]
    return {"patterns": patterns}


@app.get("/api/patterns/{pattern_id}")
async def get_pattern(pattern_id: str):
    """Get specific pattern information"""
    # In real implementation, this would return pattern-specific data
    return {
        "id": pattern_id,
        "status": "available",
        "message": f"Pattern {pattern_id} is ready",
    }


@app.post("/api/gamma")
async def set_gamma(settings: GammaSettings):
    """Set gamma correction settings"""
    # In real implementation, this would control OS-level gamma
    return {
        "status": "ok",
        "gamma": settings.value,
        "enabled": settings.enabled,
        "message": "Gamma correction updated",
    }


@app.get("/api/gamma")
async def get_gamma():
    """Get current gamma correction settings"""
    return {"gamma": 2.2, "enabled": True}


# ============================================================================
# Static file serving (for production build)
# ============================================================================


def get_frontend_path() -> Path:
    """Get the path to frontend build directory"""
    # Try to find the frontend build directory (Vite builds to dist/)
    current_dir = Path(__file__).parent.parent.parent
    frontend_dist = current_dir / "frontend" / "dist"

    if frontend_dist.exists():
        return frontend_dist

    # Fallback for PyInstaller
    if getattr(sys, "frozen", False):
        base_path = Path(sys._MEIPASS)
        return base_path / "frontend" / "dist"

    return frontend_dist


# Mount static files if frontend build exists
frontend_path = get_frontend_path()
if frontend_path.exists():
    app.mount(
        "/app", StaticFiles(directory=str(frontend_path), html=True), name="frontend"
    )


# ============================================================================
# PyWebView Integration
# ============================================================================


class DesktopAPI:
    """API exposed to PyWebView JavaScript"""

    def get_pattern_list(self):
        """Get list of available patterns (synchronous for js_api)"""
        return [
            "colorbar",
            "gridpattern",
            "checkerboard",
            "grayscale",
        ]

    def set_fullscreen(self, enabled: bool):
        """Toggle fullscreen mode"""
        return {"status": "ok", "fullscreen": enabled}


def start_api_server(host: str = "127.0.0.1", port: int = 8000):
    """Start FastAPI server in background thread"""
    uvicorn.run(app, host=host, port=port, log_level="info")


def create_desktop_window(
    dev_mode: bool = False, api_url: str = "http://127.0.0.1:8000"
):
    """Create PyWebView desktop window"""

    if dev_mode:
        # Development mode: use Vite dev server
        url = "http://localhost:3000"
        print(f"[DEV] Development mode: {url}")
        print("[WARN] Make sure Vite dev server is running (npm run dev)")
    else:
        # Production mode: use FastAPI static files
        url = f"{api_url}/app"
        print(f"[PROD] Production mode: {url}")

    # Create desktop window
    api = DesktopAPI()
    window = webview.create_window(
        title="XSG - Signal Generator",
        url=url,
        fullscreen=True,  # Start in fullscreen
        frameless=True,  # Remove title bar
        resizable=False,
        js_api=api,  # Expose Python API to JavaScript
    )

    # Start webview
    webview.start(debug=dev_mode)


# ============================================================================
# Main Entry Point
# ============================================================================


def main():
    """Main application entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="XSG Signal Generator")
    parser.add_argument(
        "--dev", action="store_true", help="Development mode (use Vite dev server)"
    )
    parser.add_argument("--port", type=int, default=8000, help="API server port")
    parser.add_argument(
        "--api-only", action="store_true", help="Run API server only (no GUI)"
    )

    args = parser.parse_args()

    if args.api_only:
        # API server only mode
        print("🚀 Starting API server...")
        start_api_server(port=args.port)
    else:
        # Desktop application mode
        # Start API server in background thread
        api_thread = threading.Thread(
            target=start_api_server,
            kwargs={"port": args.port},
            daemon=True,
        )
        api_thread.start()

        # Wait for API server to start
        time.sleep(2)

        # Create and start desktop window
        create_desktop_window(
            dev_mode=args.dev, api_url=f"http://127.0.0.1:{args.port}"
        )


if __name__ == "__main__":
    main()
