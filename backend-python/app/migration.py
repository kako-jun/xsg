"""
Migration Tool: Legacy pg format → XSG Pattern Format

Converts old JSON format to new YAML/JSON format.
Based on MIGRATION_MAPPING.md
"""

from typing import Any, Dict, List, Union
import re


class MigrationError(Exception):
    """Exception raised during migration"""

    pass


def migrate_pattern(legacy: Dict) -> Dict:
    """
    Migrate legacy pattern to new XSG format

    Args:
        legacy: Legacy pattern dict with 'background' and 'foreground'

    Returns:
        New XSG pattern dict

    Raises:
        MigrationError: If migration fails
    """
    if "background" not in legacy:
        raise MigrationError("Legacy pattern missing 'background' field")

    # Convert background
    bg_node = _migrate_background(legacy["background"])

    # Convert foreground
    fg_nodes = []
    if "foreground" in legacy and legacy["foreground"]:
        for i, fg in enumerate(legacy["foreground"]):
            fg_node = _migrate_foreground(fg, i)
            if fg_node:
                fg_nodes.append(fg_node)

    # Combine into new format
    return {
        "canvas": {"width": 1920, "height": 1080},  # Default, adjust if needed
        "nodes": [bg_node] + fg_nodes,
    }


def _migrate_background(bg: Dict) -> Dict:
    """Convert legacy background to BackgroundNode"""

    bg_type = bg.get("type", "Solid")

    # Map background type to preset
    preset_map = {
        "Solid": "solid",
        "Crosshatch": "crosshatch",
        "Mesh": "checker",
        "Grayscale": "grayscale",
        "RepeatCropImage": "repeat-crop-image",
        "Image": "image-background",
    }

    preset = preset_map.get(bg_type, "solid")

    # Build node
    node: Dict[str, Any] = {
        "id": "bg-migrated",
        "type": "background",
        "preset": preset,
        "params": {},
    }

    # Convert common properties
    _apply_common_properties(node, bg)

    # Convert type-specific properties
    if bg_type == "Solid":
        color = _convert_color(bg.get("rgb_string", "RGB(0, 0, 0)"))
        node["params"]["color"] = color

    elif bg_type == "Crosshatch" or bg_type == "Mesh":
        node["params"]["size"] = bg.get("rect_width", 50)
        color1 = _convert_color(bg.get("rgb_string", "RGB(0, 0, 0)"))
        color2 = _convert_color(bg.get("rgb_string2", "RGB(255, 255, 255)"))
        node["params"]["color1"] = color1
        node["params"]["color2"] = color2

    elif bg_type == "Grayscale":
        node["params"]["steps"] = bg.get("step_num", 16)
        direction = "horizontal" if bg.get("grayscale_direction") == "h" else "vertical"
        node["params"]["direction"] = direction
        node["params"]["reverse"] = bg.get("grayscale_inverse", False)

        # flat_step_ids, inverted_step_ids -> custom params
        if "flat_step_ids" in bg:
            node["params"]["flatStepIds"] = bg["flat_step_ids"]
        if "inverted_step_ids" in bg:
            node["params"]["invertedStepIds"] = bg["inverted_step_ids"]

    elif bg_type == "Image" or bg_type == "RepeatCropImage":
        node["params"]["src"] = bg.get("image_id", "")
        if "image_scale" in bg:
            node["params"]["scale"] = bg["image_scale"]
        if "image_stretch" in bg:
            node["params"]["fit"] = "fill" if bg["image_stretch"] == "fill" else "contain"

    return node


def _migrate_foreground(fg: Dict, index: int) -> Dict:
    """Convert legacy foreground to appropriate node"""

    fg_type = fg.get("type", "Dot")

    # Dot → Circle
    if fg_type == "Dot":
        node: Dict[str, Any] = {
            "id": f"fg-dot-{index}",
            "type": "circle",
            "x": _convert_coord(fg.get("x", 0)),
            "y": _convert_coord(fg.get("y", 0)),
            "diameter": 2,  # Default pixel defect size
        }
        color = _convert_color(fg.get("rgb_string", "RGB(255, 0, 0)"))
        node["fill"] = color

    # Line → DirectedLineNode or LineNode
    elif fg_type == "Line":
        direction = fg.get("line_direction")
        if direction in ("h", "v"):
            # Use DirectedLineNode
            node = {
                "id": f"fg-line-{index}",
                "type": "directedLine",
                "x": _convert_coord(fg.get("x", 0)),
                "y": _convert_coord(fg.get("y", 0)),
                "direction": "horizontal" if direction == "h" else "vertical",
                "length": _convert_coord(fg.get("line_length", 100)),
            }
            color = _convert_color(fg.get("rgb_string", "RGB(255, 255, 255)"))
            node["stroke"] = color
            node["strokeWidth"] = fg.get("line_width", 1)
        else:
            # Fallback: use two-point LineNode (requires conversion)
            node = {
                "id": f"fg-line-{index}",
                "type": "line",
                "x1": _convert_coord(fg.get("x", 0)),
                "y1": _convert_coord(fg.get("y", 0)),
                "x2": _convert_coord(fg.get("x", 100)),
                "y2": _convert_coord(fg.get("y", 100)),
            }
            color = _convert_color(fg.get("rgb_string", "RGB(255, 255, 255)"))
            node["stroke"] = color
            node["strokeWidth"] = fg.get("line_width", 1)

    # Window → Rect (static, no animation for now)
    elif fg_type == "Window":
        node = {
            "id": f"fg-window-{index}",
            "type": "rect",
            "x": _convert_coord(fg.get("x", 0)),
            "y": _convert_coord(fg.get("y", 0)),
            "width": fg.get("window_width", 100),
            "height": fg.get("window_height", 100),
        }
        color = _convert_color(fg.get("rgb_string", "RGB(255, 255, 255)"))
        node["fill"] = color
        # TODO: window_speed → animation

    # Image → ImageNode
    elif fg_type == "Image":
        node = {
            "id": f"fg-image-{index}",
            "type": "image",
            "src": fg.get("image_id", ""),
            "x": _convert_coord(fg.get("x", 0)),
            "y": _convert_coord(fg.get("y", 0)),
        }
        if "image_scale" in fg:
            node["scale"] = fg["image_scale"]
        if "image_stretch" in fg:
            node["fit"] = "fill" if fg["image_stretch"] == "fill" else "contain"

    # Crosshatch → PresetNode
    elif fg_type == "Crosshatch":
        node = {
            "id": f"fg-crosshatch-{index}",
            "type": "preset",
            "preset": "crosshatch",
            "params": {
                "size": fg.get("rect_width", 50),
                "color1": _convert_color(fg.get("rgb_string", "RGB(0, 0, 0)")),
                "color2": _convert_color(fg.get("rgb_string2", "RGB(255, 255, 255)")),
            },
        }

    else:
        # Unknown type, skip
        return None

    # Apply common properties
    _apply_common_properties(node, fg)

    # Blink interval → blink property
    if "blink_interval" in fg:
        node["blink"] = fg["blink_interval"]

    return node


def _apply_common_properties(node: Dict, legacy: Dict) -> None:
    """Apply common properties (opacity, rotate, blur)"""

    # alpha → opacity
    if "alpha" in legacy:
        node["opacity"] = legacy["alpha"]

    # rotate → rotate
    if "rotate" in legacy:
        node["rotate"] = legacy["rotate"]

    # blur_radius → blur
    if "blur_radius" in legacy:
        node["blur"] = legacy["blur_radius"]


def _convert_color(rgb_string: str) -> str:
    """
    Convert RGB(r, g, b) → #RRGGBB

    Examples:
        RGB(255, 0, 0) → #FF0000
        RGB(128, 128, 128) → #808080
    """
    match = re.match(r"RGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", rgb_string, re.IGNORECASE)
    if match:
        r, g, b = int(match.group(1)), int(match.group(2)), int(match.group(3))
        return f"#{r:02X}{g:02X}{b:02X}"

    # Fallback
    return "#000000"


def _convert_coord(value: Union[str, int, float]) -> Union[int, float, str]:
    """
    Convert legacy coordinate format → new format

    Legacy formats:
        100 → 100 (absolute)
        "50p" → "50%" (percentage)
        "50pplus10" → "calc(50% + 10px)"
        "50pminus10" → "calc(50% - 10px)"

    New formats:
        100 (absolute pixels)
        "50%" (percentage)
        "calc(50% + 10px)" (calc expression)
    """
    if isinstance(value, (int, float)):
        return value

    # String parsing
    value_str = str(value).strip()

    # "50p" → "50%"
    if value_str.endswith("p") and not ("plus" in value_str or "minus" in value_str):
        percentage = value_str[:-1]
        return f"{percentage}%"

    # "50pplus10" → "calc(50% + 10px)"
    plus_match = re.match(r"(\d+)pplus(\d+)", value_str)
    if plus_match:
        percentage = plus_match.group(1)
        offset = plus_match.group(2)
        return f"calc({percentage}% + {offset}px)"

    # "50pminus10" → "calc(50% - 10px)"
    minus_match = re.match(r"(\d+)pminus(\d+)", value_str)
    if minus_match:
        percentage = minus_match.group(1)
        offset = minus_match.group(2)
        return f"calc({percentage}% - {offset}px)"

    # Fallback: try to parse as number
    try:
        return float(value_str)
    except ValueError:
        return value_str


def migrate_pattern_file(input_path: str, output_path: str) -> None:
    """
    Migrate a legacy pattern file to new format

    Args:
        input_path: Path to legacy JSON file
        output_path: Path to output YAML file
    """
    import json
    import yaml

    # Load legacy pattern
    with open(input_path, "r", encoding="utf-8") as f:
        legacy = json.load(f)

    # Migrate
    new_pattern = migrate_pattern(legacy)

    # Save as YAML
    with open(output_path, "w", encoding="utf-8") as f:
        yaml.dump(new_pattern, f, default_flow_style=False, allow_unicode=True, sort_keys=False)

    print(f"✓ Migrated: {input_path} → {output_path}")
