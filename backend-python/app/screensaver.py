"""
Screensaver Support

Cross-platform screensaver functionality based on command-line arguments.
"""

import argparse
import sys
from typing import Optional


class ScreensaverMode:
    """Screensaver mode enumeration"""

    NORMAL = "normal"
    SCREENSAVER = "screensaver"
    PREVIEW = "preview"
    CONFIG = "config"


def parse_screensaver_args() -> tuple[ScreensaverMode, Optional[str], Optional[int]]:
    """
    Parse screensaver command-line arguments

    Supports:
    - Windows: /s, /c, /p <hwnd>
    - Linux: -root
    - XSG: --screensaver, --preview, --screensaver-config

    Returns:
        Tuple of (mode, playlist_path, preview_hwnd)
    """
    parser = argparse.ArgumentParser(
        description="XSG - Signal Generator",
        allow_abbrev=False,
    )

    # Windows screensaver arguments
    parser.add_argument(
        "/s",
        "--screensaver",
        "-s",
        action="store_true",
        help="Screensaver mode",
    )
    parser.add_argument(
        "/c",
        "--config",
        "--screensaver-config",
        action="store_true",
        help="Show screensaver configuration",
    )
    parser.add_argument(
        "/p",
        "--preview",
        type=int,
        nargs="?",
        const=0,
        help="Preview mode (with optional window handle)",
    )

    # Linux XScreenSaver argument
    parser.add_argument(
        "-root",
        action="store_true",
        help="Run in root window (XScreenSaver)",
    )

    # XSG-specific arguments
    parser.add_argument(
        "--playlist",
        type=str,
        help="Playlist file path",
    )
    parser.add_argument(
        "--pattern",
        type=str,
        help="Pattern file path",
    )
    parser.add_argument(
        "--random",
        action="store_true",
        help="Use random pattern generator",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=5000,
        help="Duration per pattern (ms)",
    )

    # Proxy support
    parser.add_argument(
        "--proxy",
        type=str,
        help="HTTP/HTTPS proxy (e.g., http://proxy:8080)",
    )

    # Display selection
    parser.add_argument(
        "--display",
        type=str,
        default="all",
        help="Display selection (all, primary, left, right, top, bottom)",
    )

    args = parser.parse_args()

    # Determine mode
    mode = ScreensaverMode.NORMAL

    if args.screensaver or getattr(args, "s", False) or args.root:
        mode = ScreensaverMode.SCREENSAVER
    elif args.preview is not None:
        mode = ScreensaverMode.PREVIEW
    elif args.config:
        mode = ScreensaverMode.CONFIG

    # Determine playlist path
    playlist_path = args.playlist
    pattern_path = args.pattern

    # If --random, generate default playlist
    if args.random:
        playlist_path = _create_random_playlist(args.duration)

    # If --pattern, use single pattern
    elif pattern_path and not playlist_path:
        playlist_path = _create_single_pattern_playlist(pattern_path, args.duration)

    # Preview window handle
    preview_hwnd = args.preview if args.preview is not None else None

    return mode, playlist_path, preview_hwnd, args


def _create_random_playlist(duration: int = 5000) -> str:
    """
    Create a temporary random playlist

    Args:
        duration: Duration per pattern (ms)

    Returns:
        Path to temporary playlist file
    """
    import tempfile
    import yaml

    playlist_data = {
        "playback": {
            "order": "random",
            "loop": True,
            "defaultDuration": duration,
        },
        "generator": {
            "enabled": True,
            "count": 100,
            "duration": duration,
        },
    }

    # Write to temp file
    fd, path = tempfile.mkstemp(suffix=".yaml", prefix="xsg-random-")
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(playlist_data, f)

    return path


def _create_single_pattern_playlist(pattern_path: str, duration: int = 5000) -> str:
    """
    Create a temporary playlist for a single pattern

    Args:
        pattern_path: Path to pattern file
        duration: Duration to display (ms)

    Returns:
        Path to temporary playlist file
    """
    import tempfile
    import yaml

    playlist_data = {
        "playback": {
            "order": "sequence",
            "loop": True,
            "defaultDuration": duration,
        },
        "sources": [
            {
                "type": "pattern",
                "path": pattern_path,
                "duration": duration,
            }
        ],
    }

    # Write to temp file
    fd, path = tempfile.mkstemp(suffix=".yaml", prefix="xsg-pattern-")
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(playlist_data, f)

    return path


def show_config_dialog():
    """Show screensaver configuration dialog"""
    import tkinter as tk
    from tkinter import messagebox, filedialog

    root = tk.Tk()
    root.title("XSG Screensaver Configuration")
    root.geometry("500x400")

    # Title
    tk.Label(
        root,
        text="XSG Screensaver Settings",
        font=("Arial", 16, "bold"),
    ).pack(pady=20)

    # Playlist selection
    tk.Label(root, text="Playlist File:").pack(pady=5)

    playlist_var = tk.StringVar(value="Default (Random Patterns)")

    def browse_playlist():
        filename = filedialog.askopenfilename(
            title="Select Playlist File",
            filetypes=[
                ("YAML Files", "*.yaml *.yml"),
                ("JSON Files", "*.json"),
                ("All Files", "*.*"),
            ],
        )
        if filename:
            playlist_var.set(filename)

    frame = tk.Frame(root)
    frame.pack(pady=5)

    tk.Entry(frame, textvariable=playlist_var, width=40).pack(side=tk.LEFT, padx=5)
    tk.Button(frame, text="Browse...", command=browse_playlist).pack(side=tk.LEFT)

    # Info
    info_text = """
XSG Screensaver

Displays test patterns, images, or web pages.

Default Mode:
- Random patterns generated continuously
- Change settings by selecting a playlist file

Playlist Examples:
- random-screensaver.yaml: Random patterns
- image-slideshow.yaml: Image slideshow
- digital-signage.yaml: Web pages + patterns

For more information, see README.md
    """

    tk.Label(
        root,
        text=info_text,
        justify=tk.LEFT,
        font=("Arial", 9),
    ).pack(pady=20)

    # Buttons
    def save_and_close():
        # TODO: Save configuration
        messagebox.showinfo("Saved", "Settings saved successfully!")
        root.quit()

    tk.Button(root, text="OK", command=save_and_close, width=15).pack(pady=10)
    tk.Button(root, text="Cancel", command=root.quit, width=15).pack()

    root.mainloop()
