# XSG Pattern Examples

This directory contains example pattern files demonstrating the new XSG pattern format.

## Pattern Files

### Basic Patterns

**colorbar-simple.yaml**
- Simple SMPTE color bar pattern
- Demonstrates: Background preset usage

**checker-with-dot.yaml**
- Checkerboard with simulated pixel defect
- Demonstrates: Background + foreground circle

**grayscale-with-lines.yaml**
- Grayscale gradient with crosshair lines
- Demonstrates: Background + multiple directed lines
- Uses percentage coordinates

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
- `background` - Preset-based background
- `rect` - Rectangle
- `circle` - Circle (diameter-based)
- `ellipse` - Ellipse
- `line` - Line (two-point)
- `directedLine` - Line (direction + length)
- `image` - Image
- `preset` - Custom preset

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
  - id: my-bg
    type: background
    preset: colorbar
```
