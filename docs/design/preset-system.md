# プリセット＝プラグイン アーキテクチャ

## 🎯 設計哲学

**「組み込みプリセットはない。全てがプラグインである。」**

これはVSCode、Neovim、Emacsなどの設計哲学と同じです：

- VSCode: 組み込み機能もextensionとして実装
- Neovim: 組み込み機能もプラグインとして実装
- Emacs: 組み込み機能もパッケージとして実装

XSGでも同じアプローチを取ります。

---

## 📁 プロジェクト構造

```
xsg/
├── presets/                    ← 全てのプリセットが平等
│   ├── checker.tsx             ✅ 「標準」プリセット（リポジトリに含まれる）
│   ├── colorbar.tsx            ✅ 「標準」プリセット
│   ├── grayscale.tsx           ✅ 「標準」プリセット
│   ├── pixeldefect.tsx         ✅ 「標準」プリセット
│   ├── my-custom.tsx           ✅ ユーザーのカスタムプリセット
│   └── company-logo.tsx        ✅ ユーザーのカスタムプリセット
├── patterns/
│   └── test.yaml
├── frontend/
└── backend/
```

**重要:**

- ❌ 「組み込み」と「カスタム」の区別はない
- ✅ 全てのプリセットは `presets/` に配置される
- ✅ リポジトリに含まれているか否かの違いだけ
- ✅ 実装は全て同じ規約に従う

---

## 🔧 プリセットの規約

### 基本形式

```typescript
// presets/checker.tsx
import { useEffect, useRef } from 'react';
import type { PresetProps } from '@/lib/presets';

export default function Checker({ params }: PresetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = params.size || 50;
    const color1 = params.color1 || '#000000';
    const color2 = params.color2 || '#FFFFFF';

    // 描画ロジック
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.ceil(canvas.width / size);
    const rows = Math.ceil(canvas.height / size);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
        ctx.fillRect(col * size, row * size, size, size);
      }
    }
  }, [params]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

// メタデータ（オプション）
export const metadata = {
  name: "Checker",
  description: "市松模様パターン",
  author: "XSG Team",
  version: "1.0.0",
  params: {
    size: { type: "number", default: 50, min: 1, max: 500 },
    color1: { type: "color", default: "#000000" },
    color2: { type: "color", default: "#FFFFFF" },
  },
};
```

---

## 🔍 プリセットの自動検出

```typescript
// backend/app/presets.py
from pathlib import Path
import json

def discover_presets(presets_dir: Path = None):
    """
    presets/ ディレクトリから全プリセットを自動検出

    「組み込み」と「カスタム」の区別はしない。
    全て同じ仕組みで扱う。
    """
    if presets_dir is None:
        presets_dir = Path(__file__).parent.parent.parent / "presets"

    presets = {}

    if presets_dir.exists():
        for file in presets_dir.glob("*.tsx"):
            preset_name = file.stem  # ファイル名（拡張子なし）

            # メタデータを抽出（オプション）
            metadata = extract_metadata(file)

            presets[preset_name] = {
                "name": preset_name,
                "path": str(file),
                "metadata": metadata,
            }

    return presets

def extract_metadata(file: Path):
    """
    .tsxファイルから export const metadata を抽出
    """
    # 簡易実装: 正規表現でJSONを抽出
    content = file.read_text()
    # TODO: より堅牢なパース実装
    return {}

# FastAPI endpoint
@app.get("/api/presets")
async def list_presets():
    """全プリセット一覧を返す（「組み込み」の区別なし）"""
    presets = discover_presets()
    return {
        "presets": list(presets.values())
    }
```

---

## 📦 標準プリセットの配布

### リポジトリに含まれる「標準」プリセット

これらはあくまで**リポジトリに同梱されているプリセット**であり、特別扱いはしない：

```
presets/
├── checker.tsx         # 市松模様
├── colorbar.tsx        # SMPTEカラーバー
├── ebu-colorbar.tsx    # EBUカラーバー
├── arib-colorbar.tsx   # ARIBカラーバー
├── grayscale.tsx       # グレースケール
├── gradient.tsx        # グラデーション
├── crosshatch.tsx      # クロスハッチ
├── pixeldefect.tsx     # 画素欠け
├── multiburst.tsx      # マルチバースト
├── convergence.tsx     # コンバージェンス
└── pluge.tsx           # PLUGE
```

**ユーザーは自由に:**

- ✅ 削除できる（不要なプリセットを削除）
- ✅ 編集できる（標準プリセットを改造）
- ✅ 追加できる（独自プリセットを追加）

---

## 🎨 使用例

### パターンファイル

```yaml
# patterns/test.yaml
canvas:
  width: 1920
  height: 1080

nodes:
  # 「標準」プリセット（リポジトリに含まれる）
  - type: background
    preset: checker # presets/checker.tsx
    params:
      size: 50
      color1: "#000000"
      color2: "#FFFFFF"

  # ユーザーのカスタムプリセット
  - type: preset
    preset: company-logo # presets/company-logo.tsx
    params:
      scale: 1.5

  # 別のカスタムプリセット
  - type: preset
    preset: my-custom # presets/my-custom.tsx
```

**重要: 実装側は区別しない**

- `checker` も `company-logo` も同じ仕組みでロード
- APIも同じ（`/api/presets` で全て返す）

---

## 🔄 移行元コンポーネントの扱い

現在、XSGには以下のコンポーネントが存在します：

```
frontend/src/components/patterns/
├── Checker.tsx
├── ColorBar.tsx
├── CrossHatch.tsx
├── GrayScale.tsx
└── ...
```

### 移行方針

**これらを `presets/` に移動する：**

```bash
# 移動
mv frontend/src/components/patterns/*.tsx presets/

# 結果
presets/
├── Checker.tsx      # 元: frontend/src/components/patterns/Checker.tsx
├── ColorBar.tsx
├── CrossHatch.tsx
├── GrayScale.tsx
└── ...
```

**変更点:**

1. ファイルの配置場所が変わるだけ
2. 実装は基本的に変更不要（Props型を統一）
3. `preset` として使えるようになる

---

## 🚀 プリセットの動的ロード

```typescript
// frontend/src/lib/presets.ts
const PRESETS_CACHE = new Map<string, React.ComponentType>();

export async function loadPreset(name: string) {
  // キャッシュチェック
  if (PRESETS_CACHE.has(name)) {
    return PRESETS_CACHE.get(name);
  }

  try {
    // presets/ から動的にインポート
    const module = await import(`../../../presets/${name}.tsx`);
    const PresetComponent = module.default;

    // キャッシュに保存
    PRESETS_CACHE.set(name, PresetComponent);

    return PresetComponent;
  } catch (err) {
    throw new Error(
      `Preset not found: ${name}\n` +
      `Make sure presets/${name}.tsx exists.`
    );
  }
}

// 使用例
const PresetComponent = await loadPreset('checker');
return <PresetComponent params={node.params} />;
```

---

## 📋 プリセット開発ガイド

### 新しいプリセットを作る

1. `presets/` に `.tsx` ファイルを作成

```typescript
// presets/my-pattern.tsx
import { useEffect, useRef } from 'react';
import type { PresetProps } from '@/lib/presets';

export default function MyPattern({ params }: PresetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // 描画ロジック
  }, [params]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

export const metadata = {
  name: "My Pattern",
  description: "独自のテストパターン",
  params: {
    color: { type: "color", default: "#FF0000" },
  },
};
```

2. YAMLで使用

```yaml
- preset: my-pattern
  params:
    color: "#00FF00"
```

3. 完了！（リスタート不要、Hot Reload対応）

---

## 🔍 プリセット一覧の取得

### API

```bash
GET /api/presets
```

**レスポンス:**

```json
{
  "presets": [
    {
      "name": "checker",
      "path": "/path/to/xsg/presets/checker.tsx",
      "metadata": {
        "name": "Checker",
        "description": "市松模様パターン",
        "author": "XSG Team",
        "version": "1.0.0",
        "params": {
          "size": { "type": "number", "default": 50 }
        }
      }
    },
    {
      "name": "company-logo",
      "path": "/path/to/xsg/presets/company-logo.tsx",
      "metadata": {
        "name": "Company Logo",
        "description": "会社ロゴ"
      }
    }
  ]
}
```

**重要: 「標準」と「カスタム」の区別はない**

---

## 🎯 メリット

### 1. シンプル

- ❌ 「組み込み」「カスタム」の区別なし
- ✅ 全て同じ仕組み

### 2. 拡張性

- ✅ ユーザーは自由にプリセットを追加
- ✅ 標準プリセットも編集・削除可能

### 3. 一貫性

- ✅ 全てのプリセットが同じ規約に従う
- ✅ ドキュメントがシンプル

### 4. 透明性

- ✅ 標準プリセットのソースが見える
- ✅ カスタマイズしやすい

---

## 📂 Git管理

### .gitignore

```gitignore
# ユーザーのカスタムプリセットを無視（オプション）
# presets/*
# !presets/checker.tsx
# !presets/colorbar.tsx
# ... 標準プリセットのみコミット
```

**または:**

```gitignore
# 全てのプリセットをコミット（推奨）
# ユーザーがカスタムプリセットを追加してもOK
```

---

## 🔄 既存コードの移行

### Phase 1: 既存コンポーネントを移動

```bash
# 既存のパターンコンポーネントを presets/ に移動
mv frontend/src/components/patterns/*.tsx presets/
```

### Phase 2: PatternDisplay.tsx を簡素化

```typescript
// frontend/src/components/PatternDisplay.tsx
import { loadPreset } from '@/lib/presets';

export default function PatternDisplay({ pattern }: Props) {
  const [PresetComponent, setPresetComponent] = useState(null);

  useEffect(() => {
    loadPreset(pattern).then(setPresetComponent);
  }, [pattern]);

  if (!PresetComponent) return <div>Loading...</div>;

  return <PresetComponent params={{}} />;
}
```

### Phase 3: 完全にYAMLベースへ

```yaml
# patterns/colorbar.yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - type: background
    preset: colorbar # presets/ColorBar.tsx → presets/colorbar.tsx
```

```bash
# 起動
uv run python -m app.main --file patterns/colorbar.yaml
```

---

## ✅ まとめ

**「組み込みプリセットはない。全てがプラグインである。」**

| 項目             | 設計                                  |
| ---------------- | ------------------------------------- |
| プリセットの配置 | `presets/` ディレクトリ               |
| 標準 vs カスタム | **区別しない**                        |
| 実装の規約       | React Component、default export       |
| 自動検出         | ファイル名 = プリセット名             |
| Hot Reload       | ✅ 対応                               |
| メタデータ       | `export const metadata`（オプション） |

**利点:**

1. ✅ シンプル（区別がない）
2. ✅ 拡張性（自由に追加・編集・削除）
3. ✅ 透明性（全てのソースが見える）
4. ✅ 一貫性（全て同じ仕組み）

これが真のプラグインアーキテクチャです。
