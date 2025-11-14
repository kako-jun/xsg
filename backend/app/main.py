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
from typing import List, Optional

import httpx
import uvicorn
import webview
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from screeninfo import get_monitors


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

# Global webview window references (list for multi-display support)
webview_windows = []

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
    """Get all available test patterns by scanning patterns/ directory"""
    import yaml

    project_root = Path(__file__).parent.parent.parent
    patterns_dir = project_root / "patterns"

    patterns = []

    if not patterns_dir.exists():
        return {"patterns": []}

    for yaml_file in sorted(patterns_dir.glob("*.yaml")):
        try:
            with open(yaml_file, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)

            # Extract metadata
            pattern_id = yaml_file.stem  # filename without extension
            name = data.get("name", pattern_id.replace("-", " ").title())
            category = data.get("category", "Other")

            patterns.append({
                "id": pattern_id,
                "name": name,
                "category": category,
            })
        except Exception as e:
            print(f"[WARNING] Failed to load pattern {yaml_file}: {e}")
            continue

    return {"patterns": patterns}


@app.get("/api/patterns/{pattern_id}")
async def get_pattern(pattern_id: str, request: Request):
    """
    Get pattern with extends resolution and parameter expansion

    Returns expanded pattern ready for rendering
    """
    from pathlib import Path
    import yaml
    from .models import XSGPattern
    from .pattern_expander import expand_pattern

    try:
        # 1. Load YAML file as dict (no validation yet)
        # patterns/ is in project root, one level up from backend/
        project_root = Path(__file__).parent.parent.parent
        pattern_file = project_root / "patterns" / f"{pattern_id}.yaml"

        if not pattern_file.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Pattern '{pattern_id}' not found at {pattern_file}"
            )

        with open(pattern_file, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        # 2. Get URL query parameters
        query_params = dict(request.query_params)

        # 3. Expand pattern (dict-based, no validation until after expansion)
        from .pattern_expander import expand_pattern_dict
        expanded_data = expand_pattern_dict(data, query_params)

        # 4. Validate expanded data with Pydantic
        expanded_pattern = XSGPattern(**expanded_data)

        # 5. Return as JSON
        return expanded_pattern.model_dump(mode="json", exclude_none=True)

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Pattern file not found: {pattern_id}.yaml"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load pattern: {str(e)}"
        )


@app.get("/api/pattern/current")
async def get_current_pattern():
    """Get current active pattern"""
    return app_state.get_pattern()


@app.post("/api/pattern")
async def set_pattern(request: PatternSetRequest):
    """Set current pattern and navigate to it"""
    global webview_windows

    # Update state
    app_state.set_pattern(request.pattern, request.params)

    # Build URL with parameters
    url_params = [f"pattern={request.pattern}"]
    for key, value in request.params.items():
        url_params.append(f"{key}={value}")

    url = f"http://localhost:3000/?{'&'.join(url_params)}"

    # Navigate all PyWebView windows to new URL
    if webview_windows:
        try:
            for window in webview_windows:
                window.load_url(url)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to load URL: {str(e)}")
    else:
        # If no webview windows (e.g., API-only mode), just update state
        pass

    return {
        "status": "ok",
        "pattern": request.pattern,
        "params": request.params,
        "url": url,
        "windows_count": len(webview_windows),
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
# Multi-Display Support
# ============================================================================


def get_display_info():
    """Get information about all monitors"""
    monitors = get_monitors()
    return [
        {
            "index": i,
            "x": m.x,
            "y": m.y,
            "width": m.width,
            "height": m.height,
            "is_primary": m.is_primary if hasattr(m, "is_primary") else False,
        }
        for i, m in enumerate(monitors)
    ]


def group_displays_by_position(displays, axis="x"):
    """
    Group displays by X or Y coordinate
    Returns list of groups, sorted by coordinate
    """
    from collections import defaultdict

    groups = defaultdict(list)
    for display in displays:
        coord = display[axis]
        groups[coord].append(display)

    # Sort groups by coordinate
    sorted_groups = sorted(groups.items(), key=lambda x: x[0])
    return [group for coord, group in sorted_groups]


def select_displays(display_spec: str, all_displays: List[dict]) -> List[dict]:
    """
    Select displays based on specification string.

    Supported formats:
    - "all": all displays
    - "primary": primary display only
    - "left", "left-2", "left-3": left-to-right groups
    - "right", "right-2": right-to-left groups
    - "top", "top-2": top-to-bottom groups
    - "bottom", "bottom-2": bottom-to-top groups
    - Multiple specs separated by comma: "left,right"
    """
    if not display_spec or display_spec == "all":
        return all_displays

    selected = []
    specs = [s.strip() for s in display_spec.split(",")]

    for spec in specs:
        if spec == "primary":
            primary = [d for d in all_displays if d["is_primary"]]
            selected.extend(primary)

        elif spec.startswith("left"):
            # Group by X coordinate (same X = same vertical column)
            groups = group_displays_by_position(all_displays, axis="x")
            index = 1  # default
            if "-" in spec:
                index = int(spec.split("-")[1])
            if 1 <= index <= len(groups):
                selected.extend(groups[index - 1])

        elif spec.startswith("right"):
            groups = group_displays_by_position(all_displays, axis="x")
            index = 1
            if "-" in spec:
                index = int(spec.split("-")[1])
            # Right means from the end
            if 1 <= index <= len(groups):
                selected.extend(groups[-(index)])

        elif spec.startswith("top"):
            # Group by Y coordinate (same Y = same horizontal row)
            groups = group_displays_by_position(all_displays, axis="y")
            index = 1
            if "-" in spec:
                index = int(spec.split("-")[1])
            if 1 <= index <= len(groups):
                selected.extend(groups[index - 1])

        elif spec.startswith("bottom"):
            groups = group_displays_by_position(all_displays, axis="y")
            index = 1
            if "-" in spec:
                index = int(spec.split("-")[1])
            # Bottom means from the end
            if 1 <= index <= len(groups):
                selected.extend(groups[-(index)])

    # Remove duplicates while preserving order
    seen = set()
    unique_selected = []
    for d in selected:
        key = (d["x"], d["y"], d["width"], d["height"])
        if key not in seen:
            seen.add(key)
            unique_selected.append(d)

    return unique_selected


def print_display_list():
    """Print list of all displays and exit"""
    displays = get_display_info()

    print("[INFO] Available displays:")
    print()

    for i, d in enumerate(displays, 1):
        primary_marker = " (Primary)" if d["is_primary"] else ""
        print(
            f"  Display {i}: {d['width']}x{d['height']} at ({d['x']}, {d['y']}){primary_marker}"
        )

    print()
    print("Position-based groups:")

    # Show left-right groups
    left_groups = group_displays_by_position(displays, axis="x")
    print(f"  Left-to-right: {len(left_groups)} groups")
    for i, group in enumerate(left_groups, 1):
        displays_str = ", ".join(
            [f"{d['width']}x{d['height']}" for d in group]
        )
        print(f"    left-{i}: {displays_str}")

    # Show top-bottom groups
    top_groups = group_displays_by_position(displays, axis="y")
    print(f"  Top-to-bottom: {len(top_groups)} groups")
    for i, group in enumerate(top_groups, 1):
        displays_str = ", ".join(
            [f"{d['width']}x{d['height']}" for d in group]
        )
        print(f"    top-{i}: {displays_str}")

    print()


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


def create_desktop_windows(
    dev_mode: bool = False,
    api_url: str = "http://127.0.0.1:8000",
    initial_pattern: str = "colorbar",
    display_spec: str = "all",
):
    """Create PyWebView desktop windows on selected displays"""
    global webview_windows

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

    # Get all displays and select based on spec
    all_displays = get_display_info()
    selected_displays = select_displays(display_spec, all_displays)

    if not selected_displays:
        print(f"[ERROR] No displays matched specification: {display_spec}")
        sys.exit(1)

    print(f"[INFO] Creating windows on {len(selected_displays)} display(s)")

    # Create window for each selected display
    api = DesktopAPI()
    windows = []

    for i, display in enumerate(selected_displays):
        print(
            f"[INFO] Display {i+1}/{len(selected_displays)}: "
            f"{display['width']}x{display['height']} at ({display['x']}, {display['y']})"
        )

        window = webview.create_window(
            title=f"XSG - Signal Generator ({i+1})",
            url=url,
            x=display["x"],
            y=display["y"],
            width=display["width"],
            height=display["height"],
            fullscreen=False,  # Use manual positioning instead
            frameless=True,  # Remove title bar
            resizable=False,
            js_api=api,  # Expose Python API to JavaScript
        )
        windows.append(window)

    # Store window references globally
    webview_windows = windows

    # Start webview (blocks until all windows are closed)
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
        "--display",
        type=str,
        default="all",
        help='Display selection: "all", "primary", "left", "left-2", "right", "top", "bottom", etc. (default: all)',
    )
    parser.add_argument(
        "--list-displays",
        action="store_true",
        help="List all available displays and exit",
    )
    parser.add_argument(
        "--api-only", action="store_true", help="Run API server only (no GUI)"
    )

    args = parser.parse_args()

    # ========================================================================
    # List Displays Mode
    # ========================================================================
    if args.list_displays:
        print_display_list()
        sys.exit(0)

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

        # Create and start desktop windows on selected displays
        create_desktop_windows(
            dev_mode=args.dev,
            api_url=f"http://127.0.0.1:{args.port}",
            initial_pattern=args.pattern,
            display_spec=args.display,
        )


if __name__ == "__main__":
    main()
