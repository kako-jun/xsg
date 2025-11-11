"""
Pattern Loader for XSG

Loads and validates YAML/JSON pattern files using Pydantic models
"""

import json
from pathlib import Path
from typing import Union

import yaml
from pydantic import ValidationError

from .models import XSGPattern
from .path_resolver import PathResolver


class PatternLoadError(Exception):
    """Exception raised when pattern loading fails"""

    pass


class PatternLoader:
    """Pattern file loader with validation"""

    def __init__(self, project_root: str = None):
        """
        Initialize pattern loader

        Args:
            project_root: Project root directory (auto-detected if not provided)
        """
        self.path_resolver = PathResolver(project_root=project_root)

    def load(self, file_path: str) -> XSGPattern:
        """
        Load and validate a pattern file

        Args:
            file_path: Path to YAML or JSON file (supports all path formats)

        Returns:
            Validated XSGPattern instance

        Raises:
            PatternLoadError: If file cannot be loaded or validation fails
        """
        # Resolve path
        resolved_path = self.path_resolver.resolve(file_path)

        # Update resolver's current file context for relative path resolution
        self.path_resolver.set_current_file_path(resolved_path)

        # Load file content
        try:
            data = self._load_file(resolved_path)
        except Exception as e:
            raise PatternLoadError(f"Failed to load file '{file_path}': {e}")

        # Validate with Pydantic
        try:
            pattern = XSGPattern(**data)
        except ValidationError as e:
            raise PatternLoadError(f"Pattern validation failed: {e}")

        return pattern

    def _load_file(self, path: str) -> dict:
        """
        Load file content from path or URL

        Args:
            path: Resolved file path or URL

        Returns:
            Parsed data as dictionary
        """
        # Check if URL
        if path.startswith(("http://", "https://")):
            return self._load_url(path)
        else:
            return self._load_local_file(path)

    def _load_local_file(self, path: str) -> dict:
        """
        Load local file (YAML or JSON)

        Args:
            path: Local file path

        Returns:
            Parsed data as dictionary
        """
        file_path = Path(path)

        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {path}")

        # Read file content
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Parse based on extension
        suffix = file_path.suffix.lower()

        if suffix in (".yaml", ".yml"):
            return yaml.safe_load(content)
        elif suffix == ".json":
            return json.loads(content)
        else:
            # Try YAML first, then JSON
            try:
                return yaml.safe_load(content)
            except yaml.YAMLError:
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    raise ValueError(f"Unsupported file format: {suffix}")

    def _load_url(self, url: str) -> dict:
        """
        Load pattern from URL

        Args:
            url: URL to YAML or JSON file

        Returns:
            Parsed data as dictionary
        """
        import httpx
        from .proxy_support import get_proxy_for_httpx

        # Get proxy configuration
        proxies = get_proxy_for_httpx()

        # Fetch content
        response = httpx.get(
            url,
            timeout=30.0,
            follow_redirects=True,
            proxies=proxies,
        )
        response.raise_for_status()

        content = response.text

        # Try YAML first, then JSON
        try:
            return yaml.safe_load(content)
        except yaml.YAMLError:
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                raise ValueError(f"Invalid YAML/JSON content from URL: {url}")

    def validate(self, data: dict) -> XSGPattern:
        """
        Validate pattern data without loading from file

        Args:
            data: Pattern data as dictionary

        Returns:
            Validated XSGPattern instance

        Raises:
            PatternLoadError: If validation fails
        """
        try:
            return XSGPattern(**data)
        except ValidationError as e:
            raise PatternLoadError(f"Pattern validation failed: {e}")


# Global loader instance
_default_loader: PatternLoader = None


def get_pattern_loader(project_root: str = None) -> PatternLoader:
    """
    Get or create default pattern loader

    Args:
        project_root: Project root directory

    Returns:
        PatternLoader instance
    """
    global _default_loader

    if _default_loader is None:
        _default_loader = PatternLoader(project_root=project_root)

    return _default_loader


def load_pattern(file_path: str, project_root: str = None) -> XSGPattern:
    """
    Convenience function to load a pattern file

    Args:
        file_path: Path to pattern file
        project_root: Project root directory

    Returns:
        Validated XSGPattern instance
    """
    loader = get_pattern_loader(project_root=project_root)
    return loader.load(file_path)
