# XSG - Signal Generator

**XSG** is a professional test pattern generator for display calibration and testing. It provides accurate color bars, grayscale, checkerboard, and other patterns typically found in expensive broadcast signal generators.

## 📦 Architecture

XSG is built with a modern frontend/backend architecture:

- **Frontend**: Vite + React + TypeScript + Tailwind CSS
- **Backend**: FastAPI + PyWebView (desktop application wrapper)
- **Deployment**: Static export for web, or packaged desktop app with PyInstaller

```
xsg/
├── frontend/          # Vite + React application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/         # Utilities and types
│   │   └── main.tsx     # Application entry
│   ├── public/          # Static assets
│   └── vite.config.ts
└── backend/           # FastAPI + PyWebView wrapper
    ├── app/
    │   └── main.py      # Desktop application
    ├── pyproject.toml   # uv dependencies
    └── build.bat/sh     # Build scripts
```

## ✨ Features

- 🎨 **Accurate Test Patterns**: SMPTE color bars, grayscale, checkerboard, and more
- 🖥️ **Fullscreen Desktop App**: Frameless, fullscreen window (PyWebView)
- 🌐 **Web Version**: Also runs in browser for quick testing
- 🔧 **Flexible Configuration**: YAML-based pattern definitions
- 🔍 **Pixel Defect Simulation**: Unique testing capability
- ⚡ **REST API**: Control patterns via FastAPI backend
- 🔒 **Single Instance**: Only one instance runs; duplicate launches change pattern in existing window
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

### Web Version (Development)

```bash
cd frontend
npm install
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

### Desktop Application (Development)

```bash
# Terminal 1: Start frontend dev server
cd frontend
npm run dev

# Terminal 2: Start backend with PyWebView
cd backend
uv sync
uv run python -m app.main --dev
```

Or use the dev scripts:

```bash
# Windows
cd backend
dev.bat

# Linux/macOS
cd backend
chmod +x dev.sh
./dev.sh
```

### Production Build

```bash
# Build frontend
cd frontend
npm run build

# Package desktop application
cd ../backend
uv sync
uv pip install pyinstaller

# Windows
build.bat

# Linux/macOS
chmod +x build.sh
./build.sh
```

The packaged application will be in `backend/dist/`.

## 🎮 Command Line Options

### Pattern Selection

You can specify the initial pattern when launching XSG:

```bash
# Start with a specific pattern
uv run python -m app.main --dev --pattern checker
uv run python -m app.main --dev --pattern colorbar
uv run python -m app.main --dev --pattern vgradient
```

Available options:
- `--dev`: Development mode (uses Vite dev server at http://localhost:3000)
- `--pattern PATTERN`: Initial pattern to display (default: colorbar)
- `--port PORT`: API server port (default: 8000)
- `--api-only`: Run API server only without GUI

### Single Instance Control

**XSG runs only one instance at a time.** If you try to launch a second instance:

1. The new process detects the existing instance
2. Sends the `--pattern` argument to the running instance via API
3. The existing window changes to display the new pattern
4. The new process exits

**Example:**

```bash
# Terminal 1: Launch XSG with colorbar
uv run python -m app.main --dev --pattern colorbar

# Terminal 2: Try to launch with checker
uv run python -m app.main --dev --pattern checker
# → The window from Terminal 1 switches to checker pattern
# → Terminal 2 process exits after sending the command
```

This ensures only one fullscreen window is displayed at a time.

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

### Frontend
- **Build Tool**: [Vite](https://vite.dev/) 6.0
- **Framework**: [React](https://react.dev/) 18
- **Language**: [TypeScript](https://www.typescriptlang.org/) 5.7
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) 3.4

### Backend
- **API Framework**: [FastAPI](https://fastapi.tiangolo.com/) 0.121
- **Desktop Wrapper**: [PyWebView](https://pywebview.flowrl.com/) 6.1
- **Package Manager**: [uv](https://docs.astral.sh/uv/)
- **Packaging**: [PyInstaller](https://pyinstaller.org/)
- **Configuration**: [js-yaml](https://github.com/nodeca/js-yaml)

## 🎨 Use Cases

- Display calibration and color accuracy testing
- Dead pixel detection
- Monitor burn-in testing
- Video signal troubleshooting
- Broadcast equipment testing
- Cost-effective alternative to hardware signal generators

## 🌍 Why XSG?

Professional signal generators can cost thousands of dollars. XSG provides the same functionality in a free application that works as a browser app or desktop application.

Our **pixel defect simulation** feature is unique - even expensive hardware generators don't offer this capability, making XSG a valuable tool for quality assurance and testing.

## 🔌 API Endpoints

XSG includes a FastAPI backend with the following endpoints:

- `GET /` - API information
- `GET /api/patterns` - List all available patterns
- `GET /api/patterns/{pattern_id}` - Get specific pattern info
- `POST /api/gamma` - Set gamma correction settings
- `GET /api/gamma` - Get current gamma settings

Example:

```bash
curl http://localhost:8000/api/patterns
```

## 📝 Future Plans

- ✅ Vite + React frontend
- ✅ FastAPI backend
- ✅ PyWebView desktop wrapper
- 🔄 OS-level gamma correction control
- 🔄 Custom pattern editor
- 🔄 Pattern animation support
- 🔄 More advanced patterns (Zone Plate, Needle, etc.)

## 📄 License

MIT License - see LICENSE file for details

## 👤 Author

kako-jun

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!
