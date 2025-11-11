# XSG Development Guide

このドキュメントは、XSGプロジェクトの技術的な実装と開発ガイドをまとめたものです。

## プロジェクト概要

XSG（Signal Generator）は、高価な業務用信号発生器の代替となるデスクトップアプリケーションです。フルスクリーン・フレームレス表示が可能で、プロフェッショナルな映像テスト環境を提供します。

## アーキテクチャ

### 技術スタック

- **フロントエンド**: Vite 6.0 + React 18 + TypeScript 5.7
- **スタイリング**: Tailwind CSS 3.4
- **バックエンド**: FastAPI 0.121 + PyWebView 6.1
- **パッケージ管理**:
  - フロントエンド: npm
  - バックエンド: uv (Python package manager)
- **デプロイ**: PyInstaller（シングルバイナリ化）

### プロジェクト構成

```
xsg/
├── frontend/                    # Vite + React アプリケーション
│   ├── src/
│   │   ├── components/          # React コンポーネント
│   │   │   ├── patterns/        # テストパターン実装
│   │   │   ├── PatternDisplay.tsx
│   │   │   └── PatternMenu.tsx
│   │   ├── lib/                 # ユーティリティとタイプ定義
│   │   ├── App.tsx              # ルートコンポーネント
│   │   ├── main.tsx             # エントリーポイント
│   │   └── index.css            # グローバルスタイル
│   ├── public/                  # 静的アセット
│   ├── dist/                    # ビルド出力（.gitignore）
│   ├── index.html               # HTMLテンプレート
│   ├── vite.config.ts           # Vite設定
│   ├── tailwind.config.ts       # Tailwind設定
│   ├── tsconfig.json            # TypeScript設定
│   └── package.json             # npm依存関係
│
└── backend/                     # FastAPI + PyWebView
    ├── app/
    │   ├── __init__.py
    │   └── main.py              # FastAPI + PyWebView統合
    ├── .venv/                   # Python仮想環境（.gitignore）
    ├── pyproject.toml           # uv依存関係
    ├── build.bat/sh             # ビルドスクリプト
    └── dev.bat/sh               # 開発モードスクリプト
```

## フロントエンド（Vite + React）

### 特徴

- ⚡ **高速ビルド**: ViteによるHMR（Hot Module Replacement）
- 🎨 **シンプルな構成**: SSR不要、純粋なSPA
- 📦 **軽量**: 必要最小限の依存関係
- 🔧 **パスエイリアス**: `@/` でsrcディレクトリを参照可能

### 開発コマンド

```bash
cd frontend
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動（http://localhost:3000）
npm run build        # プロダクションビルド（dist/）
npm run preview      # ビルド結果をプレビュー
npm run lint         # ESLintチェック
npm run format       # Prettierフォーマット
```

### パターンの実装

全てのテストパターンは `src/components/patterns/` に配置されています。

**実装例（ColorBar.tsx）:**

```tsx
import { useEffect, useRef } from 'react';

export default function ColorBar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 描画ロジック
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // カラーバーを描画
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
```

## バックエンド（FastAPI + PyWebView）

### 特徴

- 🖥️ **デスクトップアプリ化**: PyWebViewによるネイティブウィンドウ
- 🚀 **フルスクリーン起動**: フレームレス・タイトルバーなし
- 🔌 **REST API**: FastAPIによるパターン制御
- 🐍 **Python統合**: OSレベルのガンマ補正制御が可能

### 開発コマンド

```bash
cd backend
uv sync              # 依存関係インストール
uv run python -m app.main --dev  # 開発モード起動
uv run python -m app.main        # 本番モード起動
uv run python -m app.main --api-only  # APIサーバーのみ
```

または、開発スクリプトを使用：

```bash
# Windows
dev.bat

# Linux/macOS
chmod +x dev.sh
./dev.sh
```

### FastAPI エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/` | API情報 |
| GET | `/api/patterns` | 全パターン一覧 |
| GET | `/api/patterns/{id}` | パターン詳細 |
| POST | `/api/gamma` | ガンマ補正設定 |
| GET | `/api/gamma` | ガンマ補正取得 |

**使用例:**

```bash
# パターン一覧取得
curl http://localhost:8000/api/patterns

# ガンマ補正設定
curl -X POST http://localhost:8000/api/gamma \
  -H "Content-Type: application/json" \
  -d '{"value": 2.2, "enabled": true}'
```

### PyWebView統合

`app/main.py`でFastAPIとPyWebViewを統合：

```python
# FastAPI起動（バックグラウンドスレッド）
api_thread = threading.Thread(
    target=start_api_server,
    kwargs={"port": 8000},
    daemon=True,
)
api_thread.start()

# PyWebViewウィンドウ作成
webview.create_window(
    title="XSG - Signal Generator",
    url="http://localhost:3000",  # 開発モード
    fullscreen=True,
    frameless=True,
    resizable=False,
)
webview.start()
```

## ビルドとデプロイ

### プロダクションビルド

```bash
# フロントエンドビルド
cd frontend
npm install
npm run build  # → frontend/dist/

# バックエンド + パッケージング
cd ../backend
uv sync
uv pip install pyinstaller

# Windows
build.bat

# Linux/macOS
chmod +x build.sh
./build.sh
```

### PyInstallerオプション

```bash
pyinstaller --noconfirm \
    --onefile \              # シングルバイナリ
    --windowed \             # コンソールウィンドウを隠す
    --name XSG \             # 実行ファイル名
    --add-data "frontend/dist:frontend/dist" \  # フロントエンドを同梱
    app/main.py
```

**出力:**
- Windows: `backend/dist/XSG.exe`
- Linux/macOS: `backend/dist/XSG`

## 開発ワークフロー

### 1. 新しいパターンを追加

```bash
# 1. フロントエンドにパターンコンポーネント追加
frontend/src/components/patterns/NewPattern.tsx

# 2. PatternDisplay.tsxに登録
# 3. PatternMenu.tsxにメニュー項目追加

# 4. APIにパターン情報追加（オプション）
backend/app/main.py の get_patterns() に追加
```

### 2. APIエンドポイント追加

```python
# backend/app/main.py

@app.post("/api/custom-endpoint")
async def custom_endpoint(data: CustomModel):
    # 処理
    return {"status": "ok"}
```

### 3. フロントエンドからAPI呼び出し

```typescript
// frontend/src/components/SomeComponent.tsx

const response = await fetch('http://localhost:8000/api/custom-endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'value' })
});
const result = await response.json();
```

## 技術的な特徴

### フルスクリーン表示

PyWebViewの `fullscreen=True` と `frameless=True` により、タイトルバーなしの完全フルスクリーン表示が可能です。

```python
webview.create_window(
    title="XSG",
    url=url,
    fullscreen=True,   # フルスクリーン
    frameless=True,    # フレームレス
    resizable=False,   # リサイズ不可
)
```

### URLパラメータによるパターン切り替え

```
http://localhost:3000/?pattern=colorbar
http://localhost:3000/?pattern=checker
http://localhost:3000/?pattern=vgradient&steps=128
```

### キーボードショートカット

- `M` キー: パターンメニューを開く/閉じる
- `ESC` キー: メニューを閉じる

### シングルインスタンス制御

XSGは**同時に1つのインスタンスのみ**起動可能です。多重起動を防止し、既存インスタンスに対してパターン変更を送信します。

#### 仕組み

1. **排他制御**: ポート19999でソケットをバインドし、唯一のインスタンスであることを保証
2. **多重起動時の動作**:
   - 新しいプロセスは既存プロセスを検出
   - HTTP APIで既存プロセスに `--pattern` 引数を送信
   - 既存プロセスがそのパターンに切り替わる
   - 新しいプロセスは終了

#### 使用例

```bash
# 1回目の起動: colorbarで表示
uv run python -m app.main --dev --pattern colorbar

# 別ターミナルで2回目の起動を試みる
uv run python -m app.main --dev --pattern checker

# 結果:
# - 2回目のプロセスは起動せず終了
# - 既存プロセスの表示がcheckerに切り替わる
```

#### 実装詳細

```python
# シングルトンチェック
def check_singleton() -> bool:
    singleton_socket.bind(("127.0.0.1", 19999))
    return True  # バインド成功 = 唯一のインスタンス

# 多重起動時の処理
if not check_singleton():
    # 既存インスタンスにパターン送信
    httpx.post("http://127.0.0.1:8000/api/pattern",
               json={"pattern": args.pattern, "params": {}})
    sys.exit(0)
```

### マルチディスプレイ対応

XSGは複数のディスプレイに同時に表示可能です。位置ベースの柔軟な指定方法をサポートします。

#### ディスプレイ一覧の表示

```bash
uv run python -m app.main --list-displays
```

**出力例:**
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

#### ディスプレイ指定方法

**全体指定:**
```bash
--display all           # 全ディスプレイ（デフォルト）
--display primary       # プライマリディスプレイのみ
```

**位置ベース指定（グループ単位）:**
```bash
# 左右方向
--display left          # 左端グループ（left-1の略）
--display left-2        # 左から2番目のグループ
--display right         # 右端グループ
--display right-2       # 右から2番目のグループ

# 上下方向
--display top           # 上端グループ（top-1の略）
--display top-2         # 上から2番目のグループ
--display bottom        # 下端グループ
--display bottom-2      # 下から2番目のグループ
```

**複数指定（カンマ区切り）:**
```bash
--display left,right           # 左端と右端
--display top,bottom           # 上端と下端
--display left-1,left-2        # 左から1番目と2番目
```

#### グループの概念

**重要**: 同じ座標から始まるディスプレイは1つのグループとして扱われます。

```
例: Y座標が同じディスプレイが2台横並び

  [A: 2560x1440]  [B: 1920x1080]  ← Y=0（グループ1）
  (0, 0)          (2560, 0)

--display top      → A, B の両方（上端グループ全体）
--display left     → A のみ（左端グループ）
--display right    → B のみ（右端グループ）
```

#### 実装詳細

```python
# ディスプレイ情報取得（screeninfo使用）
def get_display_info():
    monitors = get_monitors()
    return [{
        "x": m.x,
        "y": m.y,
        "width": m.width,
        "height": m.height,
        "is_primary": m.is_primary
    } for m in monitors]

# 座標でグループ化
def group_displays_by_position(displays, axis="x"):
    # 同じX座標（またはY座標）のディスプレイをグループ化
    groups = defaultdict(list)
    for display in displays:
        coord = display[axis]
        groups[coord].append(display)
    return sorted(groups.items())

# 各ディスプレイにウィンドウを作成
for display in selected_displays:
    window = webview.create_window(
        url=url,
        x=display["x"],
        y=display["y"],
        width=display["width"],
        height=display["height"],
        frameless=True
    )
```

### パターン制御アーキテクチャ

XSGでは、**Pythonバックエンドが完全にパターンを制御**します。

#### フロー

```
1. 起動時: --pattern 引数でパターン指定
   python -m app.main --dev --pattern colorbar
   ↓
2. バックエンドが状態保持 (AppState)
   ↓
3. PyWebViewで該当URLをロード
   http://localhost:3000/?pattern=colorbar
   ↓
4. GUI操作: ユーザーがパターン選択
   ↓
5. フロントエンド → POST /api/pattern
   ↓
6. バックエンド → window.load_url() でURL変更
   ↓
7. 画面が新しいパターンに切り替わる
```

#### 重要な設計原則

- **GUIは直接パターンを変更しない**: 必ずAPIを経由
- **状態はバックエンドが保持**: `app_state.current_pattern`
- **URLパラメータは維持**: フロントエンドはURLベースで動作

## 将来の拡張計画

### 実装済み
- ✅ Vite + React フロントエンド
- ✅ FastAPI バックエンド
- ✅ PyWebView デスクトップラッパー
- ✅ フルスクリーン・フレームレス表示
- ✅ REST API
- ✅ uv パッケージマネージャー
- ✅ シングルインスタンス制御
- ✅ コマンドライン引数でパターン指定
- ✅ API経由のパターン制御
- ✅ マルチディスプレイ対応（位置ベース指定）

### 今後の実装
- 🔄 OSレベルのガンマ補正制御
- 🔄 カスタムパターンエディタ
- 🔄 パターンアニメーション
- 🔄 設定ファイルの保存/読み込み
- 🔄 より高度なテストパターン（Zone Plate、Needleなど）

## トラブルシューティング

### Vite開発サーバーが起動しない

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### PyWebViewウィンドウが開かない

```bash
cd backend
uv sync
# Windowsの場合、.NET Framework 4.7.2以上が必要
```

### ビルドエラー

```bash
# フロントエンド
cd frontend
npm run build

# バックエンド
cd backend
uv sync
# pyproject.tomlの[tool.hatch.build.targets.wheel]を確認
```

## 参考リンク

- [Vite Documentation](https://vite.dev/)
- [React Documentation](https://react.dev/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [PyWebView Documentation](https://pywebview.flowrl.com/)
- [uv Documentation](https://docs.astral.sh/uv/)
- [PyInstaller Documentation](https://pyinstaller.org/)

## ライセンス

MIT License

## 作者

kako-jun

---

## 移植元アプリ（pg）の調査

XSGは pgアプリの機能を移植・改善したアプリケーションです。

### 移植元の技術スタック

- **フレームワーク**: Vue.js + Electron
- **Canvas描画**: HTML5 Canvas 2D Context API
- **API**: Express.js（ポート20190）
- **画像管理**: public/images/bg/ と public/images/fg/ にPNG/GIF/BMP

### 移植元のアーキテクチャ

#### レイヤーシステム

移植元アプリは **2層構造** を採用：

1. **Background（背景層）**
   - パターン全体の基礎となる層
   - 1つのbackgroundオブジェクトのみ

2. **Foreground（前景層）**
   - 背景の上に重ねて描画される層
   - 複数のforegroundオブジェクトを配列で管理
   - ドット欠け、ライン、ウィンドウ、画像などを描画

#### パターンタイプ

**Background Types:**
```javascript
Pattern.BackgroundType = {
  Solid: "Solid",              // 単色塗りつぶし
  Crosshatch: "Crosshatch",    // クロスハッチ（格子）
  Mesh: "Mesh",                // メッシュ（市松模様）
  Grayscale: "Grayscale",      // グレースケール（段階）
  RepeatCropImage: "RepeatCropImage",  // 画像の繰り返しクロップ
  Image: "Image",              // 画像表示
}
```

**Foreground Types:**
```javascript
Pattern.ForegroundType = {
  Dot: "Dot",                  // ドット（画素欠け）
  Line: "Line",                // ライン
  Window: "Window",            // ウィンドウ（移動する矩形）
  Image: "Image",              // 画像表示
  Crosshatch: "Crosshatch",    // クロスハッチ（格子）
}
```

#### API仕様

**エンドポイント:**
```bash
GET /show?bg={background_json}&fg={foreground_array_json}
GET /answer?visibility=true|false
GET /quit
```

**パラメータ例（推測）:**
```javascript
// Background
{
  "type": "Grayscale",
  "step_num": 16,
  "grayscale_direction": "h",  // h: horizontal, v: vertical
  "grayscale_inverse": false,
  "flat_step_ids": [],
  "inverted_step_ids": []
}

// Foreground (配列)
[
  {
    "type": "Dot",
    "x": 960,
    "y": 540,
    "rgb_string": "RGB(255, 0, 0)",
    "alpha": 1.0
  },
  {
    "type": "Image",
    "image_id": "fg/クロストーク",
    "x": 960,
    "y": 540,
    "image_scale": 1.0,
    "image_stretch": "fill",  // or "none"
    "alpha": 1.0,
    "rotate": 0,
    "blur_radius": 0
  }
]
```

#### 主な機能

**共通プロパティ:**
- `rgb_string`: 色指定（"RGB(r, g, b)"形式）
- `alpha`: 透明度（0.0-1.0）
- `rotate`: 回転角度（0-360度）
- `blur_radius`: ぼかし半径（0-10）

**Foreground専用プロパティ:**
- `blink_interval`: 点滅間隔（ミリ秒）
- `line_direction`: ラインの方向（"h" or "v"）
- `line_length`: ラインの長さ
- `line_width`: ラインの幅
- `window_width`, `window_height`: ウィンドウサイズ
- `window_speed`: ウィンドウの移動速度
- `image_id`: 画像ファイル名（拡張子なし、またはフルパス）
- `image_scale`: 画像のスケール
- `image_stretch`: 画像の引き伸ばし方法

**Background専用プロパティ:**
- `rect_width`, `rect_height`: クロスハッチ/メッシュのセルサイズ
- `rgb_string2`: 2色目（クロスハッチ/メッシュ用）
- `step_num`: グレースケールのステップ数
- `grayscale_direction`: グレースケールの方向
- `grayscale_inverse`: グレースケールの反転
- `flat_step_ids`: フラット化するステップID配列
- `inverted_step_ids`: 反転するステップID配列

#### 座標指定の柔軟性

座標や長さは以下の形式で指定可能：
- 絶対値: `"100"` → 100ピクセル
- パーセンテージ: `"50p"` → 画面幅/高さの50%
- 複合指定: `"50pplus10"` → 50% + 10px、`"50pminus10"` → 50% - 10px

```javascript
decodeRatio("50p", "h")         // 画面幅の50%
decodeRatio("50pplus10", "h")   // 画面幅の50% + 10px
decodeRatio("50pminus10", "h")  // 画面幅の50% - 10px
decodeRatio("100", "h")         // 100px
```

### 画像リソース

**Background画像:**
- 砂嵐（sandstorm）
- テストチャート（ISO12233）
- CN（カラーノイズ）パターン

**Foreground画像:**
- グレースケール（赤/緑/青）
- クロストーク
- caltab（キャリブレーションターゲット）
- 各種テストパターン

### 移植の課題と方針

#### 1. スキーマの改善

**問題点:**
- 元のJSONスキーマは自由形式で、バリデーションがない
- プロパティ名が直感的でない（`rgb_string`など）
- 座標指定の文字列パース（`"50pplus10"`）が複雑

**改善方針:**
- **JSON Schemaで標準化**: 厳密なバリデーションを導入
- **Canvas 2D Context APIに寄せる**: 標準的なプロパティ名を使用
- **座標指定の簡素化**: パーセント指定は別フィールドに分離

**新スキーマ案:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "background": {
      "type": "object",
      "properties": {
        "type": {
          "enum": ["solid", "crosshatch", "mesh", "grayscale", "image"]
        },
        "color": {
          "type": "string",
          "pattern": "^#[0-9A-Fa-f]{6}$"
        },
        "opacity": {
          "type": "number",
          "minimum": 0,
          "maximum": 1
        }
      }
    },
    "foreground": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "enum": ["dot", "line", "rect", "image", "crosshatch"]
          },
          "x": { "type": "number" },
          "y": { "type": "number" },
          "color": { "type": "string" },
          "opacity": { "type": "number" }
        }
      }
    }
  }
}
```

#### 2. ファイル読み込み機能

**要件:**
- コマンドライン引数でJSONファイルを指定
- YAMLファイルもサポート
- 画像ファイルの参照

**実装方針:**
```bash
# パターンファイルを読み込んで表示
uv run python -m app.main --file patterns/my_pattern.json
uv run python -m app.main --file patterns/my_pattern.yaml

# 画像ディレクトリを指定
uv run python -m app.main --file patterns/my_pattern.json --images ./images
```

#### 3. レイヤーシステムの実装

**React + Canvas実装案:**

```typescript
// frontend/src/components/PatternCanvas.tsx
interface BackgroundLayer {
  type: 'solid' | 'crosshatch' | 'mesh' | 'grayscale' | 'image';
  color?: string;
  opacity?: number;
  // type-specific properties
}

interface ForegroundLayer {
  type: 'dot' | 'line' | 'rect' | 'image' | 'crosshatch';
  x: number;
  y: number;
  color?: string;
  opacity?: number;
  // type-specific properties
}

interface Pattern {
  background: BackgroundLayer;
  foreground: ForegroundLayer[];
}

function renderPattern(canvas: HTMLCanvasElement, pattern: Pattern) {
  const ctx = canvas.getContext('2d')!;

  // 1. Render background
  renderBackground(ctx, pattern.background);

  // 2. Render foreground layers
  pattern.foreground.forEach(fg => {
    renderForeground(ctx, fg);
  });
}
```

#### 4. 画像表示の実装

**方針:**
- 画像は `public/images/` に配置
- フロントエンドから直接読み込み（開発時）
- バックエンドがbase64エンコードして送信（本番時）

**代替案:**
- APIエンドポイントで画像を配信（`/api/images/{filename}`）
- 画像をインポートして静的アセットとして扱う

#### 5. アニメーション機能

**実装が必要な機能:**
- 点滅（blink）
- 移動ウィンドウ（window）
- requestAnimationFrameで実装

#### 6. 互換性レイヤー

**旧形式のサポート:**
- 旧APIエンドポイント `/show?bg=...&fg=...` をサポート
- 旧JSON形式から新形式への変換関数を実装

```python
# backend/app/compat.py
def convert_legacy_pattern(bg_json: str, fg_json: str) -> dict:
    """Convert legacy pattern format to new format"""
    bg = json.loads(bg_json)
    fg = json.loads(fg_json)

    return {
        "background": convert_background(bg),
        "foreground": [convert_foreground(f) for f in fg]
    }
```

### 標準スキーマとの比較

テストパターン記述のための標準規格・候補を比較検討します。

#### 候補1: Canvas 2D Context API（2004年～）

**概要:**
- HTML5 Canvas要素の描画API
- `fillStyle`, `strokeStyle`, `globalAlpha`, `rotate()`, `drawImage()`など

**メリット:**
- ✅ シンプルで習得しやすい
- ✅ 全ブラウザでサポート（IE9+）
- ✅ ピクセル精度の制御が可能
- ✅ ドキュメント・サンプルが豊富
- ✅ 画像データへの直接アクセス（`getImageData`）

**デメリット:**
- ⚠️ 古い仕様（2004年）
- ⚠️ 宣言的でない（命令的プログラミング）
- ⚠️ 状態管理が煩雑（`save()`/`restore()`）

**スキーマ例:**
```json
{
  "fillStyle": "#FF0000",
  "globalAlpha": 1.0,
  "operations": [
    {"type": "fillRect", "x": 0, "y": 0, "width": 100, "height": 100}
  ]
}
```

#### 候補2: SVG (Scalable Vector Graphics)（2001年～）

**概要:**
- XMLベースのベクター画像フォーマット
- W3C標準、広く使われている

**メリット:**
- ✅ ベクター形式（拡大しても綺麗）
- ✅ XML/JSON形式で宣言的に記述可能
- ✅ CSSでスタイリング可能
- ✅ DOMとして操作できる
- ✅ アニメーション機能が充実（SMIL）

**デメリット:**
- ⚠️ ピクセル精度の制御が難しい
- ⚠️ 複雑な仕様（フィルター、マスク、グラデーション等）
- ⚠️ 大量のオブジェクトでパフォーマンス低下

**スキーマ例:**
```xml
<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">
  <rect x="0" y="0" width="100" height="100" fill="#FF0000" opacity="1.0"/>
  <circle cx="50" cy="50" r="20" fill="#00FF00"/>
</svg>
```

JSON化も可能：
```json
{
  "svg": {
    "width": 1920,
    "height": 1080,
    "elements": [
      {"type": "rect", "x": 0, "y": 0, "width": 100, "height": 100, "fill": "#FF0000"}
    ]
  }
}
```

#### 候補3: WebGL / WebGPU（2011年～ / 2023年～）

**概要:**
- GPU加速による高速描画API
- WebGPUは次世代グラフィックスAPI

**メリット:**
- ✅ 高速（GPU活用）
- ✅ 高度なシェーダー処理が可能
- ✅ 大量のオブジェクトを高速描画

**デメリット:**
- ❌ 複雑すぎる（シェーダー言語が必要）
- ❌ テストパターン生成には過剰
- ⚠️ WebGPUはまだブラウザサポートが限定的
- ⚠️ ピクセル精度よりパフォーマンス重視

**評価:** オーバースペック、採用しない

#### 候補4: CSS Paint API (Houdini)（2018年～）

**概要:**
- CSSで描画ロジックを定義できるAPI
- Canvas 2D Context APIのサブセット

**メリット:**
- ✅ CSSと統合されている
- ✅ 宣言的に記述可能

**デメリット:**
- ❌ ブラウザサポートが限定的（Chrome/Edge のみ）
- ⚠️ 基本的にCanvas 2D APIのラッパー
- ⚠️ ドキュメントが少ない

**評価:** まだ早い、Canvas 2Dで十分

#### 候補5: 独自JSON形式（AfterEffects / Lottie / Rive等）

**概要:**
- アニメーションツールのエクスポート形式
- Lottie: After Effectsのアニメーションをエクスポート

**メリット:**
- ✅ 宣言的で理解しやすい
- ✅ アニメーション記述が充実
- ✅ ツールでの編集が可能

**デメリット:**
- ⚠️ 標準規格ではない（各社独自）
- ⚠️ テストパターン生成向けではない
- ⚠️ 複雑な仕様

**Lottie例:**
```json
{
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 180,
  "w": 1920,
  "h": 1080,
  "layers": [
    {
      "ty": 1,
      "sw": 1920,
      "sh": 1080,
      "sc": "#ff0000"
    }
  ]
}
```

#### 候補6: Processing / p5.js風の記述

**概要:**
- アーティスト向けプログラミング言語・ライブラリ
- シンプルで直感的

**メリット:**
- ✅ 非常にシンプル
- ✅ 教育目的に最適

**デメリット:**
- ⚠️ 標準規格ではない
- ⚠️ JSONで表現しにくい（コード中心）

**評価:** JSONスキーマとしては不適

#### 候補7: GStreamer / FFmpeg風の記述

**概要:**
- 動画処理フレームワークの記述形式
- テストパターン生成機能がある

**FFmpeg例:**
```bash
ffmpeg -f lavfi -i testsrc=size=1920x1080:rate=30 output.mp4
ffmpeg -f lavfi -i color=c=red:s=1920x1080 output.mp4
```

**メリット:**
- ✅ 業務用映像機器で広く使われている
- ✅ テストパターン生成のための機能が充実

**デメリット:**
- ⚠️ コマンドライン向けの記述
- ⚠️ JSON化が難しい

**評価:** 参考になるが、そのまま採用は難しい

---

### 比較表

| 候補 | 標準性 | 宣言的 | ピクセル精度 | 学習容易性 | ブラウザサポート | 総合評価 |
|------|--------|--------|------------|-----------|----------------|---------|
| **Canvas 2D** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | **⭐⭐⭐** |
| **SVG** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐⭐ | **⭐⭐** |
| **WebGL/GPU** | ⭐⭐ | ⭐ | ⭐⭐ | ⭐ | ⭐⭐ | ⭐ |
| **CSS Paint** | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐ | ⭐ |
| **Lottie等** | ⭐ | ⭐⭐⭐ | ⭐ | ⭐⭐ | ⭐⭐ | ⭐ |

---

### 推奨: ハイブリッドアプローチ

**結論: Canvas 2D Context API + SVG的な宣言的記述**

Canvas 2D APIの命令的な記述をそのまま使うのではなく、**SVGのような宣言的な記述**をJSONで定義し、それをCanvas 2D APIで描画する方式を採用します。

**新スキーマ案（改訂版）:**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "XSG Pattern Schema v1.0",
  "type": "object",
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0"
    },
    "canvas": {
      "type": "object",
      "properties": {
        "width": {"type": "integer"},
        "height": {"type": "integer"}
      }
    },
    "background": {
      "oneOf": [
        {
          "type": "object",
          "properties": {
            "type": {"const": "solid"},
            "fill": {"type": "string", "pattern": "^#[0-9A-Fa-f]{6}$"},
            "opacity": {"type": "number", "minimum": 0, "maximum": 1}
          },
          "required": ["type", "fill"]
        },
        {
          "type": "object",
          "properties": {
            "type": {"const": "gradient"},
            "direction": {"enum": ["horizontal", "vertical"]},
            "steps": {"type": "integer", "minimum": 2},
            "reverse": {"type": "boolean"}
          },
          "required": ["type", "direction", "steps"]
        },
        {
          "type": "object",
          "properties": {
            "type": {"const": "image"},
            "src": {"type": "string"},
            "fit": {"enum": ["fill", "contain", "cover"]},
            "opacity": {"type": "number"}
          },
          "required": ["type", "src"]
        }
      ]
    },
    "foreground": {
      "type": "array",
      "items": {
        "oneOf": [
          {
            "type": "object",
            "properties": {
              "type": {"const": "dot"},
              "x": {"type": "number"},
              "y": {"type": "number"},
              "fill": {"type": "string"},
              "opacity": {"type": "number"}
            },
            "required": ["type", "x", "y"]
          },
          {
            "type": "object",
            "properties": {
              "type": {"const": "line"},
              "x1": {"type": "number"},
              "y1": {"type": "number"},
              "x2": {"type": "number"},
              "y2": {"type": "number"},
              "stroke": {"type": "string"},
              "strokeWidth": {"type": "number"}
            },
            "required": ["type", "x1", "y1", "x2", "y2"]
          },
          {
            "type": "object",
            "properties": {
              "type": {"const": "rect"},
              "x": {"type": "number"},
              "y": {"type": "number"},
              "width": {"type": "number"},
              "height": {"type": "number"},
              "fill": {"type": "string"},
              "stroke": {"type": "string"},
              "opacity": {"type": "number"}
            },
            "required": ["type", "x", "y", "width", "height"]
          },
          {
            "type": "object",
            "properties": {
              "type": {"const": "image"},
              "src": {"type": "string"},
              "x": {"type": "number"},
              "y": {"type": "number"},
              "width": {"type": "number"},
              "height": {"type": "number"},
              "opacity": {"type": "number"},
              "rotate": {"type": "number"}
            },
            "required": ["type", "src", "x", "y"]
          }
        ]
      }
    }
  },
  "required": ["version", "background"]
}
```

**利点:**
- ✅ **宣言的**: SVGのように要素を定義するだけ
- ✅ **標準プロパティ名**: SVG/CSSと同じ命名（`fill`, `stroke`, `opacity`）
- ✅ **厳密なバリデーション**: JSON Schemaで型チェック
- ✅ **実装の柔軟性**: Canvas 2D / WebGL / SVGどれでも実装可能

**プロパティ命名規則（SVG/CSS準拠）:**
- `fill`: 塗りつぶし色（Canvas 2Dの`fillStyle`に相当）
- `stroke`: 線の色（`strokeStyle`）
- `opacity`: 透明度（`globalAlpha`）
- `strokeWidth`: 線の太さ（`lineWidth`）
- `x`, `y`, `width`, `height`: 座標とサイズ

この方式なら、**SVGの表現力**と**Canvas 2Dの実装しやすさ**の両方を活かせます。

### 移植計画

#### Phase 1: 基本レイヤーシステム（優先度: 高）
- ✅ 単色背景（Solid）
- ✅ グレースケール背景（Grayscale）
- 🔄 メッシュ背景（Mesh/Checkerboard）
- 🔄 クロスハッチ背景（Crosshatch）
- 🔄 ドット前景（Dot - pixel defect）
- 🔄 ライン前景（Line）
- 🔄 画像背景（Background Image）
- 🔄 画像前景（Foreground Image）

#### Phase 2: 高度な機能（優先度: 中）
- 🔄 透明度（alpha/opacity）
- 🔄 回転（rotate）
- 🔄 ぼかし（blur）
- 🔄 アニメーション（blink, window movement）
- 🔄 複数前景レイヤーの合成

#### Phase 3: ファイル読み込み（優先度: 高）
- 🔄 `--file` オプションでJSONファイル読み込み
- 🔄 YAMLファイル対応
- 🔄 画像ファイルの参照と読み込み
- 🔄 相対パス/絶対パスの解決

#### Phase 4: 互換性（優先度: 低）
- 🔄 旧API形式のサポート（`/show?bg=...&fg=...`）
- 🔄 旧JSON形式の自動変換
- 🔄 移行ツールの提供

### 次のステップ

1. **スキーマ設計**: 新しいJSONスキーマを定義（Canvas API準拠）
2. **レイヤー実装**: BackgroundとForegroundのレンダラーを実装
3. **ファイルローダー**: JSON/YAMLファイルを読み込む機能
4. **画像管理**: 画像リソースの配置と読み込み
5. **サンプル作成**: 移植元の主要パターンをサンプルファイルとして作成

---

## 📋 設計完了・実装開始

### 設計ステータス: ✅ 完了（98点/100点）

**2025年11月時点で、XSGの完全な設計が完了しました。**

- ✅ パターンスキーマ（p5.js + JSON Canvas + WAAPI準拠）
- ✅ プリセット=プラグインアーキテクチャ
- ✅ パス解決（相対・絶対・プロジェクト相対・URL）
- ✅ プレイリスト・スクリーンセーバー機能
- ✅ Webレンダリングモード + プロキシ対応
- ✅ クロスプラットフォーム対応（Windows/Linux/macOS）
- ✅ 完全性（移植元37項目を100%カバー）
- ✅ 直交性（非直交性8件→1件、98点）

### 詳細ドキュメント

**設計の詳細は [design-summary.md](./.claude/docs/design-summary.md) を参照してください。**

作成された設計ドキュメント（15ファイル）:
- コアスキーマ: `schema-complete.yaml`, `schema-final.yaml`, `schema.d.ts`, [migration-mapping.md](./.claude/docs/migration-mapping.md)
- 完全性・直交性: [orthogonality-check.md](./.claude/docs/orthogonality-check.md), [orthogonality-improvements.md](./.claude/docs/orthogonality-improvements.md)
- 拡張性: [extensibility-design.md](./.claude/docs/extensibility-design.md), [preset-system.md](./.claude/docs/preset-system.md), [path-resolution.md](./.claude/docs/path-resolution.md)
- 新機能: [screensaver-playlist.md](./.claude/docs/screensaver-playlist.md), [web-rendering.md](./.claude/docs/web-rendering.md), [cross-platform-screensaver.md](./.claude/docs/cross-platform-screensaver.md), [playlist-design.md](./.claude/docs/playlist-design.md)
- サマリー: [design-summary.md](./.claude/docs/design-summary.md)

### 実装ロードマップ

#### v1.0（コア機能）
- [x] JSON Schemaファイルの作成（`xsg-pattern.schema.json`）
- [x] TypeScript型定義の更新（`frontend/src/lib/types.ts`）
- [x] Python型定義の作成（`backend/app/models.py` - Pydantic v2）
- [x] パス解決の実装（`frontend/src/lib/pathResolver.ts`, `backend/app/path_resolver.py`）
- [x] パターンローダーの実装（`backend/app/pattern_loader.py`）
- [x] サンプルパターンファイルの作成（`patterns/` 配下に6ファイル）
- [x] プリセット=プラグインの実装
  - プリセット型定義（`frontend/src/lib/presetTypes.ts`）
  - プリセットレジストリ（`frontend/src/lib/presetRegistry.ts`）
  - 標準プリセット4個（`presets/colorbar.tsx`, `checker.tsx`, `grayscale.tsx`, `solid.tsx`）
  - PresetRenderer コンポーネント
  - PatternRenderer コンポーネント
  - NodeRenderer コンポーネント
  - ドキュメント（`presets/README.md`）
- [x] マイグレーションツールの実装
  - マイグレーションロジック（`backend/app/migration.py`）
  - CLIツール（`backend/migrate.py`）
  - テストスイート（`backend/test_migration.py`）- 全37項目の変換ルール実装完了

#### v1.1（拡張機能）
- [x] プレイリスト機能
  - プレイリストJSON Schema（`playlist.schema.json`）
  - Pydanticモデル（`backend/app/playlist_models.py`）
  - プレイリストランナー（`backend/app/playlist_runner.py`）
  - パターンジェネレーター（`backend/app/pattern_generator.py`）
  - サンプルプレイリスト4個（`playlists/`）
  - ドキュメント（`playlists/README.md`）
- [x] URL画像対応（プレイリストで実装済み）
- [x] Webレンダリングモード（プレイリストで実装済み）
- [x] プロキシ対応
  - プロキシ設定管理（`backend/app/proxy_support.py`）
  - 環境変数サポート（HTTP_PROXY, HTTPS_PROXY, NO_PROXY）
  - pattern_loaderに統合

#### v1.2（スクリーンセーバー）
- [x] スクリーンセーバー基盤
  - コマンドライン引数パース（`backend/app/screensaver.py`）
  - Windows/Linux/macOS対応
  - プレビューモード・設定画面
  - インストールガイド（[screensaver-install.md](./.claude/docs/screensaver-install.md)）
- [x] Windows .scr ビルドスクリプト（作成済み、.scr生成確認必要）
- [x] Linux パッケージング（作成済み）
- [x] macOS .appバンドル（作成済み）

### 🚧 既知の未実装項目（実装漏れメモ）

#### Critical（本番利用を妨げる）

1. **プリセットマイグレーション未完了** ⚠️
   - **状況**: 16+のパターンコンポーネントが `frontend/src/components/patterns/` に残存
   - **設計**: `/presets/` に統一すべきだが旧場所と二重管理
   - **影響**: 設計思想に反する、混乱を招く
   - **工数**: 1-2日
   - **対象ファイル**:
     - ARIBColorBar.tsx, ColorBar.tsx, EBUColorBar.tsx
     - Convergence.tsx, CrossHatch.tsx, CrossHatch2px.tsx
     - GrayScale.tsx, HorizontalGradient.tsx, VerticalGradient.tsx
     - Multiburst.tsx, PixelDefect.tsx, Pluge.tsx, Staircase.tsx
     - 他すべてを `/presets/` へ移動

2. **Webレンダリングモード未実装** ❌
   - **状況**: [web-rendering.md](./.claude/docs/web-rendering.md) で詳細設計されているが実装なし
   - **未実装機能**:
     - `--url` コマンドライン引数
     - readonly mode（JavaScript注入によるインタラクション無効化）
     - URL rendering機能本体
   - **影響**: XSGをWebキオスクやダッシュボード表示として使えない
   - **工数**: 3-5日
   - **実装場所**: `backend/app/main.py` に `run_url_mode()` 追加

3. **スクリーンセーバーパッケージング確認不足** ⚠️
   - **状況**: ビルドスクリプトは存在するが、実際の `.scr` ファイル生成未確認
   - **確認事項**:
     - `backend/build_windows.bat` で `.scr` ファイルが生成されるか
     - Windows環境でスクリーンセーバーとして登録・動作するか
     - インストーラーの必要性
   - **影響**: Windowsスクリーンセーバーとして配布できない可能性
   - **工数**: 1日（テスト＋修正）

#### Important（機能完成度）

4. **アニメーション実装不明確** ⚠️
   - **状況**: WAAPI形式の `animation` がスキーマ定義されているがレンダリング実装未確認
   - **確認場所**: `frontend/src/components/NodeRenderer.tsx`
   - **影響**: アニメーションパターンが動作しない可能性
   - **工数**: 2-3日

5. **画像タイル表示未実装** ❌
   - **状況**: 画像を繰り返しパターンとして表示する機能が未実装
   - **使用例**: 背景に画像を敷き詰める
   - **影響**: 画像ベースのテストパターンが作れない
   - **工数**: 1日

6. **マイグレーションCLIツール公開不足** ⚠️
   - **状況**: `backend/app/migration.py` は存在するがCLIとして使いにくい
   - **改善**: `backend/migrate.py` をドキュメント化、使用例追加
   - **工数**: 半日

#### Nice-to-Have（将来実装）

7. **プラグインシステム** ❌（v1.1+で予定）
   - 設計済みだが実装なし
   - 工数: 1-2週間

8. **レイヤーグループ** ❌（オプション機能）
   - 複雑なレイヤー管理用
   - 工数: 3-5日

9. **テストスイート** ❌
   - ユニットテストが未整備
   - PathResolver, PlaylistRunner, PatternGenerator等
   - 工数: 1-2週間

### 実装優先度の推奨

**v1.0リリース前に対応すべき:**
1. プリセットマイグレーション（設計一貫性）
2. .scrビルド確認（配布可能性）

**v1.1で対応:**
3. Webレンダリングモード（新用途開拓）
4. アニメーション実装
5. 画像タイル表示

**v1.2以降:**
6. プラグインシステム
7. テストスイート

### 新しい用途

XSGは信号発生器の枠を超え、以下の用途に対応します：

1. 🎯 **テストパターン発生器**（本来の用途）
2. 💻 **スクリーンセーバー**（ランダムパターン・URL画像）
3. 📺 **デジタルサイネージ**（Webページ・画像・パターンの混在表示）
4. 🌐 **Webキオスク端末**（プロキシ対応・操作不可モード）
5. 🖼️ **キャラクター/ロゴ展示**（URL画像のタイル表示）

---

**これより実装フェーズに入ります。** 🚀
