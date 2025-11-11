"""
Quick test script to validate Pydantic models
"""

import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.pattern_loader import load_pattern


def test_load_pattern():
    """Test loading pattern files"""

    # Test files
    pattern_dir = Path(__file__).parent.parent / "patterns"
    test_files = [
        "colorbar-simple.yaml",
        "checker-with-dot.yaml",
        "grayscale-with-lines.yaml",
        "multi-layer-example.yaml",
        "animation-example.yaml",
    ]

    print("Testing pattern file loading and validation...\n")

    for filename in test_files:
        file_path = pattern_dir / filename
        print(f"Loading: {filename}")

        try:
            pattern = load_pattern(str(file_path))
            print(f"  [OK] Valid - {len(pattern.nodes)} nodes")
            print(f"       Canvas: {pattern.canvas.width}x{pattern.canvas.height}")

            # Show node types
            node_types = [node.type for node in pattern.nodes]
            print(f"       Nodes: {', '.join(node_types)}")

        except Exception as e:
            print(f"  [ERROR] {e}")

        print()


if __name__ == "__main__":
    test_load_pattern()
