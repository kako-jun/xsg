# XSG - Signal Generator

**XSG** is a professional test pattern generator for display calibration and testing. It provides accurate color bars, grayscale, checkerboard, and other patterns typically found in expensive broadcast signal generators.

## ✨ Features

- 🎨 **Accurate Test Patterns**: SMPTE color bars, grayscale, checkerboard, and more
- 🖥️ **Fullscreen Display**: Borderless, maximized window for precise testing
- 🔧 **Flexible Configuration**: YAML-based pattern definitions
- 🔍 **Pixel Defect Simulation**: Unique testing capability not found in hardware generators
- 🌐 **Browser-Based**: No installation required, runs completely locally
- ⚡ **Instant Switching**: Change patterns via URL query parameters
- 🎯 **Professional Grade**: Designed to replace costly hardware signal generators

## 🎯 Supported Patterns

### Color Bars

| Pattern          | Description                      | Query Parameter                         |
| ---------------- | -------------------------------- | --------------------------------------- |
| SMPTE Color Bars | Standard color bars (75%)        | `?pattern=colorbar` or `?pattern=smpte` |
| EBU Color Bars   | European Broadcasting Union bars | `?pattern=ebu`                          |
| ARIB Color Bars  | Japanese standard (ARIB) bars    | `?pattern=arib`                         |

### Grayscale & Gradients

| Pattern             | Description                                    | Query Parameter                                       |
| ------------------- | ---------------------------------------------- | ----------------------------------------------------- |
| Grayscale           | 16-step grayscale                              | `?pattern=grayscale`                                  |
| Staircase           | 21-step staircase (0-100% in 5% steps)         | `?pattern=staircase`                                  |
| Vertical Gradient   | Smooth vertical gradient (256 steps default)   | `?pattern=verticalgradient` or `?pattern=vgradient`   |
| Horizontal Gradient | Smooth horizontal gradient (256 steps default) | `?pattern=horizontalgradient` or `?pattern=hgradient` |

> **Note**: Gradient patterns support `?steps=N` parameter (e.g., `?pattern=vgradient&steps=16`)

### Solid Colors

| Pattern | Description        | Query Parameter    |
| ------- | ------------------ | ------------------ |
| White   | Pure white field   | `?pattern=white`   |
| Black   | Pure black field   | `?pattern=black`   |
| Red     | Pure red field     | `?pattern=red`     |
| Green   | Pure green field   | `?pattern=green`   |
| Blue    | Pure blue field    | `?pattern=blue`    |
| Cyan    | Pure cyan field    | `?pattern=cyan`    |
| Magenta | Pure magenta field | `?pattern=magenta` |
| Yellow  | Pure yellow field  | `?pattern=yellow`  |

> **Note**: Use `?pattern=solid&color=HEXCODE` for custom colors (e.g., `?pattern=solid&color=%23FF5733`)

### Geometric Patterns

| Pattern         | Description                          | Query Parameter          |
| --------------- | ------------------------------------ | ------------------------ |
| Checkerboard    | Black & white checkerboard (50px)    | `?pattern=checker`       |
| Cross-hatch     | Grid pattern (50px, 1px lines)       | `?pattern=crosshatch`    |
| Cross-hatch 2px | Grid pattern (50px, 2px lines)       | `?pattern=crosshatch2px` |
| Convergence     | Alignment grid with center crosshair | `?pattern=convergence`   |

### Professional Test Patterns

| Pattern      | Description                    | Query Parameter        |
| ------------ | ------------------------------ | ---------------------- |
| PLUGE        | Black level adjustment pattern | `?pattern=pluge`       |
| Multiburst   | Frequency response test        | `?pattern=multiburst`  |
| Pixel Defect | Simulated dead/stuck pixels    | `?pattern=pixeldefect` |

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Display Patterns

**Quick Access:**

- **Desktop**: Press **'M'** key to toggle the pattern selection menu (ESC to close)
- **Mobile**: Tap the menu button (☰) in the bottom-right corner

Navigate to the URL with the desired pattern:

**Color Bars:**

- SMPTE: [http://localhost:3000?pattern=colorbar](http://localhost:3000?pattern=colorbar)
- EBU: [http://localhost:3000?pattern=ebu](http://localhost:3000?pattern=ebu)
- ARIB: [http://localhost:3000?pattern=arib](http://localhost:3000?pattern=arib)

**Grayscale & Gradients:**

- Grayscale: [http://localhost:3000?pattern=grayscale](http://localhost:3000?pattern=grayscale)
- Staircase: [http://localhost:3000?pattern=staircase](http://localhost:3000?pattern=staircase)
- Vertical Gradient (16 steps): [http://localhost:3000?pattern=vgradient&steps=16](http://localhost:3000?pattern=vgradient&steps=16)
- Horizontal Gradient (256 steps): [http://localhost:3000?pattern=hgradient&steps=256](http://localhost:3000?pattern=hgradient&steps=256)

**Solid Colors:**

- White: [http://localhost:3000?pattern=white](http://localhost:3000?pattern=white)
- Black: [http://localhost:3000?pattern=black](http://localhost:3000?pattern=black)
- Red: [http://localhost:3000?pattern=red](http://localhost:3000?pattern=red)
- Green: [http://localhost:3000?pattern=green](http://localhost:3000?pattern=green)
- Blue: [http://localhost:3000?pattern=blue](http://localhost:3000?pattern=blue)

**Geometric Patterns:**

- Checkerboard: [http://localhost:3000?pattern=checker](http://localhost:3000?pattern=checker)
- Cross-hatch: [http://localhost:3000?pattern=crosshatch](http://localhost:3000?pattern=crosshatch)
- Cross-hatch 2px: [http://localhost:3000?pattern=crosshatch2px](http://localhost:3000?pattern=crosshatch2px)
- Convergence: [http://localhost:3000?pattern=convergence](http://localhost:3000?pattern=convergence)

**Professional Test Patterns:**

- PLUGE: [http://localhost:3000?pattern=pluge](http://localhost:3000?pattern=pluge)
- Multiburst: [http://localhost:3000?pattern=multiburst](http://localhost:3000?pattern=multiburst)
- Pixel Defect: [http://localhost:3000?pattern=pixeldefect](http://localhost:3000?pattern=pixeldefect)

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## ⚙️ Configuration

Patterns can be customized using YAML configuration files in `public/patterns/`. See `public/patterns/default.yaml` for examples.

### Example YAML Configuration

```yaml
patterns:
  - name: colorbar
    type: colorbar
    description: SMPTE Color Bars
    colors:
      - "#C0C0C0" # White (75%)
      - "#C0C000" # Yellow
      - "#00C0C0" # Cyan
      - "#00C000" # Green
      - "#C000C0" # Magenta
      - "#C00000" # Red
      - "#0000C0" # Blue

  - name: pixeldefect
    type: pixeldefect
    description: Simulated pixel defects
    defectCount: 50
```

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 15 (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.7
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Configuration**: [js-yaml](https://github.com/nodeca/js-yaml)

## 🎨 Use Cases

- Display calibration and color accuracy testing
- Dead pixel detection
- Monitor burn-in testing
- Video signal troubleshooting
- Broadcast equipment testing
- Cost-effective alternative to hardware signal generators

## 🌍 Why XSG?

Professional signal generators can cost thousands of dollars. XSG provides the same functionality in a free, browser-based application that works on any computer with a modern web browser.

Our **pixel defect simulation** feature is unique - even expensive hardware generators don't offer this capability, making XSG a valuable tool for quality assurance and testing.

## 📝 Future Plans

- Gamma correction control
- Custom pattern editor
- Pattern animation support
- REST API for remote control
- Desktop application (Tauri/Rust)
- More advanced patterns (Zone Plate, Needle, etc.)

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

kako-jun

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!
