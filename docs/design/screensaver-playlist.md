# XSG プレイリスト・スクリーンセーバー機能

## 🎯 新しい用途

### 1. スクリーンセーバー

- ランダムパターン生成
- 自動切り替え
- Windowsスクリーンセーバー（.scr）対応

### 2. デジタルサイネージ

- プレイリスト再生
- URL画像のタイル表示
- キャラクター/ロゴの全画面表示

### 3. 検査ツール

- テストパターンの自動切り替え
- タイマー機能

---

## 📋 プレイリスト形式

### 基本形式

```yaml
# playlist.yaml
version: "1.0"

# プレイリスト設定
playlist:
  mode: sequence # sequence | random | shuffle
  loop: true # ループ再生
  defaultDuration: 5000 # デフォルト表示時間（ms）

# アイテム
items:
  # 1. パターンファイルを指定
  - pattern: "@/patterns/colorbar.yaml"
    duration: 3000

  # 2. インラインパターン
  - inline:
      canvas:
        width: 1920
        height: 1080
      nodes:
        - type: background
          preset: checker
    duration: 5000

  # 3. URL画像（全画面）
  - image:
      src: "https://example.com/character.png"
      fit: cover
    duration: 10000

  # 4. URL画像（タイル）
  - image:
      src: "https://example.com/logo.png"
      tile: true
      tileSize: 200
    duration: 10000

  # 5. ランダム生成
  - generator: random
    count: 5 # 5個生成
    duration: 3000
```

---

## 🎲 ランダム生成機能

### ジェネレーター定義

```yaml
# playlist.yaml
playlist:
  mode: random

items:
  # ランダム生成
  - generator: random
    count: 10 # 10個生成
    duration: 5000
    constraints:
      # 制約条件
      presets: # 使用するプリセット
        - checker
        - colorbar
        - grayscale
      layers: # レイヤー数
        min: 1
        max: 5
      colors: # カラーパレット
        - "#FF0000"
        - "#00FF00"
        - "#0000FF"
        - "#FFFF00"
        - "#FF00FF"
        - "#00FFFF"
```

### ジェネレーター実装

```python
# backend/app/generator.py
import random
from typing import Dict, List

class PatternGenerator:
    def __init__(self, constraints: Dict):
        self.constraints = constraints

    def generate(self) -> Dict:
        """ランダムパターンを1つ生成"""
        pattern = {
            "canvas": {
                "width": 1920,
                "height": 1080,
            },
            "nodes": []
        }

        # 背景
        bg_preset = random.choice(self.constraints.get("presets", ["checker"]))
        pattern["nodes"].append({
            "type": "background",
            "preset": bg_preset,
            "params": self._random_params(bg_preset),
        })

        # レイヤー数
        layer_count = random.randint(
            self.constraints.get("layers", {}).get("min", 0),
            self.constraints.get("layers", {}).get("max", 3),
        )

        # 前景レイヤー
        for _ in range(layer_count):
            pattern["nodes"].append(self._random_layer())

        return pattern

    def _random_params(self, preset: str) -> Dict:
        """プリセット用のランダムパラメータ"""
        if preset == "checker":
            return {
                "size": random.randint(10, 200),
                "color1": random.choice(self.constraints.get("colors", ["#000000"])),
                "color2": random.choice(self.constraints.get("colors", ["#FFFFFF"])),
            }
        elif preset == "grayscale":
            return {
                "steps": random.choice([4, 8, 16, 32]),
                "direction": random.choice(["horizontal", "vertical"]),
            }
        # ... 他のプリセット

    def _random_layer(self) -> Dict:
        """ランダムな前景レイヤー"""
        layer_type = random.choice(["rect", "circle", "line"])

        if layer_type == "rect":
            return {
                "type": "rect",
                "x": random.randint(0, 1920),
                "y": random.randint(0, 1080),
                "width": random.randint(50, 500),
                "height": random.randint(50, 500),
                "fill": random.choice(self.constraints.get("colors", ["#FF0000"])),
                "opacity": random.uniform(0.5, 1.0),
            }
        # ... 他のタイプ
```

---

## ⏱️ 自動切り替え機能

### プレイリストランナー

```python
# backend/app/playlist.py
import asyncio
import yaml
from pathlib import Path
from typing import Dict, List

class PlaylistRunner:
    def __init__(self, playlist_file: Path):
        self.playlist = self._load_playlist(playlist_file)
        self.current_index = 0
        self.items = self._expand_items()

    def _load_playlist(self, file: Path) -> Dict:
        """プレイリストファイルを読み込み"""
        with open(file) as f:
            return yaml.safe_load(f)

    def _expand_items(self) -> List[Dict]:
        """ジェネレーターを展開"""
        items = []

        for item in self.playlist["items"]:
            if "generator" in item:
                # ランダム生成
                generator = PatternGenerator(item.get("constraints", {}))
                count = item.get("count", 1)

                for _ in range(count):
                    pattern = generator.generate()
                    items.append({
                        "pattern": pattern,
                        "duration": item.get("duration", 5000),
                    })
            else:
                items.append(item)

        return items

    def get_current(self) -> Dict:
        """現在のアイテムを取得"""
        return self.items[self.current_index]

    def next(self):
        """次のアイテムへ"""
        mode = self.playlist["playlist"].get("mode", "sequence")

        if mode == "sequence":
            self.current_index = (self.current_index + 1) % len(self.items)
        elif mode == "random":
            self.current_index = random.randint(0, len(self.items) - 1)
        elif mode == "shuffle":
            # シャッフル実装（Fisher-Yates）
            pass

    async def run(self, on_change_callback):
        """プレイリストを実行"""
        while True:
            item = self.get_current()
            duration = item.get("duration", self.playlist["playlist"].get("defaultDuration", 5000))

            # パターン変更
            await on_change_callback(item)

            # 待機
            await asyncio.sleep(duration / 1000)

            # 次へ
            self.next()

            # ループ設定
            if not self.playlist["playlist"].get("loop", True) and self.current_index == 0:
                break
```

---

## 🖥️ Windowsスクリーンセーバー対応

### .scrファイルの仕組み

Windowsスクリーンセーバーは**実質的に.exe**です：

- `.scr` = `.exe` をリネームしたもの
- `C:\Windows\System32\` に配置
- コマンドライン引数で動作を制御

### コマンドライン引数

```bash
# スクリーンセーバー起動
XSG.scr /s

# 設定画面
XSG.scr /c

# プレビュー（ウィンドウハンドル指定）
XSG.scr /p 12345
```

### 実装

```python
# backend/app/main.py
import sys
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--screensaver", "-s", action="store_true",
                        help="Run as screensaver")
    parser.add_argument("--config", "-c", action="store_true",
                        help="Show config dialog")
    parser.add_argument("--preview", "-p", type=int,
                        help="Preview mode (window handle)")
    parser.add_argument("--playlist", type=str,
                        help="Playlist file")
    args = parser.parse_args()

    if args.screensaver or args.preview:
        # スクリーンセーバーモード
        playlist_file = args.playlist or "screensaver.yaml"
        run_screensaver(playlist_file, preview_hwnd=args.preview)
    elif args.config:
        # 設定画面
        show_config_dialog()
    else:
        # 通常モード
        run_normal_mode()

def run_screensaver(playlist_file: str, preview_hwnd: int = None):
    """スクリーンセーバーモード"""
    runner = PlaylistRunner(Path(playlist_file))

    # PyWebView起動
    if preview_hwnd:
        # プレビューモード（小さいウィンドウ）
        window = webview.create_window(
            title="XSG Preview",
            url=url,
            width=300,
            height=200,
        )
    else:
        # フルスクリーンモード
        window = webview.create_window(
            title="XSG Screensaver",
            url=url,
            fullscreen=True,
            frameless=True,
        )

    # プレイリスト実行
    asyncio.run(runner.run(lambda item: change_pattern(window, item)))
```

### ビルド

```bash
# .scrファイルをビルド
cd backend

# PyInstallerでビルド
pyinstaller --noconfirm \
    --onefile \
    --windowed \
    --name XSG \
    --add-data "frontend/dist:frontend/dist" \
    --add-data "presets:presets" \
    --add-data "screensaver.yaml:." \
    app/main.py

# .exe → .scr にリネーム
mv dist/XSG.exe dist/XSG.scr

# インストール
copy dist\XSG.scr C:\Windows\System32\
```

---

## 🎨 使用例

### 例1: シンプルなスクリーンセーバー

```yaml
# screensaver.yaml
version: "1.0"

playlist:
  mode: random
  loop: true
  defaultDuration: 10000

items:
  # ランダム生成（無限）
  - generator: random
    count: 100
    constraints:
      presets:
        - checker
        - colorbar
        - grayscale
        - crosshatch
```

**起動:**

```bash
# スクリーンセーバーとして
XSG.scr /s

# または直接
uv run python -m app.main --screensaver --playlist screensaver.yaml
```

---

### 例2: URL画像スクリーンセーバー

```yaml
# character-slideshow.yaml
version: "1.0"

playlist:
  mode: sequence
  loop: true
  defaultDuration: 5000

items:
  # URL画像を全画面表示
  - image:
      src: "https://i.imgur.com/example1.png"
      fit: cover
    duration: 5000

  - image:
      src: "https://i.imgur.com/example2.png"
      fit: contain
    duration: 5000

  # タイル表示
  - image:
      src: "https://i.imgur.com/logo.png"
      tile: true
      tileSize: 300
    duration: 10000
```

---

### 例3: デジタルサイネージ

```yaml
# signage.yaml
version: "1.0"

playlist:
  mode: sequence
  loop: true

items:
  # 会社ロゴ
  - inline:
      canvas:
        width: 1920
        height: 1080
      nodes:
        - type: background
          fill: "#FFFFFF"
        - type: image
          src: "@/images/company-logo.png"
          x: "50%"
          y: "50%"
          scale: 2.0
    duration: 5000

  # お知らせ（URL画像）
  - image:
      src: "https://example.com/notice.png"
      fit: contain
    duration: 10000

  # テストパターン
  - pattern: "@/patterns/colorbar.yaml"
    duration: 3000
```

---

### 例4: 検査用自動切り替え

```yaml
# inspection.yaml
version: "1.0"

playlist:
  mode: sequence
  loop: true
  defaultDuration: 2000

items:
  - pattern: "@/patterns/colorbar.yaml"
  - pattern: "@/patterns/checker.yaml"
  - pattern: "@/patterns/grayscale.yaml"
  - pattern: "@/patterns/white.yaml"
  - pattern: "@/patterns/black.yaml"
  - pattern: "@/patterns/red.yaml"
  - pattern: "@/patterns/green.yaml"
  - pattern: "@/patterns/blue.yaml"
```

---

## 📊 プレイリストスキーマ

```yaml
# playlist-schema.yaml
version: "1.0"

playlist:
  mode: sequence | random | shuffle
  loop: boolean
  defaultDuration: number # ms

items:
  - # Option 1: パターンファイル
    pattern: string # パスまたはURL
    duration: number

  - # Option 2: インラインパターン
    inline: XSGPattern # 通常のパターン定義
    duration: number

  - # Option 3: 画像
    image:
      src: string # パスまたはURL
      fit: contain | cover | fill
      tile: boolean
      tileSize: number
    duration: number

  - # Option 4: ランダム生成
    generator: random
    count: number
    duration: number
    constraints:
      presets: string[]
      layers:
        min: number
        max: number
      colors: string[]
```

---

## 🚀 実装の優先順位

### v1.0（必須）

1. ✅ **プレイリスト基本形式** - YAML定義
2. ✅ **自動切り替え** - タイマー機能
3. ✅ **sequence/random/shuffle** - 再生モード

### v1.1（推奨）

4. ✅ **ランダム生成** - ジェネレーター関数
5. ✅ **URL画像対応** - HTTP/HTTPS
6. ✅ **タイル表示** - 画像の繰り返し

### v1.2（スクリーンセーバー）

7. ✅ **Windowsスクリーンセーバー対応** - .scr
8. ✅ **設定画面** - プレイリスト選択
9. ✅ **プレビュー** - 小ウィンドウ表示

---

## 🎯 メリット

### 1. 新しい用途

- ✅ スクリーンセーバー
- ✅ デジタルサイネージ
- ✅ キャラクター展示
- ✅ ロゴ表示

### 2. 柔軟性

- ✅ プレイリストで自由に組み合わせ
- ✅ ランダム生成で無限バリエーション
- ✅ URL画像でネットから直接表示

### 3. 実用性

- ✅ 検査作業の効率化（自動切り替え）
- ✅ スクリーンセーバーとして常時表示
- ✅ デジタルサイネージとして商用利用

---

## ✅ まとめ

**新機能:**

1. ✅ **プレイリスト** - 複数パターンの自動切り替え
2. ✅ **ランダム生成** - 無限バリエーション
3. ✅ **URL画像** - ネットから直接表示
4. ✅ **スクリーンセーバー** - Windowsネイティブ対応

**用途:**

- 🎯 テストパターン検査（本来の用途）
- 🖼️ キャラクター/ロゴ表示
- 💻 スクリーンセーバー
- 📺 デジタルサイネージ

これにより、XSGは**信号発生器の枠を超えた汎用ツール**になります！
