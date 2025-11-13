"""
Pattern Expander for XSG

Handles template inheritance (extends) and parameter expansion ({{paramName}})
Similar to frontend/src/lib/paramExpander.ts
"""

import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

from .models import ParamDef, XSGPattern


class PatternExpander:
    """Pattern expander with extends resolution and parameter substitution"""

    def __init__(self, patterns_dir: str = None):
        """
        Initialize pattern expander

        Args:
            patterns_dir: Directory containing pattern files (defaults to project_root/patterns)
        """
        if patterns_dir is None:
            # Default to project_root/patterns
            project_root = Path(__file__).parent.parent.parent
            patterns_dir = str(project_root / "patterns")
        self.patterns_dir = Path(patterns_dir)

    def expand(
        self, pattern: XSGPattern, user_params: Optional[Dict[str, Any]] = None
    ) -> XSGPattern:
        """
        Expand pattern with parameter substitution

        Args:
            pattern: Pattern definition with {{paramName}} variables
            user_params: User-provided parameter values (from URL query or API)

        Returns:
            Pattern with expanded parameters
        """
        user_params = user_params or {}

        # Merge default params with user params
        params = self._resolve_params(pattern.params or {}, user_params)

        # Deep clone and expand
        pattern_dict = pattern.model_dump(mode="json", exclude_none=True)
        expanded_dict = self._expand_object(pattern_dict, params)

        # Return as XSGPattern
        return XSGPattern(**expanded_dict)

    def resolve_extends(self, pattern: XSGPattern) -> XSGPattern:
        """
        Resolve template inheritance (extends)

        Args:
            pattern: Pattern that may have extends property

        Returns:
            Resolved pattern with base pattern merged
        """
        if not pattern.extends:
            return pattern

        # Load base pattern
        base_pattern = self._load_pattern_file(pattern.extends)

        # Recursively resolve base pattern's extends
        resolved_base = self.resolve_extends(base_pattern)

        # Merge base and child patterns
        merged = self._merge_patterns(resolved_base, pattern)

        return merged

    def _resolve_params(
        self, param_defs: Dict[str, ParamDef], user_params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Resolve parameter values (default + user overrides)

        Args:
            param_defs: Parameter definitions
            user_params: User-provided values

        Returns:
            Resolved parameter values
        """
        resolved = {}

        for key, param_def in param_defs.items():
            if key in user_params:
                # User provided value - coerce to correct type
                resolved[key] = self._coerce_type(user_params[key], param_def.type.value)
            elif param_def.default is not None:
                # Default value
                resolved[key] = param_def.default

        return resolved

    def _coerce_type(self, value: Any, param_type: str) -> Any:
        """
        Coerce value to the specified type

        Args:
            value: Value to coerce
            param_type: Target type ('number', 'string', 'color', 'boolean')

        Returns:
            Coerced value
        """
        if param_type == "number":
            return float(value) if "." in str(value) else int(value)
        elif param_type == "boolean":
            if isinstance(value, bool):
                return value
            return str(value).lower() == "true"
        elif param_type in ("string", "color"):
            return str(value)
        else:
            return value

    def _expand_object(self, obj: Any, params: Dict[str, Any]) -> Any:
        """
        Recursively expand {{paramName}} in all string values

        Args:
            obj: Object to expand
            params: Parameter values

        Returns:
            Expanded object
        """
        if isinstance(obj, str):
            return self._expand_string(obj, params)
        elif isinstance(obj, dict):
            return {key: self._expand_object(value, params) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._expand_object(item, params) for item in obj]
        else:
            return obj

    def _expand_string(self, s: str, params: Dict[str, Any]) -> Any:
        """
        Expand {{paramName}} in a single string

        Args:
            s: String to expand
            params: Parameter values

        Returns:
            Expanded value (may be string or original type if single variable)
        """
        # Check if the entire string is a single variable reference
        single_var_match = re.match(r"^{{(\w+)}}$", s)
        if single_var_match:
            param_name = single_var_match.group(1)
            if param_name in params:
                return params[param_name]
            return s

        # Replace all {{paramName}} occurrences
        def replace_var(match):
            param_name = match.group(1)
            if param_name in params:
                return str(params[param_name])
            return match.group(0)  # Keep original if param not found

        return re.sub(r"{{(\w+)}}", replace_var, s)

    def _merge_patterns(self, base: XSGPattern, child: XSGPattern) -> XSGPattern:
        """
        Merge base and child patterns

        Args:
            base: Base pattern (from extends)
            child: Child pattern

        Returns:
            Merged pattern
        """
        # Merge params: individual property merging (child overrides base)
        merged_params = {}
        if base.params:
            merged_params = deepcopy(base.params)

        if child.params:
            for key, child_param in child.params.items():
                if key in merged_params:
                    # Merge child param properties with base param
                    base_param_dict = merged_params[key].model_dump(exclude_none=True)
                    child_param_dict = child_param.model_dump(exclude_none=True)
                    base_param_dict.update(child_param_dict)
                    merged_params[key] = ParamDef(**base_param_dict)
                else:
                    # New param from child
                    merged_params[key] = child_param

        # Build merged pattern
        merged_dict = {}

        # Canvas: child overrides base
        if child.canvas is not None:
            merged_dict["canvas"] = child.canvas
        elif base.canvas is not None:
            merged_dict["canvas"] = base.canvas

        # Params: merged
        if merged_params:
            merged_dict["params"] = merged_params

        # Nodes: child overrides base (or use base if child has none)
        if child.nodes is not None:
            merged_dict["nodes"] = child.nodes
        elif base.nodes is not None:
            merged_dict["nodes"] = base.nodes

        return XSGPattern(**merged_dict)

    def _load_pattern_file(self, path: str) -> XSGPattern:
        """
        Load a pattern file by path

        Args:
            path: Pattern file path (relative to patterns/ directory)

        Returns:
            Loaded pattern
        """
        # Normalize path
        if path.startswith("/"):
            file_path = Path(path[1:])
        else:
            file_path = self.patterns_dir / path

        # Read YAML
        with open(file_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f)

        return XSGPattern(**data)

    def _resolve_extends_dict(self, pattern_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolve extends using dictionary data (no Pydantic validation)

        Args:
            pattern_data: Pattern data as dict

        Returns:
            Resolved pattern data as dict
        """
        if "extends" not in pattern_data or pattern_data["extends"] is None:
            return pattern_data

        # Load base pattern
        extends_path = pattern_data["extends"]
        if extends_path.startswith("/"):
            file_path = Path(extends_path[1:])
        else:
            file_path = self.patterns_dir / extends_path

        with open(file_path, "r", encoding="utf-8") as f:
            base_data = yaml.safe_load(f)

        # Recursively resolve base pattern's extends
        resolved_base = self._resolve_extends_dict(base_data)

        # Merge patterns (dict-based)
        merged = self._merge_pattern_dicts(resolved_base, pattern_data)

        return merged

    def _merge_pattern_dicts(
        self, base: Dict[str, Any], child: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merge base and child pattern dicts

        Args:
            base: Base pattern dict
            child: Child pattern dict

        Returns:
            Merged pattern dict
        """
        merged = {}

        # Canvas: child overrides base
        if "canvas" in child:
            merged["canvas"] = child["canvas"]
        elif "canvas" in base:
            merged["canvas"] = base["canvas"]

        # Params: merge individual parameters
        merged_params = {}
        if "params" in base:
            merged_params = deepcopy(base["params"])

        if "params" in child:
            for key, child_param in child["params"].items():
                if key in merged_params:
                    # Merge child param properties with base param
                    merged_params[key] = {**merged_params[key], **child_param}
                else:
                    merged_params[key] = child_param

        if merged_params:
            merged["params"] = merged_params

        # Nodes: child overrides base
        if "nodes" in child:
            merged["nodes"] = child["nodes"]
        elif "nodes" in base:
            merged["nodes"] = base["nodes"]

        return merged


# Global expander instance
_default_expander: Optional[PatternExpander] = None


def get_pattern_expander(patterns_dir: str = None) -> PatternExpander:
    """
    Get or create default pattern expander

    Args:
        patterns_dir: Directory containing pattern files (defaults to project_root/patterns)

    Returns:
        PatternExpander instance
    """
    global _default_expander

    if _default_expander is None:
        _default_expander = PatternExpander(patterns_dir=patterns_dir)

    return _default_expander


def expand_pattern(
    pattern: XSGPattern, user_params: Optional[Dict[str, Any]] = None
) -> XSGPattern:
    """
    Convenience function to expand a pattern

    Args:
        pattern: Pattern to expand
        user_params: User-provided parameter values

    Returns:
        Expanded pattern
    """
    expander = get_pattern_expander()

    # First resolve extends
    resolved = expander.resolve_extends(pattern)

    # Then expand parameters
    expanded = expander.expand(resolved, user_params)

    return expanded


def expand_pattern_dict(
    pattern_data: Dict[str, Any], user_params: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Expand pattern from dictionary (without Pydantic validation)

    This allows processing patterns with {{template}} variables before validation.

    Args:
        pattern_data: Pattern data as dictionary
        user_params: User-provided parameter values

    Returns:
        Expanded pattern as dictionary
    """
    expander = get_pattern_expander()

    # 1. Resolve extends (recursive, dict-based)
    resolved_data = expander._resolve_extends_dict(pattern_data)

    # 2. Resolve parameters
    param_defs = resolved_data.get("params", {})
    user_params = user_params or {}

    # Convert ParamDef dicts to resolved values
    params = {}
    for key, param_def_data in param_defs.items():
        if key in user_params:
            params[key] = expander._coerce_type(
                user_params[key], param_def_data.get("type", "string")
            )
        elif "default" in param_def_data:
            params[key] = param_def_data["default"]

    # 3. Expand {{vars}} in the data
    expanded_data = expander._expand_object(resolved_data, params)

    return expanded_data
