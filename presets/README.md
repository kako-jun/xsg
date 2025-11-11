# XSG Presets

プリセットはXSGパターンシステムのプラグインです。

## 設計哲学

> **「組み込みプリセットはない。全てがプラグインである。」**

このディレクトリに含まれる「標準」プリセットも、ユーザーが作成するカスタムプリセットも、完全に同等です。

## プリセットの作り方

### 1. 基本構造

プリセットはReact + TypeScriptコンポーネントです。

```tsx
// presets/my-preset.tsx
import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

// メタデータ（オプションだが推奨）
export const metadata: PresetMetadata = {
  name: 'My Preset',
  description: 'Description of my preset',
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
export default function MyPreset({ params = {} }: PresetProps) {
  const myParam = params.myParam || 100;

  return (
    <div className="w-full h-full" style={{ backgroundColor: '#000' }}>
      {/* Your pattern here */}
    </div>
  );
}
```

### 2. 規約（Convention over Configuration）

- **ファイル名 = プリセット名**: `colorbar.tsx` → プリセット名は `colorbar`
- **default export**: Reactコンポーネント
- **named export `metadata`**: プリセットのメタデータ（オプション）
- **配置場所**: `/presets/` ディレクトリ（プロジェクトルート）

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

### 4. YAMLでの使用

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  # Background preset
  - id: bg
    type: background
    preset: my-preset  # ファイル名（拡張子なし）
    params:
      myParam: 200

  # Foreground preset
  - id: fg
    type: preset
    preset: my-preset
    params:
      myParam: 100
```

## 標準プリセット

以下のプリセットがリポジトリに含まれています：

### colorbar.tsx
- **名前**: SMPTE Color Bars
- **用途**: カラーキャリブレーション
- **パラメータ**:
  - `intensity`: `'75'` | `'100'` (デフォルト: `'75'`)

### checker.tsx
- **名前**: Checkerboard
- **用途**: ピクセルアラインメントテスト
- **パラメータ**:
  - `size`: 正方形のサイズ（px、デフォルト: `50`）
  - `color1`: 最初の色（デフォルト: `'#000000'`）
  - `color2`: 2番目の色（デフォルト: `'#FFFFFF'`）

### grayscale.tsx
- **名前**: Grayscale Gradient
- **用途**: ガンマ・明度キャリブレーション
- **パラメータ**:
  - `steps`: グレーのステップ数（デフォルト: `16`）
  - `direction`: `'horizontal'` | `'vertical'` (デフォルト: `'horizontal'`)
  - `reverse`: 反転（デフォルト: `false`）

### solid.tsx
- **名前**: Solid Color
- **用途**: 単色塗りつぶし
- **パラメータ**:
  - `color`: 塗りつぶし色（デフォルト: `'#000000'`）

## カスタムプリセットの例

### 例1: グラデーション

```tsx
// presets/gradient.tsx
import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

export const metadata: PresetMetadata = {
  name: 'Linear Gradient',
  category: 'custom',
  params: {
    color1: { type: 'color', default: '#FF0000' },
    color2: { type: 'color', default: '#0000FF' },
    angle: { type: 'number', default: 0, min: 0, max: 360 },
  },
};

export default function Gradient({ params = {} }: PresetProps) {
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

### 例2: Canvas描画

```tsx
// presets/circle-grid.tsx
import { useEffect, useRef } from 'react';
import type { PresetProps, PresetMetadata } from '../frontend/src/lib/presetTypes';

export const metadata: PresetMetadata = {
  name: 'Circle Grid',
  category: 'custom',
  params: {
    spacing: { type: 'number', default: 100, min: 10, max: 500 },
    radius: { type: 'number', default: 30, min: 1, max: 200 },
    color: { type: 'color', default: '#FFFFFF' },
  },
};

export default function CircleGrid({ params = {} }: PresetProps) {
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

## Hot Reload

開発時、プリセットの変更は自動的に反映されます（Vite HMR）。

## プリセットのインポート方法

### 自動インポート（推奨）

XSGは起動時に `/presets/` ディレクトリをスキャンし、すべてのプリセットを自動登録します。

### 手動インポート

特定のプリセットのみをロードすることも可能です：

```typescript
import { loadPreset } from '@/lib/presetRegistry';

const module = await loadPreset('my-preset');
```

## デバッグ

プリセットが正しく登録されているか確認：

```typescript
import { getPresetRegistry } from '@/lib/presetRegistry';

const registry = getPresetRegistry();
console.log('All presets:', registry.getAll());
console.log('Metadata:', registry.getMetadata('colorbar'));
```

## ベストプラクティス

1. **レスポンシブ対応**: `w-full h-full` でコンテナいっぱいに表示
2. **パラメータのデフォルト値**: 必ず設定する
3. **メタデータの記述**: 検索・分類しやすくする
4. **パフォーマンス**: リサイズイベントの適切な処理
5. **型安全性**: `PresetProps` を使う

## トラブルシューティング

### プリセットが見つからない

1. ファイル名が正しいか確認（小文字推奨）
2. `/presets/` ディレクトリに配置されているか
3. default export があるか

### パラメータが反映されない

1. `params` オブジェクトから値を取得しているか
2. デフォルト値を設定しているか
3. YAMLのパラメータ名が一致しているか

### Hot Reloadが効かない

Viteを再起動してください：

```bash
cd frontend
npm run dev
```

## 参考リンク

- [DESIGN_SUMMARY.md](../DESIGN_SUMMARY.md) - 設計全体のサマリー
- [PRESET_AS_PLUGIN.md](../PRESET_AS_PLUGIN.md) - プリセット設計の詳細
