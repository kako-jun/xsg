"""
XSG Backend - Signal Generator Desktop Application
FastAPI + PyWebView integrated application
"""

import os
import socket
import sys
import threading
import time
from pathlib import Path
from typing import Optional

import httpx
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
# Application State
# ============================================================================


class AppState:
    """Global application state"""

    def __init__(self, initial_pattern: str = "colorbar"):
        self.current_pattern = initial_pattern
        self.pattern_params = {}  # Additional parameters like steps, color, etc.

    def set_pattern(self, pattern: str, params: dict = None):
        """Set current pattern"""
        self.current_pattern = pattern
        self.pattern_params = params or {}

    def get_pattern(self) -> dict:
        """Get current pattern"""
        return {
            "pattern": self.current_pattern,
            "params": self.pattern_params,
        }


# Global state instance
app_state = AppState()

# Global webview window reference
webview_window = None

# Singleton socket for preventing multiple instances
singleton_socket = None


# ============================================================================
# Models
# ============================================================================


class PatternInfo(BaseModel):
    """Test pattern information"""

    id: str
    name: str
    description: str
    category: str


class PatternSetRequest(BaseModel):
    """Request to set a pattern"""

    pattern: str
    params: dict = {}


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


@app.get("/api/pattern/current")
async def get_current_pattern():
    """Get current active pattern"""
    return app_state.get_pattern()


@app.post("/api/pattern")
async def set_pattern(request: PatternSetRequest):
    """Set current pattern and navigate to it"""
    global webview_window

    # Update state
    app_state.set_pattern(request.pattern, request.params)

    # Build URL with parameters
    url_params = [f"pattern={request.pattern}"]
    for key, value in request.params.items():
        url_params.append(f"{key}={value}")

    url = f"http://localhost:3000/?{'&'.join(url_params)}"

    # Navigate PyWebView window to new URL
    if webview_window:
        try:
            webview_window.load_url(url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load URL: {str(e)}")
    else:
        # If no webview window (e.g., API-only mode), just update state
        pass

    return {
        "status": "ok",
        "pattern": request.pattern,
        "params": request.params,
        "url": url,
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
    dev_mode: bool = False,
    api_url: str = "http://127.0.0.1:8000",
    initial_pattern: str = "colorbar",
):
    """Create PyWebView desktop window"""
    global webview_window

    # Build initial URL with pattern
    if dev_mode:
        # Development mode: use Vite dev server
        base_url = "http://localhost:3000"
        print(f"[DEV] Development mode: {base_url}")
        print("[WARN] Make sure Vite dev server is running (npm run dev)")
    else:
        # Production mode: use FastAPI static files
        base_url = f"{api_url}/app"
        print(f"[PROD] Production mode: {base_url}")

    # Add pattern parameter to URL
    url = f"{base_url}/?pattern={initial_pattern}"
    print(f"[INFO] Initial pattern: {initial_pattern}")

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

    # Store window reference globally
    webview_window = window

    # Start webview
    webview.start(debug=dev_mode)


# ============================================================================
# Singleton Instance Control
# ============================================================================

# Fixed port for singleton check (different from API server port)
SINGLETON_PORT = 19999


def check_singleton() -> bool:
    """
    Check if another instance is already running.
    Returns True if this is the only instance, False otherwise.
    """
    global singleton_socket

    try:
        # Try to bind to singleton port
        singleton_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        singleton_socket.bind(("127.0.0.1", SINGLETON_PORT))
        singleton_socket.listen(1)
        return True  # This is the only instance
    except OSError:
        return False  # Another instance is already running


def send_pattern_to_running_instance(pattern: str, port: int = 8000) -> bool:
    """
    Send pattern change request to running instance via HTTP API.
    Returns True if successful, False otherwise.
    """
    try:
        with httpx.Client(timeout=5.0) as client:
            response = client.post(
                f"http://127.0.0.1:{port}/api/pattern",
                json={"pattern": pattern, "params": {}},
            )
            return response.status_code == 200
    except Exception as e:
        print(f"[ERROR] Failed to communicate with running instance: {e}")
        return False


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
        "--pattern",
        type=str,
        default="colorbar",
        help="Initial pattern to display (default: colorbar)",
    )
    parser.add_argument(
        "--api-only", action="store_true", help="Run API server only (no GUI)"
    )

    args = parser.parse_args()

    # ========================================================================
    # Singleton Instance Check
    # ========================================================================
    if not check_singleton():
        # Another instance is already running
        print(
            f"[INFO] XSG is already running. Sending pattern '{args.pattern}' to existing instance..."
        )

        # Wait a moment for the existing API server to be ready
        time.sleep(0.5)

        # Send pattern to running instance
        if send_pattern_to_running_instance(args.pattern, args.port):
            print(f"[SUCCESS] Pattern changed to '{args.pattern}'")
            sys.exit(0)
        else:
            print("[ERROR] Failed to communicate with existing instance")
            print("[ERROR] Make sure the API server is running on the expected port")
            sys.exit(1)

    # This is the first (and only) instance
    print("[INFO] Starting XSG Signal Generator...")

    # Initialize app state with initial pattern
    global app_state
    app_state = AppState(initial_pattern=args.pattern)

    if args.api_only:
        # API server only mode
        print("[API] Starting API server...")
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
            dev_mode=args.dev,
            api_url=f"http://127.0.0.1:{args.port}",
            initial_pattern=args.pattern,
        )


if __name__ == "__main__":
    main()
