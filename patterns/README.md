# XSG Pattern Examples

This directory contains example pattern files demonstrating the new XSG pattern format.

## Pattern Files

### Basic Patterns

**colorbar.yaml**
- SMPTE color bar pattern (75% intensity)
- Demonstrates: Basic rect nodes with precise color values

**checker.yaml**
- Checkerboard pattern
- Demonstrates: Repeat grid with alternating colors

**grayscale.yaml**
- Grayscale gradient (16 steps, horizontal)
- Demonstrates: Multiple rect nodes in sequence

**convergence.yaml**
- Convergence test pattern with grid and circles
- Demonstrates: Repeat grid with lines and circles

**crosshatch.yaml**
- Crosshatch grid pattern
- Demonstrates: Repeat grid with horizontal and vertical lines

### Advanced Patterns

**multi-layer-example.yaml**
- Complex multi-layer composition
- Demonstrates: Rect, Circle, Ellipse, Line nodes
- Uses calc() expressions for positioning
- Shows opacity and stroke usage

**animation-example.yaml**
- Animated elements
- Demonstrates: WAAPI animations (props syntax)
- Shows blink property for simple on/off animation

**image-example.yaml**
- Image loading and display
- Demonstrates: All 4 path formats (@/, relative, absolute, URL)
- Shows image sizing options (fit, scale, width/height)
- Demonstrates image effects (blur, rotate, opacity)

## Usage

### Load a pattern file:

```bash
# Development mode
cd backend
uv run python -m app.main --dev --file ../patterns/colorbar-simple.yaml

# Via API
curl http://localhost:8000/api/pattern/load -X POST \
  -H "Content-Type: application/json" \
  -d '{"file": "patterns/colorbar-simple.yaml"}'
```

### Validate a pattern file:

```bash
# Using JSON Schema
# (Install ajv-cli: npm install -g ajv-cli)
ajv validate -s xsg-pattern.schema.json -d patterns/colorbar-simple.yaml
```

## Pattern Format Reference

See [DESIGN_SUMMARY.md](../DESIGN_SUMMARY.md) for complete format documentation.

### Key Concepts

**Coordinate Types:**
- Absolute pixels: `100`
- Percentage: `"50%"`
- Calc expression: `"calc(50% + 10px)"`

**Path Formats:**
- Project-relative: `"@/images/test.png"`
- Relative: `"../images/test.png"`
- Absolute: `"/home/user/images/test.png"`
- URL: `"https://example.com/test.png"`

**Layer Rendering:**
- Nodes are rendered in order (first = back, last = front)
- Unlimited layers supported

**Node Types:**
- `background` - Pattern-based background (TSX patterns)
- `rect` - Rectangle
- `circle` - Circle (diameter-based)
- `ellipse` - Ellipse
- `line` - Line (two-point)
- `directedLine` - Line (direction + length)
- `image` - Image
- `pattern` - Custom TSX pattern

**Repeat Feature:**
All node types support the `repeat` property for grid/tile rendering:

```yaml
# Simple repeat (CSS/Canvas API style, for images)
repeat: "repeat"        # Tile in both directions
repeat: "repeat-x"      # Tile horizontally only
repeat: "repeat-y"      # Tile vertically only
repeat: "no-repeat"     # No repeat (default)

# Grid repeat (fixed count with spacing)
repeat:
  mode: grid
  countX: 10        # Number of instances horizontally
  countY: 8         # Number of instances vertically
  spacingX: 100     # Horizontal spacing in pixels
  spacingY: 100     # Vertical spacing in pixels

# Tile repeat (fill area with pattern)
repeat:
  mode: tile
  tileWidth: 64     # Tile width in pixels
  tileHeight: 64    # Tile height in pixels
```

## Creating Your Own Patterns

1. Copy an example file
2. Edit the YAML structure
3. Validate against schema (optional)
4. Load in XSG

Example minimal pattern:

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - id: my-rect
    type: rect
    x: 0
    y: 0
    width: 1920
    height: 1080
    fill: "#000000"
```

Example with repeat:

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - id: bg
    type: rect
    x: 0
    y: 0
    width: 1920
    height: 1080
    fill: "#000000"

  - id: dots
    type: circle
    x: 50
    y: 50
    diameter: 10
    fill: "#FFFFFF"
    repeat:
      mode: grid
      countX: 19
      countY: 11
      spacingX: 100
      spacingY: 100
```
