"""
Random Pattern Generator

Generates random XSG patterns based on constraints.
"""

import random
from typing import Dict, List, Optional, Any


def generate_random_pattern(constraints: Optional[Any] = None) -> Dict:
    """
    Generate a random XSG pattern

    Args:
        constraints: Generation constraints (from playlist.generator.constraints)

    Returns:
        Pattern data (XSG format)
    """
    # Extract constraints
    allowed_presets = []
    layer_min = 1
    layer_max = 5
    color_palette = [
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFFF00",
        "#FF00FF",
        "#00FFFF",
        "#FFFFFF",
        "#000000",
    ]

    if constraints:
        if hasattr(constraints, "presets") and constraints.presets:
            allowed_presets = constraints.presets
        if hasattr(constraints, "layers") and constraints.layers:
            if hasattr(constraints.layers, "min") and constraints.layers.min is not None:
                layer_min = int(constraints.layers.min)
            if hasattr(constraints.layers, "max") and constraints.layers.max is not None:
                layer_max = int(constraints.layers.max)
        if hasattr(constraints, "colors") and constraints.colors:
            color_palette = constraints.colors

    # Default allowed presets
    if not allowed_presets:
        allowed_presets = ["solid", "colorbar", "checker", "grayscale"]

    # Random background preset
    bg_preset = random.choice(allowed_presets)

    # Generate nodes
    nodes = []

    # Background node
    bg_node = {
        "id": "bg-generated",
        "type": "background",
        "preset": bg_preset,
        "params": _generate_preset_params(bg_preset, color_palette),
    }
    nodes.append(bg_node)

    # Random number of foreground layers
    num_layers = random.randint(layer_min, layer_max)

    for i in range(num_layers):
        fg_node = _generate_foreground_node(i, color_palette)
        nodes.append(fg_node)

    # Create pattern
    return {"canvas": {"width": 1920, "height": 1080}, "nodes": nodes}


def _generate_preset_params(preset: str, color_palette: List[str]) -> Dict:
    """Generate random parameters for a preset"""

    params = {}

    if preset == "solid":
        params["color"] = random.choice(color_palette)

    elif preset == "checker":
        params["size"] = random.choice([10, 20, 50, 100])
        params["color1"] = random.choice(color_palette)
        params["color2"] = random.choice(color_palette)

    elif preset == "grayscale":
        params["steps"] = random.choice([8, 16, 32])
        params["direction"] = random.choice(["horizontal", "vertical"])
        params["reverse"] = random.choice([True, False])

    elif preset == "colorbar":
        params["intensity"] = random.choice(["75", "100"])

    return params


def _generate_foreground_node(index: int, color_palette: List[str]) -> Dict:
    """Generate a random foreground node"""

    node_types = ["circle", "rect", "line", "directedLine"]
    node_type = random.choice(node_types)

    color = random.choice(color_palette)

    if node_type == "circle":
        return {
            "id": f"fg-circle-{index}",
            "type": "circle",
            "x": f"{random.randint(10, 90)}%",
            "y": f"{random.randint(10, 90)}%",
            "diameter": random.randint(10, 200),
            "fill": color,
            "opacity": random.uniform(0.3, 1.0),
        }

    elif node_type == "rect":
        return {
            "id": f"fg-rect-{index}",
            "type": "rect",
            "x": f"{random.randint(10, 90)}%",
            "y": f"{random.randint(10, 90)}%",
            "width": random.randint(50, 500),
            "height": random.randint(50, 500),
            "fill": color,
            "opacity": random.uniform(0.3, 1.0),
        }

    elif node_type == "line":
        return {
            "id": f"fg-line-{index}",
            "type": "line",
            "x1": f"{random.randint(0, 100)}%",
            "y1": f"{random.randint(0, 100)}%",
            "x2": f"{random.randint(0, 100)}%",
            "y2": f"{random.randint(0, 100)}%",
            "stroke": color,
            "strokeWidth": random.randint(1, 10),
        }

    elif node_type == "directedLine":
        return {
            "id": f"fg-dirline-{index}",
            "type": "directedLine",
            "x": f"{random.randint(0, 100)}%",
            "y": f"{random.randint(0, 100)}%",
            "direction": random.choice(["horizontal", "vertical"]),
            "length": random.randint(100, 1000),
            "stroke": color,
            "strokeWidth": random.randint(1, 10),
        }

    return {}
