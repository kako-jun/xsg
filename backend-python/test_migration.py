"""
Test migration tool
"""

import json
from app.migration import migrate_pattern, _convert_color, _convert_coord


def test_convert_color():
    """Test RGB color conversion"""
    assert _convert_color("RGB(255, 0, 0)") == "#FF0000"
    assert _convert_color("RGB(0, 255, 0)") == "#00FF00"
    assert _convert_color("RGB(0, 0, 255)") == "#0000FF"
    assert _convert_color("RGB(128, 128, 128)") == "#808080"
    assert _convert_color("RGB(192, 192, 0)") == "#C0C000"
    print("[OK] Color conversion tests passed")


def test_convert_coord():
    """Test coordinate conversion"""
    assert _convert_coord(100) == 100
    assert _convert_coord("50p") == "50%"
    assert _convert_coord("50pplus10") == "calc(50% + 10px)"
    assert _convert_coord("50pminus10") == "calc(50% - 10px)"
    assert _convert_coord("25pplus5") == "calc(25% + 5px)"
    print("[OK] Coordinate conversion tests passed")


def test_migrate_solid_background():
    """Test solid background migration"""
    legacy = {
        "background": {
            "type": "Solid",
            "rgb_string": "RGB(255, 0, 0)",
            "alpha": 1.0,
        },
        "foreground": [],
    }

    result = migrate_pattern(legacy)

    assert result["canvas"]["width"] == 1920
    assert result["canvas"]["height"] == 1080
    assert len(result["nodes"]) == 1

    bg = result["nodes"][0]
    assert bg["type"] == "background"
    assert bg["preset"] == "solid"
    assert bg["params"]["color"] == "#FF0000"
    assert bg["opacity"] == 1.0

    print("[OK] Solid background migration passed")


def test_migrate_grayscale_background():
    """Test grayscale background migration"""
    legacy = {
        "background": {
            "type": "Grayscale",
            "step_num": 16,
            "grayscale_direction": "h",
            "grayscale_inverse": False,
        },
        "foreground": [],
    }

    result = migrate_pattern(legacy)

    bg = result["nodes"][0]
    assert bg["preset"] == "grayscale"
    assert bg["params"]["steps"] == 16
    assert bg["params"]["direction"] == "horizontal"
    assert bg["params"]["reverse"] == False

    print("[OK] Grayscale background migration passed")


def test_migrate_foreground_dot():
    """Test dot foreground migration"""
    legacy = {
        "background": {"type": "Solid", "rgb_string": "RGB(0, 0, 0)"},
        "foreground": [
            {
                "type": "Dot",
                "x": "50p",
                "y": "50p",
                "rgb_string": "RGB(255, 0, 0)",
                "alpha": 1.0,
            }
        ],
    }

    result = migrate_pattern(legacy)

    assert len(result["nodes"]) == 2
    dot = result["nodes"][1]
    assert dot["type"] == "circle"
    assert dot["x"] == "50%"
    assert dot["y"] == "50%"
    assert dot["fill"] == "#FF0000"
    assert dot["diameter"] == 2

    print("[OK] Dot foreground migration passed")


def test_migrate_foreground_line():
    """Test line foreground migration"""
    legacy = {
        "background": {"type": "Solid"},
        "foreground": [
            {
                "type": "Line",
                "x": 0,
                "y": "50p",
                "line_direction": "h",
                "line_length": 1920,
                "line_width": 2,
                "rgb_string": "RGB(255, 255, 255)",
            }
        ],
    }

    result = migrate_pattern(legacy)

    line = result["nodes"][1]
    assert line["type"] == "directedLine"
    assert line["x"] == 0
    assert line["y"] == "50%"
    assert line["direction"] == "horizontal"
    assert line["length"] == 1920
    assert line["stroke"] == "#FFFFFF"
    assert line["strokeWidth"] == 2

    print("[OK] Line foreground migration passed")


def test_migrate_complex_pattern():
    """Test complex pattern with multiple elements"""
    legacy = {
        "background": {
            "type": "Grayscale",
            "step_num": 16,
            "grayscale_direction": "h",
        },
        "foreground": [
            {
                "type": "Dot",
                "x": "50p",
                "y": "50p",
                "rgb_string": "RGB(255, 0, 0)",
            },
            {
                "type": "Line",
                "x": 0,
                "y": "50p",
                "line_direction": "h",
                "line_length": 1920,
                "rgb_string": "RGB(0, 255, 0)",
            },
        ],
    }

    result = migrate_pattern(legacy)

    assert len(result["nodes"]) == 3
    assert result["nodes"][0]["type"] == "background"
    assert result["nodes"][1]["type"] == "circle"
    assert result["nodes"][2]["type"] == "directedLine"

    print("[OK] Complex pattern migration passed")


def run_all_tests():
    """Run all migration tests"""
    print("Running migration tests...\n")

    test_convert_color()
    test_convert_coord()
    test_migrate_solid_background()
    test_migrate_grayscale_background()
    test_migrate_foreground_dot()
    test_migrate_foreground_line()
    test_migrate_complex_pattern()

    print("\n[OK] All migration tests passed!")


if __name__ == "__main__":
    run_all_tests()
