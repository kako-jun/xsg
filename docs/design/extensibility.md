# XSG 拡張性設計 - レイヤー・プリセット・プラグイン

このドキュメントは、XSGの将来的な拡張戦略を定義します。

---

## 🎯 設計哲学

1. **Start Simple, Scale Later** - シンプルに始めて、必要に応じて拡張
2. **Convention over Configuration** - 設定より規約を優先
3. **Progressive Enhancement** - 段階的な機能強化

---

## 📊 調査結果

| システム      | レイヤー数 | プリセット     | プラグイン    |
| ------------- | ---------- | -------------- | ------------- |
| Photoshop     | 8,000まで  | カスタム可     | 規約ベース    |
| Figma         | 無制限     | コンポーネント | プラグインAPI |
| After Effects | 無制限     | プリセット     | Expression    |
| 移植元        | 2層固定    | 不可           | なし          |

---

## 🔢 質問1: レイヤー数 - 2層 vs 無制限

### 提案: **無制限（ただし段階的実装）**

#### Phase 1（v1.0）: 実質的に無制限

```yaml
nodes:
  - id: bg1
    type: background
    # ...

  - id: layer1
    type: rect
    # ...

  - id: layer2
    type: circle
    # ...

  - id: layer3
    type: image
    # ...

  # レイヤー数の制限なし（配列なので自然）
```

**理由:**

- ✅ **JSON Canvas準拠**: `nodes`配列なので自然に無制限
- ✅ **柔軟性**: 将来の複雑なパターンに対応
- ✅ **実装コスト**: 制限を設ける方が複雑（バリデーション必要）
- ✅ **パフォーマンス**: Photoshopの8,000制限は参考になる
  - XSGでは現実的に10-50レイヤー程度
  - パフォーマンス問題は起きにくい

#### Phase 2（v1.1+）: Layer Group（必要なら）

```yaml
nodes:
  # グループ化（Photoshop/Figma風）
  - id: group1
    type: group
    children:
      - type: rect
        # ...
      - type: circle
        # ...

  - id: bg1
    type: background
```

**実装優先度: 低**（まず必要ない）

---

### ❌ 2層固定にしない理由

**問題点:**

1. ❌ 将来の拡張が困難（破壊的変更が必要）
2. ❌ ユーザーの創造性を制限
3. ❌ 実装が複雑（backgroundとforegroundを分離）

**移植元の2層は技術的制約**であり、新設計では踏襲不要

---

## 🎨 質問2: プリセットのカスタマイズ

### 提案: **Convention over Configuration（規約ベース）**

#### Phase 1（v1.0）: 組み込みプリセット

```yaml
# 標準プリセット（XSGに同梱）
- type: background
  preset: checker      # ✅ 組み込み
  preset: colorbar     # ✅ 組み込み
  preset: grayscale    # ✅ 組み込み
```

#### Phase 2（v1.1）: カスタムプリセット（ディレクトリベース）

```bash
# プロジェクト構造
xsg/
├── presets/                # ← ここに置くだけでOK
│   ├── my-custom.tsx       # カスタムプリセット
│   ├── iso12233.tsx        # テストチャート
│   └── company-logo.tsx    # 会社ロゴ
├── patterns/
│   └── test.yaml           # パターンファイル
```

```yaml
# test.yaml でカスタムプリセットを使用
- type: background
  preset: my-custom # ✅ presets/my-custom.tsx を自動検出
  params:
    color: "#FF0000"
```

**実装:**

```typescript
// presets/my-custom.tsx（規約）
import { PresetProps } from '@/lib/presets';

export default function MyCustom({ params }: PresetProps) {
  return (
    <canvas ref={canvasRef} className="w-full h-full" />
  );
}

// メタデータ（オプション）
export const metadata = {
  name: "My Custom Pattern",
  description: "カスタムパターンの説明",
  params: {
    color: { type: "string", default: "#FFFFFF" },
    size: { type: "number", default: 50 },
  },
};
```

**規約:**

1. ✅ `presets/` ディレクトリに `.tsx` ファイルを配置
2. ✅ default export で React Component
3. ✅ ファイル名 = プリセット名（`my-custom.tsx` → `preset: my-custom`）
4. ✅ Hot Reload 対応（開発時に再起動不要）

---

### Phase 3（v1.2+）: プリセットリポジトリ（必要なら）

```bash
# npm でインストール
npm install @xsg/presets-professional

# 自動的に利用可能
- preset: iso12233        # @xsg/presets-professional から
- preset: zone-plate
- preset: needle-pattern
```

**実装優先度: 中**（コミュニティが育ってから）

---

## 🔌 質問3: プラグインシステム

### 提案: **Convention over Configuration（段階的実装）**

#### Phase 1（v1.0）: プリセット = 簡易プラグイン

**結論: プリセットシステムで十分**

理由:

- ✅ XSGの用途はテストパターン生成（限定的）
- ✅ プリセットでカスタム描画は実現可能
- ✅ 複雑なプラグインAPIは過剰

#### Phase 2（v1.1+）: プラグインフック（必要なら）

```bash
# プロジェクト構造
xsg/
├── plugins/                  # ← プラグインディレクトリ
│   ├── gamma-control.ts      # ガンマ補正プラグイン
│   ├── screenshot.ts         # スクリーンショット機能
│   └── midi-controller.ts    # MIDIコントローラー対応
```

```typescript
// plugins/gamma-control.ts（規約）
import { XSGPlugin } from "@/lib/plugins";

export default {
  name: "gamma-control",
  version: "1.0.0",

  // ライフサイクルフック
  onLoad(app) {
    console.log("Plugin loaded");
  },

  onPatternChange(pattern) {
    // パターン変更時の処理
  },

  // APIエンドポイント追加
  routes: [
    {
      path: "/api/gamma",
      method: "POST",
      handler: async (req, res) => {
        // ガンマ補正処理
      },
    },
  ],

  // UIコンポーネント追加
  components: {
    menu: GammaControlMenu,
  },
} as XSGPlugin;
```

**規約:**

1. ✅ `plugins/` ディレクトリに配置
2. ✅ default export で Plugin オブジェクト
3. ✅ ファイル名 = プラグイン名
4. ✅ Hot Reload 対応

---

### Phase 3（v1.2+）: プラグインマーケット（必要なら）

```bash
# npm でインストール
npm install @xsg/plugin-midi

# 自動的に読み込まれる（Convention）
# plugins/ に自動配置、または package.json で検出
```

**実装優先度: 低**（将来の夢）

---

## 🎯 推奨実装順序

### v1.0（最小限）

```yaml
✅ 無制限レイヤー（nodes配列）
✅ 組み込みプリセット（checker, colorbar, etc.）
❌ カスタムプリセット（まだ実装しない）
❌ プラグイン（まだ実装しない）
```

**理由:**

- 移植元の全機能をカバーできる
- シンプルで分かりやすい
- 実装コストが低い

---

### v1.1（拡張性）

```yaml
✅ カスタムプリセット（presets/ ディレクトリ）
✅ Hot Reload
⚠️ プラグインフック（必要なら）
```

**トリガー:**

- ユーザーから「独自パターンを作りたい」という要望
- プルリクで同じパターンが3回以上来た

---

### v1.2+（エコシステム）

```yaml
✅ プリセットリポジトリ（npm）
✅ プラグインマーケット
✅ Layer Group（必要なら）
```

**トリガー:**

- コミュニティが育った
- 企業利用が増えた

---

## 📋 実装の詳細

### 1. カスタムプリセットの検出

```typescript
// backend/app/presets.py
import os
from pathlib import Path

def discover_presets():
    """presets/ ディレクトリからプリセットを自動検出"""
    presets_dir = Path(__file__).parent.parent / "presets"
    presets = {}

    if presets_dir.exists():
        for file in presets_dir.glob("*.tsx"):
            preset_name = file.stem  # ファイル名（拡張子なし）
            presets[preset_name] = {
                "path": str(file),
                "name": preset_name,
            }

    return presets

# FastAPI endpoint
@app.get("/api/presets")
async def list_presets():
    builtin = ["checker", "colorbar", "grayscale", ...]
    custom = discover_presets()

    return {
        "builtin": builtin,
        "custom": list(custom.keys()),
    }
```

### 2. Hot Reload（開発時）

```typescript
// frontend/vite.config.ts
export default {
  server: {
    watch: {
      // presets/ ディレクトリを監視
      include: ["src/**", "presets/**"],
    },
  },
};
```

### 3. プリセットの動的ロード

```typescript
// frontend/src/lib/presets.ts
export async function loadPreset(name: string) {
  // 1. 組み込みプリセットをチェック
  if (BUILTIN_PRESETS.includes(name)) {
    return import(`@/components/patterns/${name}.tsx`);
  }

  // 2. カスタムプリセットをチェック
  try {
    return import(`../../../presets/${name}.tsx`);
  } catch (err) {
    throw new Error(`Preset not found: ${name}`);
  }
}
```

---

## 🎨 使用例

### v1.0（現在）

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - type: background
    preset: checker # ✅ 組み込みプリセット

  - type: rect
    x: 100
    y: 100
    width: 200
    height: 100
    fill: "#FF0000"

  - type: circle
    x: 500
    y: 500
    diameter: 50
    fill: "#00FF00"

  # レイヤー数無制限（配列なので自然）
```

---

### v1.1（カスタムプリセット）

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  # カスタムプリセット（presets/my-logo.tsx）
  - type: background
    preset: my-logo
    params:
      scale: 1.5

  # 複数レイヤー
  - type: preset
    preset: iso12233 # presets/iso12233.tsx
    params:
      position: center

  - type: rect
    x: 100
    y: 100
    width: 200
    height: 100
    fill: "#FF0000"
```

**ディレクトリ構造:**

```
xsg/
├── presets/
│   ├── my-logo.tsx     # ← ユーザーが作成
│   └── iso12233.tsx    # ← ユーザーが作成
└── patterns/
    └── test.yaml
```

---

### v1.2+（プラグイン）

```yaml
canvas:
  width: 1920
  height: 1080

# プラグインが提供する新機能
plugins:
  - gamma-control:
      enabled: true
      value: 2.2
  - midi-controller:
      enabled: true
      device: "Launch Control XL"

nodes:
  - type: background
    preset: checker

  # プラグインが提供するカスタムノード
  - type: plugin
    plugin: gamma-test-pattern
    params:
      gamma: 2.2
```

---

## ✅ 最終推奨

| 項目                   | v1.0   | v1.1   | v1.2+          |
| ---------------------- | ------ | ------ | -------------- |
| **レイヤー数**         | 無制限 | 無制限 | 無制限 + Group |
| **組み込みプリセット** | ✅     | ✅     | ✅             |
| **カスタムプリセット** | ❌     | ✅     | ✅ + npm       |
| **プラグイン**         | ❌     | ⚠️     | ✅             |

### v1.0で実装すべきこと

1. ✅ **無制限レイヤー** - `nodes`配列で自然に実現
2. ✅ **組み込みプリセット** - 移植元の全パターンをカバー
3. ❌ **カスタムプリセット** - まだ実装しない（ユーザー要望を待つ）
4. ❌ **プラグイン** - まだ実装しない（過剰設計）

### いつ拡張するか

| 機能                 | トリガー                                                       |
| -------------------- | -------------------------------------------------------------- |
| カスタムプリセット   | ユーザーから「独自パターンを作りたい」という要望が3件以上      |
| プラグイン           | 「ガンマ補正」「MIDI対応」など、プリセットでは実現できない要望 |
| プリセットリポジトリ | コミュニティが育ち、共有したいプリセットが増えた               |

---

## 🎯 まとめ

**今すぐやること（v1.0）:**

- ✅ レイヤー数: **無制限**（`nodes`配列で自然）
- ✅ プリセット: **組み込みのみ**（移植元をカバー）
- ✅ プラグイン: **なし**（シンプルに）

**将来やること（v1.1+）:**

- ⏳ カスタムプリセット: **Convention over Configuration**
  - `presets/` に置くだけでOK
  - Hot Reload対応
- ⏳ プラグイン: **必要になったら**
  - まずはプリセットで十分
  - 要望があれば段階的に追加

**メリット:**

1. ✅ シンプルに始められる
2. ✅ 将来の拡張性を確保
3. ✅ 過剰設計を避ける（YAGNI: You Aren't Gonna Need It）
4. ✅ ユーザーの実際の要望に基づいて拡張

これで問題ないでしょうか？
