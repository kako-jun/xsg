# DESIGN.md — xsg (Display Test Pattern Generator)

## 1. Visual Theme

Tauri-based display test pattern generator with a dark, technical, monospace aesthetic. The interface is utilitarian and precise — every element serves calibration purposes. No decorative flourishes; the UI itself should feel like a piece of test equipment. Pure black backgrounds ensure accurate pattern rendering without ambient light interference from the UI chrome.

## 2. Color Palette

| Token | Value | Usage |
|---|---|---|
| `bg-primary` | `#000000` | App background, canvas surround |
| `bg-panel` | `#111111` | Side panels, menus, settings areas |
| `text-primary` | `rgba(255,255,255,0.7)` | Body text, labels |
| `text-muted` | `rgba(255,255,255,0.4)` | Hints, secondary labels |
| `border-default` | `rgba(255,255,255,0.08)` | Panel dividers, input borders |
| `border-hover` | `rgba(255,255,255,0.15)` | Focused/hovered borders |
| `warning` | `rgba(255,200,100,0.8)` | Caution messages, out-of-range values |
| `hover-bg` | `rgba(255,255,255,0.05)` | Button/item hover state |
| `modal-overlay` | `rgba(0,0,0,0.75)` | Modal backdrop |

SMPTE color bar values are drawn directly on canvas using standard broadcast specifications — they are not part of the UI palette.

## 3. Typography

| Role | Font Stack | Size | Weight |
|---|---|---|---|
| All text | `ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", Consolas, monospace` | 13px base | 400 normal |
| Headings | Same stack | 14–16px | 600 semi-bold |
| Values/readouts | Same stack | 12px | 400 |

All text uses monospace exclusively. This keeps numeric readouts aligned and reinforces the instrument aesthetic.

## 4. Component Stylings

### Buttons
- Flat, no border-radius (`border-radius: 0`)
- Background: transparent
- Border: 1px solid `rgba(255,255,255,0.08)`
- Hover: background `rgba(255,255,255,0.05)`
- Active: background `rgba(255,255,255,0.08)`
- Transition: `0.15s ease`

### Pattern Menu
- Vertical list in `#111` panel
- Items are flat buttons, full-width
- Active pattern highlighted with left 2px solid white border

### Calibration Settings
- Sliders and numeric inputs in `#111` panels
- Inputs: black background, monospace, `rgba(255,255,255,0.08)` border

### Modals
- Overlay: `rgba(0,0,0,0.75)`, `z-index: 50`
- Content: `#111` background, no border-radius
- Border: 1px solid `rgba(255,255,255,0.08)`

### Canvas
- `image-rendering: pixelated` for sharp pixel-level patterns
- Fills available space minus panel widths

### Custom Scrollbar
- Width: `4px`
- Track: transparent
- Thumb: `rgba(255,255,255,0.15)`
- Thumb hover: `rgba(255,255,255,0.25)`

## 5. Layout Principles

- Pattern menu panel on one side, calibration settings accessible via modal or secondary panel
- Canvas occupies maximum remaining space
- Grid layout for settings: 2–4 columns, responsive to panel width
- No wasted space — every pixel matters for a display calibration tool
- Panels use `#111` background to remain visually distinct from pure black canvas surround

## 6. Depth & Elevation

Minimal depth. This is a flat, technical interface.

| Layer | Z-index | Description |
|---|---|---|
| Canvas | 0 | Base rendering layer |
| Panels | 10 | Side panels, menus |
| Modals | 50 | Settings dialogs, about |
| Overlay | 49 | Modal backdrop |

No box shadows. No gradients. Depth is communicated solely through background color differences (`#000` vs `#111`) and z-index stacking.

## 7. Do's and Don'ts

**Do:**
- Keep border-radius at 0 everywhere
- Use monospace for all text without exception
- Keep transitions at 0.15s for responsiveness
- Ensure canvas uses `image-rendering: pixelated`
- Use pure black `#000` for areas surrounding the test pattern

**Don't:**
- Add decorative elements, rounded corners, or gradients
- Use colors outside the defined palette in UI chrome
- Place UI elements that could bleed light onto the test pattern area
- Use font families other than monospace
- Add animations beyond simple hover transitions

## 8. Responsive Behavior

| Context | Behavior |
|---|---|
| Wide (>1200px) | Side panel + canvas, settings grid 4 columns |
| Medium (800–1200px) | Narrower panel, settings grid 3 columns |
| Narrow (<800px) | Settings grid 2 columns, collapsible panel |

The canvas always takes priority — panels shrink or collapse before the canvas area is reduced.

## 9. Agent Prompt Guide

### Keyboard Shortcuts
- `M` — Open/toggle pattern menu
- `C` — Open calibration settings
- `ESC` — Close modals, exit fullscreen

### When building new UI elements:
- All backgrounds: `#000` (main) or `#111` (panels)
- All text: `rgba(255,255,255,0.7)` with monospace
- All borders: `rgba(255,255,255,0.08)`
- All interactive hover: `rgba(255,255,255,0.05)` background
- No border-radius on any element
- Transitions: `0.15s ease`
- Modals at `z-index: 50` with `rgba(0,0,0,0.75)` overlay
- Scrollbars: 4px wide, subtle thumb
