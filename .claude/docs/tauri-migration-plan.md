# XSG Tauri移行計画

**作成日**: 2025-11-14
**目的**: PythonベースのXSGアプリケーションをTauriベースに移行し、起動速度とパフォーマンスを向上させる

---

## 📋 Executive Summary

### 移行の動機

現在のPython + PyWebViewアーキテクチャでは、**実行時の表示までのオーバーヘッドが大きい**という課題があります。Tauriへの移行により以下の改善が期待できます：

- ⚡ **起動速度**: 3-5秒 → 0.5秒未満
- 📦 **バイナリサイズ**: 50-100MB → 5-15MB
- 💾 **メモリ使用量**: 150-200MB → 50-80MB
- 🔧 **開発体験**: Python → Rust（型安全、高速コンパイル）

### 結論

**移行は技術的に可能ですが、中〜高難易度です。**

- ✅ **変えられないものはない**: 全機能をRustで再実装可能
- ⚠️ **工数**: フルタイム換算で **3-5週間**（後述の詳細参照）
- ⚠️ **Rust学習コスト**: チームにRust経験者がいない場合、追加で1-2週間

---

## 🏗️ Current Architecture

### 技術スタック

```
┌─────────────────────────────────────┐
│  Frontend (Vite + React + TS)       │  ← そのまま使える
│  - PatternDisplay, PatternMenu      │
│  - Canvas rendering                 │
└─────────────────────────────────────┘
              ↓ HTTP API
┌─────────────────────────────────────┐
│  Backend (Python)                   │  ← Rustに書き換え
│  - FastAPI (REST API)               │
│  - Pattern loader (YAML)            │
│  - Playlist runner                  │
│  - Calibration (OS API)             │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Desktop Wrapper (PyWebView)        │  ← Tauriに置き換え
│  - Window creation                  │
│  - Fullscreen/frameless             │
│  - Multi-display                    │
└─────────────────────────────────────┘
```

### Python依存関係

| パッケージ | 目的 | Rust代替 |
|-----------|------|---------|
| **fastapi** | REST API | `axum`, `actix-web` |
| **pywebview** | デスクトップウィンドウ | **Tauri本体** |
| **pydantic** | データバリデーション | `serde`, `validator` |
| **pyyaml** | YAML解析 | `serde_yaml` |
| **screeninfo** | ディスプレイ情報取得 | `tauri::window::Monitor` |
| **httpx** | HTTP通信 | `reqwest` |
| **uvicorn** | ASGIサーバー | 不要（Tauriが内蔵） |

---

## 🦀 Tauri Architecture

### 新しい技術スタック

```
┌─────────────────────────────────────┐
│  Frontend (Vite + React + TS)       │  ← 変更なし
│  - PatternDisplay, PatternMenu      │
│  - Canvas rendering                 │
└─────────────────────────────────────┘
              ↓ Tauri IPC (invoke)
┌─────────────────────────────────────┐
│  Backend (Rust + Tauri)             │  ← 新規実装
│  - Tauri Commands (IPC handlers)    │
│  - Pattern loader (serde_yaml)      │
│  - Playlist runner                  │
│  - Calibration (FFI)                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Desktop Framework (Tauri Core)     │  ← ビルトイン
│  - Window API                       │
│  - WebView (OS native)              │
│  - Menu, Tray, etc.                 │
└─────────────────────────────────────┘
```

### Tauriの特徴

1. **IPC (Inter-Process Communication)**
   - フロントエンド: `invoke('command_name', { args })`
   - バックエンド: `#[tauri::command]` 属性でRust関数を公開

2. **ネイティブWebView**
   - Windows: WebView2 (Chromium Edge)
   - macOS: WKWebView (Safari)
   - Linux: WebKitGTK

3. **プラグインシステム**
   - 公式プラグイン多数（fs, dialog, shell, window, etc.）
   - カスタムプラグイン作成可能

---

## 🗺️ Migration Roadmap

### Phase 0: 環境構築（1-2日）

- [x] Rust環境インストール（`rustup`）
- [ ] Tauri CLIインストール（`npm install -g @tauri-apps/cli`）
- [ ] プロジェクト初期化（`npm create tauri-app`）
- [ ] フロントエンドをTauriプロジェクトにマージ

**成果物**: `src-tauri/` ディレクトリ、`tauri.conf.json`

---

### Phase 1: 基本機能の移行（1週間）

#### 1.1 ウィンドウ管理（1-2日）

**現在（Python）:**
```python
webview.create_window(
    title="XSG",
    url="http://localhost:3000",
    fullscreen=True,
    frameless=True,
)
```

**移行後（Rust）:**
```rust
// src-tauri/src/main.rs
tauri::Builder::default()
    .setup(|app| {
        let window = tauri::WindowBuilder::new(
            app,
            "main",
            tauri::WindowUrl::App("index.html".into())
        )
        .title("XSG")
        .fullscreen(true)
        .decorations(false) // frameless
        .build()?;
        Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
```

**実装項目:**
- ✅ シングルウィンドウ作成
- ✅ フルスクリーン・フレームレス
- ⚠️ マルチディスプレイ対応（Tauri 2.0で改善）

**難易度**: ⭐ Easy

---

#### 1.2 パターンローダー（2-3日）

**現在（Python）:**
```python
# backend/app/pattern_loader.py
import yaml
from pydantic import BaseModel

def load_pattern(pattern_id: str) -> dict:
    with open(f"patterns/{pattern_id}.yaml") as f:
        data = yaml.safe_load(f)
    return data
```

**移行後（Rust）:**
```rust
// src-tauri/src/pattern_loader.rs
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Deserialize, Serialize)]
struct Pattern {
    name: String,
    category: String,
    canvas: Canvas,
    nodes: Vec<Node>,
}

fn load_pattern(pattern_id: &str) -> Result<Pattern, Box<dyn std::error::Error>> {
    let path = format!("patterns/{}.yaml", pattern_id);
    let content = fs::read_to_string(path)?;
    let pattern: Pattern = serde_yaml::from_str(&content)?;
    Ok(pattern)
}

#[tauri::command]
async fn get_pattern(pattern_id: String) -> Result<Pattern, String> {
    load_pattern(&pattern_id).map_err(|e| e.to_string())
}
```

**実装項目:**
- ✅ YAML解析（`serde_yaml`）
- ✅ Pydanticモデル → Rust構造体（`serde`）
- ✅ `extends` 解決（pattern_expander移植）
- ✅ パラメータ展開（`{{paramName}}`）

**難易度**: ⭐⭐ Medium（Rustの所有権・ライフタイムに注意）

---

#### 1.3 IPC実装（1-2日）

**フロントエンド変更:**
```typescript
// Before (fetch API)
const response = await fetch('http://localhost:8000/api/patterns');
const data = await response.json();

// After (Tauri invoke)
import { invoke } from '@tauri-apps/api/tauri';
const data = await invoke('get_patterns');
```

**バックエンド:**
```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn get_patterns() -> Result<Vec<PatternInfo>, String> {
    // Implementation
}

#[tauri::command]
async fn set_pattern(pattern: String, params: HashMap<String, String>) -> Result<(), String> {
    // Implementation
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_patterns,
            get_pattern,
            set_pattern,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

**実装項目:**
- ✅ `/api/patterns` → `get_patterns` command
- ✅ `/api/patterns/{id}` → `get_pattern` command
- ✅ `/api/pattern` (POST) → `set_pattern` command
- ✅ エラーハンドリング

**難易度**: ⭐ Easy

---

### Phase 2: 高度な機能の移行（1-1.5週間）

#### 2.1 マルチディスプレイ対応（2-3日）

**現在（Python）:**
```python
from screeninfo import get_monitors

def get_display_info():
    monitors = get_monitors()
    return [{"x": m.x, "y": m.y, "width": m.width, "height": m.height} for m in monitors]
```

**移行後（Rust）:**
```rust
use tauri::Manager;

#[tauri::command]
async fn get_displays(app: tauri::AppHandle) -> Result<Vec<DisplayInfo>, String> {
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    let displays: Vec<DisplayInfo> = monitors
        .flatten()
        .map(|m| {
            let size = m.size();
            let position = m.position();
            DisplayInfo {
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
            }
        })
        .collect();

    Ok(displays)
}

#[tauri::command]
async fn create_window_on_display(
    app: tauri::AppHandle,
    display_index: usize,
    url: String,
) -> Result<(), String> {
    // Create window on specified display
    let window = tauri::WindowBuilder::new(
        &app,
        format!("display_{}", display_index),
        tauri::WindowUrl::App(url.into())
    )
    .position(x, y)
    .inner_size(width, height)
    .build()
    .map_err(|e| e.to_string())?;

    Ok(())
}
```

**実装項目:**
- ✅ `screeninfo` → `tauri::window::Monitor`
- ✅ 位置ベース指定（left, right, top, bottom）
- ✅ 複数ウィンドウ作成
- ⚠️ 注意: Tauri 1.x では `available_monitors()` が実験的機能（Tauri 2.0で安定）

**難易度**: ⭐⭐⭐ Hard（Tauriのマルチモニター対応が発展途上）

---

#### 2.2 ディスプレイキャリブレーション（3-5日）

**現在（Python）:**
```python
# backend/app/calibration.py
import platform
import ctypes

def set_gamma_windows(gamma: float):
    """Windows gamma control via SetDeviceGammaRamp"""
    # Windows API呼び出し
    gdi32 = ctypes.windll.gdi32
    hdc = gdi32.GetDC(0)

    ramp = (ctypes.c_ushort * 256 * 3)()
    for i in range(256):
        value = int(pow(i / 255.0, 1.0 / gamma) * 65535)
        ramp[0][i] = value  # Red
        ramp[1][i] = value  # Green
        ramp[2][i] = value  # Blue

    gdi32.SetDeviceGammaRamp(hdc, ctypes.byref(ramp))
```

**移行後（Rust + Windows）:**
```rust
// src-tauri/src/calibration/windows.rs
#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Gdi::{GetDC, SetDeviceGammaRamp};

#[cfg(target_os = "windows")]
pub fn set_gamma_windows(gamma: f32) -> Result<(), Box<dyn std::error::Error>> {
    unsafe {
        let hdc = GetDC(None);
        let mut ramp: [u16; 768] = [0; 768]; // 256 * 3 channels

        for i in 0..256 {
            let value = ((i as f32 / 255.0).powf(1.0 / gamma) * 65535.0) as u16;
            ramp[i] = value;         // Red
            ramp[i + 256] = value;   // Green
            ramp[i + 512] = value;   // Blue
        }

        SetDeviceGammaRamp(hdc, &ramp)?;
    }
    Ok(())
}
```

**移行後（Rust + Linux）:**
```rust
// src-tauri/src/calibration/linux.rs
#[cfg(target_os = "linux")]
use std::process::Command;

#[cfg(target_os = "linux")]
pub fn set_gamma_linux(gamma: f32) -> Result<(), Box<dyn std::error::Error>> {
    Command::new("xrandr")
        .arg("--output").arg("HDMI-0")
        .arg("--gamma").arg(format!("{}:{}:{}", gamma, gamma, gamma))
        .output()?;
    Ok(())
}
```

**移行後（Rust + macOS）:**
```rust
// src-tauri/src/calibration/macos.rs
#[cfg(target_os = "macos")]
use core_graphics::display::{CGDisplay, CGDisplayGammaTableCapacity};

#[cfg(target_os = "macos")]
pub fn set_gamma_macos(gamma: f32) -> Result<(), Box<dyn std::error::Error>> {
    unsafe {
        let display = CGDisplay::main();
        let capacity = display.gamma_table_capacity() as usize;

        let mut red = vec![0.0_f32; capacity];
        let mut green = vec![0.0_f32; capacity];
        let mut blue = vec![0.0_f32; capacity];

        for i in 0..capacity {
            let value = (i as f32 / (capacity - 1) as f32).powf(1.0 / gamma);
            red[i] = value;
            green[i] = value;
            blue[i] = value;
        }

        display.set_gamma_table(
            capacity as u32,
            &red,
            &green,
            &blue,
        );
    }
    Ok(())
}
```

**実装項目:**
- ✅ Windows gamma制御（`windows-rs` クレート）
- ✅ Linux gamma制御（`xrandr` コマンド）
- ✅ macOS gamma制御（`core-graphics` クレート）
- ✅ Night Mode検出・無効化
- ✅ HDR検出（Windows）
- ✅ GPU検出

**必要なクレート:**
- Windows: `windows` (公式Microsoftクレート)
- macOS: `core-graphics`, `cocoa`
- Linux: `std::process::Command`（xrandr呼び出し）

**難易度**: ⭐⭐⭐⭐ Very Hard（プラットフォーム固有API、unsafe必須）

---

#### 2.3 プレイリスト機能（2-3日）

**現在（Python）:**
```python
# backend/app/playlist_runner.py
class PlaylistRunner:
    def __init__(self, playlist: Playlist):
        self.playlist = playlist

    async def run(self):
        for item in self.playlist.items:
            if item.type == "pattern":
                await display_pattern(item.pattern)
            elif item.type == "url":
                await display_url(item.url)

            await asyncio.sleep(item.duration)
```

**移行後（Rust）:**
```rust
// src-tauri/src/playlist_runner.rs
use tokio::time::{sleep, Duration};

pub struct PlaylistRunner {
    playlist: Playlist,
}

impl PlaylistRunner {
    pub async fn run(&self, app: tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
        for item in &self.playlist.items {
            match item.item_type.as_str() {
                "pattern" => {
                    display_pattern(&app, &item.pattern).await?;
                }
                "url" => {
                    display_url(&app, &item.url).await?;
                }
                _ => {}
            }

            sleep(Duration::from_secs(item.duration as u64)).await;
        }
        Ok(())
    }
}
```

**実装項目:**
- ✅ プレイリストJSON/YAML解析
- ✅ パターン/URL切り替え
- ✅ 非同期実行（`tokio`）
- ✅ 一時停止・再開・停止

**難易度**: ⭐⭐ Medium

---

#### 2.4 Webレンダリングモード（1-2日）

**現在（Python）:**
```python
# --url オプションでURLを表示
create_url_windows(url=args.url, readonly=args.readonly)
```

**移行後（Rust）:**
```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn open_url_window(
    app: tauri::AppHandle,
    url: String,
    readonly: bool,
) -> Result<(), String> {
    let window = tauri::WindowBuilder::new(
        &app,
        "url_window",
        tauri::WindowUrl::External(url.parse().map_err(|e| format!("{}", e))?)
    )
    .fullscreen(true)
    .decorations(false)
    .build()
    .map_err(|e| e.to_string())?;

    if readonly {
        // Inject CSS to disable interactions
        window.eval("
            const style = document.createElement('style');
            style.textContent = '* { pointer-events: none !important; }';
            document.head.appendChild(style);
        ").ok();
    }

    Ok(())
}
```

**実装項目:**
- ✅ 外部URL表示（`WindowUrl::External`）
- ✅ Readonly mode（JavaScript injection）
- ✅ プロキシ対応（Tauriは自動的にOSプロキシ設定を継承）

**難易度**: ⭐ Easy

---

### Phase 3: パッケージング・テスト（3-5日）

#### 3.1 ビルド設定（1日）

**tauri.conf.json:**
```json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../frontend/dist"
  },
  "package": {
    "productName": "XSG",
    "version": "1.0.0"
  },
  "tauri": {
    "bundle": {
      "active": true,
      "targets": ["msi", "deb", "appimage", "dmg"],
      "identifier": "com.kako-jun.xsg",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "windows": [
      {
        "title": "XSG",
        "fullscreen": true,
        "decorations": false
      }
    ]
  }
}
```

**実装項目:**
- ✅ Windows MSIインストーラー
- ✅ Linux AppImage/deb
- ✅ macOS dmg
- ✅ アイコン設定
- ✅ 自動更新（Tauri Updater）

**難易度**: ⭐ Easy

---

#### 3.2 スクリーンセーバー（2-3日）

**Windows .scr:**
```rust
// src-tauri/src/screensaver.rs
#[cfg(target_os = "windows")]
fn main() {
    let args: Vec<String> = std::env::args().collect();

    match args.get(1).map(String::as_str) {
        Some("/s") => {
            // Full-screen mode
            run_screensaver();
        }
        Some("/p") => {
            // Preview mode (ignore, too small)
        }
        Some("/c") => {
            // Configuration dialog
            show_settings_dialog();
        }
        _ => {
            // Default: configuration
            show_settings_dialog();
        }
    }
}
```

**Linux/macOS:**
- Linuxはスクリーンセーバーの仕組みが異なる（XScreenSaver設定ファイル）
- macOSは `.saver` バンドル（Screen Saver framework）

**実装項目:**
- ✅ Windows .scr ビルド
- ✅ コマンドライン引数パース
- ⚠️ Linux/macOSは別途対応が必要（現状と同じ）

**難易度**: ⭐⭐ Medium

---

### Phase 4: 最適化・ドキュメント（2-3日）

#### 4.1 パフォーマンス最適化（1日）

- ✅ リリースビルドで最適化（`Cargo.toml` に `opt-level = 3`）
- ✅ LTO（Link Time Optimization）有効化
- ✅ バイナリサイズ削減（`strip = true`）

**Cargo.toml:**
```toml
[profile.release]
opt-level = 3
lto = true
strip = true
codegen-units = 1
```

---

#### 4.2 ドキュメント更新（1-2日）

- ✅ CLAUDE.mdの更新（Tauri化後のアーキテクチャ）
- ✅ ビルド手順の更新
- ✅ 開発環境セットアップガイド

---

## 📊 Difficulty Assessment

### 難易度評価（コンポーネント別）

| コンポーネント | 難易度 | 理由 | 工数 |
|--------------|-------|------|------|
| ウィンドウ管理 | ⭐ Easy | Tauri APIがシンプル | 1-2日 |
| IPC実装 | ⭐ Easy | `#[tauri::command]` で自動生成 | 1-2日 |
| パターンローダー | ⭐⭐ Medium | Rust構造体・所有権 | 2-3日 |
| プレイリスト | ⭐⭐ Medium | 非同期処理（tokio） | 2-3日 |
| Webレンダリング | ⭐ Easy | `WindowUrl::External` | 1-2日 |
| **マルチディスプレイ** | ⭐⭐⭐ Hard | Tauri 1.xの制限 | 2-3日 |
| **キャリブレーション** | ⭐⭐⭐⭐ Very Hard | プラットフォーム固有API、unsafe | 3-5日 |
| パッケージング | ⭐ Easy | Tauri CLI自動化 | 1日 |
| スクリーンセーバー | ⭐⭐ Medium | Windows .scr特殊処理 | 2-3日 |

**総工数: 15-24日（3-5週間）**

---

## ⚠️ Cannot Migrate（変えられない部分）

### 結論: **変えられないものはありません**

全ての機能はRustで実装可能です。ただし、以下の点に注意が必要です：

#### 1. プラットフォーム固有API（キャリブレーション）

**課題:**
- Windows API、Xrandr、CoreGraphicsへの直接アクセスが必要
- Rustでは `unsafe` ブロックを使用する必要がある

**対策:**
- ✅ Rustの `windows-rs` クレート（公式Microsoft製）を使用
- ✅ `core-graphics` クレート（macOS）
- ✅ `std::process::Command` でxrandr実行（Linux）

**結論:** 移行可能（ただし高難易度）

---

#### 2. マルチディスプレイ対応

**課題:**
- Tauri 1.x では `available_monitors()` が実験的機能
- Tauri 2.0（現在ベータ版）で安定化予定

**対策:**
- ⚠️ Tauri 1.x で実装する場合、機能が制限される可能性
- ✅ Tauri 2.0にアップグレードする（推奨）
- ✅ 代替: カスタムプラグインで `screeninfo` 相当を実装

**結論:** 移行可能（Tauri 2.0推奨）

---

#### 3. Pythonライブラリの直接利用

**課題:**
- Pythonの `screeninfo`, `pyyaml` などをそのまま使えない

**対策:**
- ✅ Rustクレートで代替（`serde_yaml`, `tauri::window::Monitor`）
- ✅ 機能は100%同等に実装可能

**結論:** 移行可能

---

## 🚀 Performance Comparison

### 予測されるパフォーマンス改善

| 指標 | Python + PyWebView | Tauri | 改善率 |
|------|-------------------|-------|--------|
| **起動時間** | 3-5秒 | 0.3-0.8秒 | **85%高速化** |
| **メモリ使用量** | 150-200MB | 50-80MB | **60%削減** |
| **バイナリサイズ** | 50-100MB | 5-15MB | **80%削減** |
| **CPU使用率（アイドル）** | 2-5% | 0.5-1% | **75%削減** |
| **実行ファイル起動** | Python + 依存関係ロード | ネイティブバイナリ | **即時起動** |

### ベンチマーク想定

**起動時間（初回）:**
```
Python:  [████████████████████████████████] 5.0s
Tauri:   [███] 0.8s
```

**起動時間（2回目以降）:**
```
Python:  [████████████████████] 3.2s
Tauri:   [██] 0.3s
```

---

## 🛡️ Risks and Mitigation

### リスク1: Rust学習曲線

**リスク:**
- Rustは所有権・ライフタイム・トレイトなど、独特な概念が多い
- チームにRust経験者がいない場合、学習コストが高い

**影響度:** 🔴 高
**対策:**
- ✅ Rustの基礎を1週間集中学習（The Rust Book）
- ✅ Tauriの公式ガイド・サンプルを活用
- ✅ シンプルな部分（IPC、パターンローダー）から始める
- ✅ 難しい部分（キャリブレーション）は最後に実装

---

### リスク2: Tauriのエコシステムが若い

**リスク:**
- Tauri 1.x は安定版だが、2.0はベータ版
- マルチディスプレイなど一部機能がまだ発展途上

**影響度:** 🟡 中
**対策:**
- ✅ Tauri 2.0 RC版の安定化を待つ（2025年Q1予定）
- ✅ または Tauri 1.x で実装し、後で2.0にアップグレード
- ✅ コミュニティが活発（GitHub Issues, Discord）

---

### リスク3: プラットフォーム固有の不具合

**リスク:**
- Windows, Linux, macOS それぞれで異なる挙動が発生する可能性
- キャリブレーション機能は特にプラットフォーム依存

**影響度:** 🟡 中
**対策:**
- ✅ 各プラットフォームでテストを徹底
- ✅ CI/CD（GitHub Actions）でクロスプラットフォームビルド
- ✅ 条件付きコンパイル（`#[cfg(target_os = "windows")]`）を活用

---

### リスク4: 機能が完全に移行できない可能性

**リスク:**
- 特殊な機能（ガンマ制御など）がRustで実装困難な場合

**影響度:** 🟢 低
**対策:**
- ✅ 調査の結果、全機能が移行可能と判断
- ✅ 最悪の場合、Pythonスクリプトを別プロセスで実行する手もある（非推奨）

---

## ⏱️ Timeline Estimate

### 前提条件

- **Rust経験**: 中級レベル（所有権・トレイト理解済み）
- **Tauri経験**: 初級レベル（チュートリアル完了）
- **作業時間**: フルタイム換算（1日8時間）

---

### フェーズ別工数

| フェーズ | 内容 | 工数 | 累計 |
|---------|------|------|------|
| **Phase 0** | 環境構築 | 1-2日 | 1-2日 |
| **Phase 1** | 基本機能移行 | 5-7日 | 6-9日 |
| **Phase 2** | 高度な機能移行 | 7-11日 | 13-20日 |
| **Phase 3** | パッケージング・テスト | 3-5日 | 16-25日 |
| **Phase 4** | 最適化・ドキュメント | 2-3日 | **18-28日** |

**総工数: 18-28日（3.5-5.5週間）**

---

### リスクバッファ込みの見積もり

| シナリオ | 工数 | 備考 |
|---------|------|------|
| **楽観的** | 3週間 | Rust経験豊富、問題なし |
| **標準** | 4週間 | 一部の機能で試行錯誤 |
| **悲観的** | 6週間 | Rust初心者、予期せぬ問題 |

**推奨見積もり: 4-5週間**

---

## 💡 Recommendation

### 移行すべきか？

#### ✅ 移行を推奨する場合

- ✅ **起動速度が最重要**: 5秒 → 0.5秒の改善は大きい
- ✅ **配布が頻繁**: 小さいバイナリサイズは配布時のメリット大
- ✅ **長期メンテナンス**: Rustの型安全性・パフォーマンスは長期的に有利
- ✅ **チームにRust経験者がいる**: 学習コストを削減できる
- ✅ **新しい技術を学びたい**: Rustは習得価値が高い

#### ❌ 移行を見送る場合

- ❌ **工数が取れない**: 3-5週間のフルタイム作業が確保できない
- ❌ **Rust学習コストが高すぎる**: チーム全員がPythonに慣れている
- ❌ **現状の起動速度で十分**: 3-5秒でも問題ない
- ❌ **プロトタイプ段階**: まだ仕様が固まっていない

---

### 段階的移行の提案

#### ハイブリッドアプローチ（折衷案）

**Phase 1: Tauri化（基本機能のみ）**（2週間）
- ✅ ウィンドウ管理のみTauriに移行
- ✅ バックエンドは引き続きFastAPIを使用（Tauriから起動）
- ✅ 起動速度は改善（Pythonインタプリタ起動は必要だが、PyWebViewよりは速い）

**Phase 2: Rust移行（余裕があれば）**（3週間）
- ✅ FastAPIのエンドポイントを順次Rustコマンドに置き換え
- ✅ 最終的にPython依存を完全削除

**メリット:**
- ⚡ 早い段階で起動速度改善の恩恵
- 📈 段階的な移行でリスク分散
- 🔄 途中で引き返しやすい

---

### 最終推奨

#### 🎯 推奨: **段階的移行（ハイブリッド → フルTauri）**

**理由:**
1. **起動速度改善が最優先課題** → Tauri化のメリット大
2. **Rust学習コストを分散** → 段階的に学べる
3. **リスク分散** → 失敗しても戻せる

**実施プラン:**
```
Week 1-2:  Phase 1（Tauri化）
Week 3-5:  Phase 2（Rust移行）
Week 6:    テスト・ドキュメント
```

---

## 📚 Learning Resources

### Rust学習

- 📖 [The Rust Book（日本語版）](https://doc.rust-jp.rs/book-ja/)
- 🎓 [Rustlings（演習問題）](https://github.com/rust-lang/rustlings)
- 🎥 [Let's Get Rusty（YouTube）](https://www.youtube.com/c/LetsGetRusty)

### Tauri学習

- 📖 [Tauri公式ガイド](https://tauri.app/v1/guides/)
- 🎓 [Tauri by Example](https://tauri.app/v1/guides/getting-started/prerequisites)
- 💬 [Tauri Discord](https://discord.gg/tauri)

### 参考プロジェクト

- 🔍 [Awesome Tauri](https://github.com/tauri-apps/awesome-tauri)
- 🖼️ [Tauri Examples](https://github.com/tauri-apps/tauri/tree/dev/examples)

---

## 📋 Checklist

移行開始前に確認すべき項目：

### Phase 0（環境構築）
- [ ] Rust 1.70+インストール済み
- [ ] Tauri CLI 1.5+インストール済み
- [ ] 各プラットフォームの開発環境整備
  - [ ] Windows: Visual Studio Build Tools
  - [ ] macOS: Xcode Command Line Tools
  - [ ] Linux: `libwebkit2gtk-4.0-dev` 等

### Phase 1（基本移行）
- [ ] Tauri プロジェクト作成完了
- [ ] フロントエンドビルドが通る
- [ ] IPC通信（1つ以上のコマンド）が動作
- [ ] パターンローダー実装完了

### Phase 2（高度な機能）
- [ ] マルチディスプレイ対応完了
- [ ] キャリブレーション（Windows/Linux/macOS）実装完了
- [ ] プレイリスト機能実装完了
- [ ] Webレンダリングモード実装完了

### Phase 3（パッケージング）
- [ ] Windows MSI生成成功
- [ ] Linux AppImage/deb生成成功
- [ ] macOS dmg生成成功
- [ ] スクリーンセーバー（.scr）ビルド成功

### Phase 4（最終確認）
- [ ] 全機能の動作テスト完了
- [ ] パフォーマンステスト（起動時間・メモリ）
- [ ] ドキュメント更新完了（CLAUDE.md, README.md）
- [ ] リリースノート作成

---

## 🎯 Conclusion

**PythonからTauriへの移行は技術的に完全に実現可能です。**

- ✅ **全機能を移行可能**（変えられない部分はなし）
- ⚡ **パフォーマンスは大幅改善**（起動速度85%高速化、メモリ60%削減）
- ⏱️ **工数は3-5週間**（フルタイム換算）
- ⚠️ **Rust学習コストは高い**（初心者の場合、追加1-2週間）

**推奨:**
- **段階的移行（ハイブリッド → フルTauri）**を推奨
- まずTauri化して起動速度を改善し、その後Rustに移行
- Tauri 2.0の安定リリース（2025年Q1予定）まで待つのも一案

---

**次のステップ:**
1. ✅ Rust環境をセットアップ
2. ✅ Tauriチュートリアルを完了
3. ✅ Phase 0（環境構築）を開始
4. ✅ このドキュメントをチームでレビュー

**質問・相談:**
- このドキュメントは `.claude/docs/tauri-migration-plan.md` に保存されています
- 各フェーズの詳細な実装手順は、移行開始時に別途作成します

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Author:** Claude Code
**Status:** ✅ Ready for Review
