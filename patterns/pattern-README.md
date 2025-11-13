# XSG Patterns

パターンはXSGパターンシステムのプラグインです。

## 設計哲学

> **「組み込みパターンはない。全てがプラグインである。」**

このディレクトリに含まれる「標準」パターンも、ユーザーが作成するカスタムパターンも、完全に同等です。

## パターンの作り方

### 1. 基本構造

パターンはReact + TypeScriptコンポーネントまたはYAMLファイルです。

#### TSXパターン

```tsx
// patterns/my-pattern.tsx
import type { PatternProps, PatternMetadata } from '../frontend/src/lib/patternTypes';

// メタデータ（オプションだが推奨）
export const metadata: PatternMetadata = {
  name: 'My Pattern',
  description: 'Description of my pattern',
  category: 'custom',
  tags: ['tag1', 'tag2'],
  params: {
    myParam: {
      type: 'number',
      default: 100,
      min: 0,
      max: 500,
      description: 'Parameter description',
    },
  },
};

// メインコンポーネント（必須）
export default function MyPattern({ params = {} }: PatternProps) {
  const myParam = params.myParam || 100;

  return (
    <div className="w-full h-full" style={{ backgroundColor: '#000' }}>
      {/* Your pattern here */}
    </div>
  );
}
```

#### YAMLパターン（推奨）

```yaml
# patterns/my-pattern.yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - id: my-rect
    type: rect
    x: 0
    y: 0
    width: 100
    height: 100
    fill: "#FF0000"
```

### 2. 規約（Convention over Configuration）

- **ファイル名 = パターン名**: `colorbar.yaml` または `colorbar.tsx` → パターン名は `colorbar`
- **TSX形式**: default exportにReactコンポーネント、named exportに`metadata`（オプション）
- **YAML形式**: YAMLスキーマに従った宣言的記述
- **配置場所**: `/patterns/` ディレクトリ（プロジェクトルート）

### 3. パラメータ型

利用可能なパラメータ型：

```typescript
params: {
  // 文字列
  text: {
    type: 'string',
    default: 'Hello',
  },

  // 数値
  size: {
    type: 'number',
    default: 50,
    min: 1,
    max: 500,
  },

  // 真偽値
  enabled: {
    type: 'boolean',
    default: true,
  },

  // 色
  color: {
    type: 'color',
    default: '#FF0000',
  },

  // 選択肢
  mode: {
    type: 'select',
    default: 'horizontal',
    options: ['horizontal', 'vertical'],
  },
}
```

### 4. 繰り返し描画（Repeat）

ノードに `repeat` プロパティを追加すると、パターンを繰り返し描画できます：

```yaml
nodes:
  # グリッド配置
  - id: grid-dots
    type: circle
    x: 0
    y: 0
    diameter: 5
    fill: "#FF0000"
    repeat:
      mode: grid
      countX: 20
      countY: 15
      spacingX: 100
      spacingY: 72

  # 画像タイル表示
  - id: bg-texture
    type: image
    src: "./texture.png"
    repeat: repeat  # CSS/Canvas API style
```

**Repeat Modes:**
- `repeat`, `repeat-x`, `repeat-y`, `no-repeat` (画像向け、CSS/Canvas API準拠)
- `{ mode: "grid", countX, countY, spacingX, spacingY }` (固定個数グリッド配置)
- `{ mode: "tile", tileWidth, tileHeight }` (タイル敷き詰め)

### 5. TSXパターンでの使用

YAMLから TSXパターンを参照できます：

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  # Background pattern
  - id: bg
    type: background
    pattern: my-pattern  # ファイル名（拡張子なし）
    params:
      myParam: 200

  # Foreground pattern
  - id: fg
    type: pattern
    pattern: my-pattern
    params:
      myParam: 100
```

## 標準パターン

以下のパターンがリポジトリに含まれています：

### YAMLパターン（15個）

全て `/patterns/` ディレクトリに配置されています：

- `colorbar.yaml` - SMPTE Color Bars (75%)
- `arib-colorbar.yaml` - ARIB Color Bars (100%)
- `ebu-colorbar.yaml` - EBU Color Bars
- `checker.yaml` - Checkerboard（repeatグリッド使用）
- `grayscale.yaml` - Grayscale Gradient (16 steps)
- `horizontal-gradient.yaml` - Horizontal Gradient
- `vertical-gradient.yaml` - Vertical Gradient
- `solid.yaml` - Solid Color
- `crosshatch.yaml` - Crosshatch Grid（repeatグリッド使用）
- `crosshatch-2px.yaml` - Crosshatch 2px variant
- `convergence.yaml` - Convergence Grid（repeatグリッド使用）
- `multiburst.yaml` - Multiburst Pattern（repeatグリッド使用）
- `pixel-defect.yaml` - Pixel Defect Simulation
- `pluge.yaml` - PLUGE Pattern
- `staircase.yaml` - 21-step Grayscale Staircase

## カスタムパターンの例

### 例1: YAMLパターン（推奨）

```yaml
# patterns/custom-gradient.yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - id: bg
    type: rect
    x: 0
    y: 0
    width: 1920
    height: 1080
    fill: "#000000"

  - id: bars
    type: rect
    x: 0
    y: 0
    width: 137
    height: 1080
    fill: "#FF0000"
    repeat:
      mode: grid
      countX: 7
      spacingX: 274
```

### 例2: TSXパターン

```tsx
// patterns/gradient.tsx
import type { PatternProps, PatternMetadata } from '../frontend/src/lib/patternTypes';

export const metadata: PatternMetadata = {
  name: 'Linear Gradient',
  category: 'custom',
  params: {
    color1: { type: 'color', default: '#FF0000' },
    color2: { type: 'color', default: '#0000FF' },
    angle: { type: 'number', default: 0, min: 0, max: 360 },
  },
};

export default function Gradient({ params = {} }: PatternProps) {
  const { color1 = '#FF0000', color2 = '#0000FF', angle = 0 } = params;

  return (
    <div
      className="w-full h-full"
      style={{
        background: `linear-gradient(${angle}deg, ${color1}, ${color2})`,
      }}
    />
  );
}
```

### 例3: repeatを使わないTSXパターン

```tsx
// patterns/circle-grid.tsx
import { useEffect, useRef } from 'react';
import type { PatternProps, PatternMetadata } from '../frontend/src/lib/patternTypes';

export const metadata: PatternMetadata = {
  name: 'Circle Grid',
  category: 'custom',
  params: {
    spacing: { type: 'number', default: 100, min: 10, max: 500 },
    radius: { type: 'number', default: 30, min: 1, max: 200 },
    color: { type: 'color', default: '#FFFFFF' },
  },
};

export default function CircleGrid({ params = {} }: PatternProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { spacing = 100, radius = 30, color = '#FFFFFF' } = params;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = color;
      for (let x = spacing / 2; x < canvas.width; x += spacing) {
        for (let y = spacing / 2; y < canvas.height; y += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [spacing, radius, color]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}
```

**注意**: 上記の例3はYAMLのrepeat機能で実現可能です：

```yaml
nodes:
  - id: circles
    type: circle
    x: 50
    y: 50
    diameter: 60
    fill: "#FFFFFF"
    repeat:
      mode: grid
      countX: 19
      countY: 11
      spacingX: 100
      spacingY: 100
```

## Hot Reload

開発時、パターンの変更は自動的に反映されます（Vite HMR）。

## パターンのインポート方法

### 自動インポート（推奨）

XSGは起動時に `/patterns/` ディレクトリをスキャンし、すべてのパターンを自動登録します。

### 手動インポート

特定のパターンのみをロードすることも可能です：

```typescript
import { loadPattern } from '@/lib/patternRegistry';

const module = await loadPattern('my-pattern');
```

## デバッグ

パターンが正しく登録されているか確認：

```typescript
import { getPatternRegistry } from '@/lib/patternRegistry';

const registry = getPatternRegistry();
console.log('All patterns:', registry.getAll());
console.log('Metadata:', registry.getMetadata('colorbar'));
```

## ベストプラクティス

1. **YAMLを優先**: 可能な限りYAMLで実装する（宣言的・シンプル）
2. **repeatを活用**: グリッドやタイル表示は `repeat` プロパティを使う
3. **レスポンシブ対応**: TSXの場合は `w-full h-full` でコンテナいっぱいに表示
4. **パラメータのデフォルト値**: TSXの場合は必ず設定する
5. **メタデータの記述**: TSXの場合は検索・分類しやすくする
6. **パフォーマンス**: TSXでCanvas描画する場合はリサイズイベントの適切な処理
7. **型安全性**: TSXの場合は `PatternProps` を使う

## トラブルシューティング

### パターンが見つからない

1. ファイル名が正しいか確認（小文字推奨）
2. `/patterns/` ディレクトリに配置されているか
3. TSXの場合は default export があるか
4. YAMLの場合は構文が正しいか

### パラメータが反映されない

1. TSXの場合: `params` オブジェクトから値を取得しているか
2. デフォルト値を設定しているか
3. YAMLのパラメータ名が一致しているか

### repeatが動作しない

1. `repeat` プロパティの構文が正しいか確認
2. `mode: "grid"` の場合は `spacingX`, `spacingY` を指定
3. `mode: "tile"` の場合は `tileWidth`, `tileHeight` を指定
4. 画像の場合は `repeat: "repeat"` などのシンプルな形式も使用可能

### Hot Reloadが効かない

Viteを再起動してください：

```bash
cd frontend
npm run dev
```

## 参考リンク

- [CLAUDE.md](../CLAUDE.md) - 開発ガイド全体
- [schema-final.yaml](../schema-final.yaml) - スキーマ定義と例
- [xsg-pattern.schema.json](../xsg-pattern.schema.json) - JSON Schema定義
