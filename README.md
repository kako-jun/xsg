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
- 📺 **Multi-Display Support**: Display patterns across multiple monitors with flexible selection
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
- `--display SPEC`: Display selection (default: all) - see Multi-Display Support section
- `--list-displays`: List all available displays and exit
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

## 🖥️ Multi-Display Support

XSG supports displaying test patterns across multiple monitors simultaneously or on selected displays.

### Listing Available Displays

Before selecting displays, you can list all available monitors:

```bash
uv run python -m app.main --list-displays
```

**Example output:**

```
[INFO] Available displays:

  Display 1: 2560x1440 at (0, 0) (Primary)
  Display 2: 2560x1440 at (-2560, 0)
  Display 3: 1920x1080 at (2560, 0)

Position-based groups:
  Left-to-right: 3 groups
    left-1: 2560x1440
    left-2: 2560x1440
    left-3: 1920x1080
  Top-to-bottom: 1 groups
    top-1: 2560x1440, 2560x1440, 1920x1080
```

### Display Selection

Use the `--display` option to select which displays to use:

```bash
# Display on all monitors (default)
uv run python -m app.main --dev --display all

# Display on primary monitor only
uv run python -m app.main --dev --display primary

# Display on leftmost monitor(s)
uv run python -m app.main --dev --display left

# Display on second monitor from left
uv run python -m app.main --dev --display left-2

# Display on rightmost monitor(s)
uv run python -m app.main --dev --display right

# Display on topmost monitor(s)
uv run python -m app.main --dev --display top

# Display on second monitor from top
uv run python -m app.main --dev --display top-2

# Display on bottommost monitor(s)
uv run python -m app.main --dev --display bottom

# Multiple selections (comma-separated)
uv run python -m app.main --dev --display "left,right"
```

### Display Grouping

Monitors are grouped by their **position**:

- **Left-to-right groups**: Monitors with the same X coordinate form one group
- **Top-to-bottom groups**: Monitors with the same Y coordinate form one group

**Example:**

If you have monitors arranged like this:

```
[Monitor 1: 1920x1080 at (0, 0)]
[Monitor 2: 1920x1080 at (0, 1080)]  <- Same X as Monitor 1
[Monitor 3: 2560x1440 at (1920, 0)]
```

Groups would be:

- `left-1`: Monitor 1, Monitor 2 (both at X=0)
- `left-2`: Monitor 3 (at X=1920)
- `top-1`: Monitor 1, Monitor 3 (both at Y=0)
- `top-2`: Monitor 2 (at Y=1080)

**Important:** When you specify `top-2`, it will create windows on **all monitors** in that group (e.g., both Monitor 1 and Monitor 2 if they share the same Y coordinate).

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
- ✅ Multi-display support
- ✅ Single instance control
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
