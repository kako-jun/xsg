"""
Path Resolution for XSG Pattern Files

Supports 4 path formats:
1. @/ - Project-relative paths (e.g., "@/images/test.png")
2. Relative paths (e.g., "../images/test.png")
3. Absolute paths (e.g., "/home/user/images/test.png")
4. URLs (e.g., "https://example.com/test.png")

Current directory for relative paths: YAML file's directory
Project root detection: package.json, pyproject.toml, .git/, or cwd
"""

import os
import re
from pathlib import Path
from typing import Optional, Union
from urllib.parse import urlparse


class PathResolver:
    """Path resolver for XSG patterns"""

    def __init__(
        self,
        current_file_path: Optional[str] = None,
        project_root: Optional[str] = None,
    ):
        """
        Initialize path resolver

        Args:
            current_file_path: Current YAML file path (for relative resolution)
            project_root: Project root directory (auto-detected if not provided)
        """
        self.current_file_dir: Optional[Path] = None
        if current_file_path:
            self.set_current_file_path(current_file_path)

        self.project_root: Optional[Path] = None
        if project_root:
            self.project_root = Path(project_root).resolve()
        else:
            self.project_root = self._detect_project_root()

    def resolve(self, path: str) -> str:
        """
        Resolve a path to an absolute path or URL

        Args:
            path: Path to resolve (can be @/, relative, absolute, or URL)

        Returns:
            Resolved absolute path or URL
        """
        # 1. URL: Return as-is
        if self._is_url(path):
            return path

        # 2. Project-relative (@/)
        if path.startswith("@/"):
            return self._resolve_project_relative(path)

        # 3. Absolute path
        if self._is_absolute_path(path):
            return str(Path(path).resolve())

        # 4. Relative path
        return self._resolve_relative(path)

    def _is_url(self, path: str) -> bool:
        """Check if path is a URL"""
        parsed = urlparse(path)
        return parsed.scheme in ("http", "https")

    def _is_absolute_path(self, path: str) -> bool:
        """
        Check if path is absolute

        Windows: C:\\..., D:\\..., \\\\server\\...
        Unix: /...
        """
        # Use pathlib for cross-platform absolute path detection
        return Path(path).is_absolute()

    def _resolve_project_relative(self, path: str) -> str:
        """
        Resolve project-relative path (@/...)

        Args:
            path: Path starting with @/

        Returns:
            Absolute file path
        """
        # Remove @/ prefix
        relative_path = path[2:]

        if self.project_root:
            resolved = self.project_root / relative_path
            return str(resolved.resolve())

        # Fallback: treat as relative to cwd
        resolved = Path.cwd() / relative_path
        return str(resolved.resolve())

    def _resolve_relative(self, path: str) -> str:
        """
        Resolve relative path
        Relative to current YAML file's directory

        Args:
            path: Relative path

        Returns:
            Absolute file path
        """
        if not self.current_file_dir:
            # No current file context, treat as relative to cwd
            resolved = Path.cwd() / path
            return str(resolved.resolve())

        # Combine current directory with relative path
        resolved = self.current_file_dir / path
        return str(resolved.resolve())

    def _detect_project_root(self) -> Optional[Path]:
        """
        Detect project root directory

        Looks for (in order):
        1. package.json (frontend)
        2. pyproject.toml (backend)
        3. .git/ (git repository)
        4. cwd (fallback)

        Returns:
            Project root path
        """
        current = Path.cwd()

        # Check current and parent directories
        for _ in range(10):  # Max 10 levels up
            # Check for markers
            if (current / "package.json").exists():
                return current
            if (current / "pyproject.toml").exists():
                return current
            if (current / ".git").is_dir():
                return current

            # Move up one level
            parent = current.parent
            if parent == current:
                # Reached filesystem root
                break
            current = parent

        # Fallback: cwd
        return Path.cwd()

    def set_current_file_path(self, file_path: str) -> None:
        """
        Update current file path

        Args:
            file_path: Path to current YAML file
        """
        if self._is_url(file_path):
            # For URLs, can't determine directory in traditional sense
            # Store as-is for potential URL-based relative resolution
            self.current_file_dir = None
        else:
            path = Path(file_path).resolve()
            self.current_file_dir = path.parent

    def set_project_root(self, project_root: str) -> None:
        """
        Update project root

        Args:
            project_root: Project root directory path
        """
        self.project_root = Path(project_root).resolve()


# Global default resolver
_default_resolver: Optional[PathResolver] = None


def get_path_resolver(
    current_file_path: Optional[str] = None,
    project_root: Optional[str] = None,
) -> PathResolver:
    """
    Get or create default path resolver

    Args:
        current_file_path: Current YAML file path
        project_root: Project root directory

    Returns:
        PathResolver instance
    """
    global _default_resolver

    if _default_resolver is None:
        _default_resolver = PathResolver(
            current_file_path=current_file_path,
            project_root=project_root,
        )
    else:
        # Update options if provided
        if current_file_path:
            _default_resolver.set_current_file_path(current_file_path)
        if project_root:
            _default_resolver.set_project_root(project_root)

    return _default_resolver


def resolve_path(
    path: str,
    current_file_path: Optional[str] = None,
    project_root: Optional[str] = None,
) -> str:
    """
    Convenience function to resolve a path using the default resolver

    Args:
        path: Path to resolve
        current_file_path: Current YAML file path
        project_root: Project root directory

    Returns:
        Resolved absolute path or URL
    """
    resolver = get_path_resolver(
        current_file_path=current_file_path,
        project_root=project_root,
    )
    return resolver.resolve(path)


def parse_coordinate(coord: Union[int, float, str]) -> dict:
    """
    Parse coordinate value

    Args:
        coord: Coordinate (number or string with %, calc())

    Returns:
        Dictionary with type and value/expr
    """
    # Number: absolute pixels
    if isinstance(coord, (int, float)):
        return {"type": "absolute", "value": coord}

    # String: percentage or calc()
    coord_str = str(coord).strip()

    # Percentage
    if coord_str.endswith("%"):
        try:
            value = float(coord_str[:-1])
            return {"type": "percentage", "value": value}
        except ValueError:
            pass

    # calc() expression
    calc_match = re.match(r"^calc\((.+)\)$", coord_str)
    if calc_match:
        return {"type": "calc", "expr": calc_match.group(1)}

    # Fallback: treat as absolute
    try:
        value = float(coord_str)
        return {"type": "absolute", "value": value}
    except ValueError:
        return {"type": "absolute", "value": 0}


def evaluate_coordinate(coord: Union[int, float, str], container_size: float) -> float:
    """
    Evaluate coordinate value to pixels

    Args:
        coord: Coordinate value
        container_size: Container size (for percentage calculations)

    Returns:
        Pixel value
    """
    parsed = parse_coordinate(coord)

    if parsed["type"] == "absolute":
        return parsed["value"]

    elif parsed["type"] == "percentage":
        return (parsed["value"] / 100) * container_size

    elif parsed["type"] == "calc":
        # Simple calc() evaluation
        return _evaluate_calc_expression(parsed["expr"], container_size)

    return 0


def _evaluate_calc_expression(expr: str, container_size: float) -> float:
    """
    Evaluate calc() expression

    Supports basic arithmetic: +, -, *, /
    Supports: px, %, numbers

    Args:
        expr: Calc expression
        container_size: Container size for percentage calculations

    Returns:
        Evaluated pixel value
    """
    # Replace percentages with pixel values
    def replace_percentage(match):
        percentage = float(match.group(1))
        pixels = (percentage / 100) * container_size
        return str(pixels)

    normalized = re.sub(r"(\d+(?:\.\d+)?)%", replace_percentage, expr)

    # Remove 'px' units
    without_units = normalized.replace("px", "")

    # Evaluate expression (simple evaluation)
    # WARNING: Using eval() - in production, use a proper expression parser
    try:
        # Restrict to basic arithmetic for safety
        if not re.match(r'^[\d\s+\-*/().]+$', without_units):
            return 0
        return float(eval(without_units))
    except Exception:
        return 0
