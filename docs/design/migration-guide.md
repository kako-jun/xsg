# XSG マイグレーションガイド

旧形式（pg）のパターンファイルを、新しいXSG形式に変換する方法を説明します。

## クイックスタート

### 単一ファイルの変換

```bash
cd backend
uv run python migrate.py old_pattern.json new_pattern.yaml
```

### ディレクトリ一括変換

```bash
cd backend
uv run python migrate.py --directory ../legacy_patterns/ --output-dir ../patterns/
```

### ドライラン（実際には変換しない）

```bash
uv run python migrate.py --directory ../legacy_patterns/ --dry-run
```

## 変換内容

### 完全対応項目（37項目すべて）

マイグレーションツールは、旧形式の**全37項目**を新形式に変換します。

詳細な変換マッピングは [migration-mapping.md](./migration-mapping.md) を参照してください。

### Background変換

| 旧形式                    | 新形式                        |
| ------------------------- | ----------------------------- |
| `type: "Solid"`           | `preset: "solid"`             |
| `type: "Crosshatch"`      | `preset: "crosshatch"`        |
| `type: "Mesh"`            | `preset: "checker"`           |
| `type: "Grayscale"`       | `preset: "grayscale"`         |
| `type: "Image"`           | `preset: "image-background"`  |
| `type: "RepeatCropImage"` | `preset: "repeat-crop-image"` |

### Foreground変換

| 旧形式               | 新形式                                       |
| -------------------- | -------------------------------------------- |
| `type: "Dot"`        | `type: "circle"` (diameter: 2)               |
| `type: "Line"`       | `type: "directedLine"` または `type: "line"` |
| `type: "Window"`     | `type: "rect"`                               |
| `type: "Image"`      | `type: "image"`                              |
| `type: "Crosshatch"` | `type: "preset"` (preset: "crosshatch")      |

### プロパティ変換

| 旧プロパティ                   | 新プロパティ      |
| ------------------------------ | ----------------- |
| `rgb_string: "RGB(255, 0, 0)"` | `fill: "#FF0000"` |
| `alpha: 0.5`                   | `opacity: 0.5`    |
| `rotate: 45`                   | `rotate: 45`      |
| `blur_radius: 5`               | `blur: 5`         |
| `blink_interval: 1000`         | `blink: 1000`     |

### 座標変換

| 旧形式         | 新形式               |
| -------------- | -------------------- |
| `100`          | `100` (絶対値)       |
| `"50p"`        | `"50%"` (パーセント) |
| `"50pplus10"`  | `"calc(50% + 10px)"` |
| `"50pminus10"` | `"calc(50% - 10px)"` |

## 変換例

### 例1: Solid Background + Dot

**旧形式（input.json）:**

```json
{
  "background": {
    "type": "Solid",
    "rgb_string": "RGB(0, 0, 0)",
    "alpha": 1.0
  },
  "foreground": [
    {
      "type": "Dot",
      "x": "50p",
      "y": "50p",
      "rgb_string": "RGB(255, 0, 0)",
      "alpha": 1.0
    }
  ]
}
```

**新形式（output.yaml）:**

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - id: bg-migrated
    type: background
    preset: solid
    opacity: 1.0
    params:
      color: "#000000"

  - id: fg-dot-0
    type: circle
    x: 50%
    y: 50%
    diameter: 2
    fill: "#FF0000"
    opacity: 1.0
```

### 例2: Grayscale + Line

**旧形式（input.json）:**

```json
{
  "background": {
    "type": "Grayscale",
    "step_num": 16,
    "grayscale_direction": "h",
    "grayscale_inverse": false
  },
  "foreground": [
    {
      "type": "Line",
      "x": 0,
      "y": "50p",
      "line_direction": "h",
      "line_length": 1920,
      "line_width": 2,
      "rgb_string": "RGB(0, 255, 0)"
    }
  ]
}
```

**新形式（output.yaml）:**

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  - id: bg-migrated
    type: background
    preset: grayscale
    params:
      steps: 16
      direction: horizontal
      reverse: false

  - id: fg-line-0
    type: directedLine
    x: 0
    y: 50%
    direction: horizontal
    length: 1920
    stroke: "#00FF00"
    strokeWidth: 2
```

## CLI使用方法

### 基本コマンド

```bash
# ヘルプ表示
uv run python migrate.py --help

# 単一ファイル変換
uv run python migrate.py input.json output.yaml

# ディレクトリ一括変換
uv run python migrate.py --directory legacy/ --output-dir patterns/

# ドライラン
uv run python migrate.py --directory legacy/ --dry-run
```

### オプション

- `--directory`, `-d`: 変換元ディレクトリ（すべての.jsonファイルを変換）
- `--output-dir`, `-o`: 出力先ディレクトリ（`--directory`と併用）
- `--dry-run`: 実際に変換せず、変換予定のファイルを表示

## エラー対処

### エラー: Preset not found

**原因**: 変換後のプリセットが存在しない

**対処**: 必要なプリセットを `presets/` ディレクトリに作成してください。

### エラー: Invalid color format

**原因**: 色の形式が `RGB(r, g, b)` でない

**対処**: 旧ファイルの `rgb_string` を修正してください。

### エラー: Migration failed

**原因**: 旧形式のファイルが不完全

**対処**: `background` フィールドが存在するか確認してください。

## 手動調整が必要なケース

以下の機能は、マイグレーション後に手動で調整が必要です：

### 1. Window のアニメーション

旧形式の `window_speed` は、新形式のアニメーションに変換されません。

手動で追加：

```yaml
- id: moving-window
  type: rect
  x: 0
  y: 0
  width: 100
  height: 100
  fill: "#FFFFFF"
  animation:
    props:
      x: [0, 1820]
    duration: 5000
    iterations: Infinity
```

### 2. flat_step_ids / inverted_step_ids

これらは `params` に入りますが、対応するプリセットが必要です。

### 3. Canvas サイズ

デフォルトは 1920x1080 です。異なるサイズが必要な場合は手動で変更してください。

## テスト

マイグレーション機能をテスト：

```bash
cd backend
uv run python test_migration.py
```

すべてのテストがパスすることを確認してください。

## トラブルシューティング

### 変換結果を確認

変換後のYAMLファイルをJSON Schemaで検証：

```bash
# ajv-cli をインストール（1回のみ）
npm install -g ajv-cli

# 検証
ajv validate -s ../xsg-pattern.schema.json -d output.yaml
```

### 手動で確認

変換後のYAMLファイルをテキストエディタで開き、構造を確認してください。

## 参考資料

- [migration-mapping.md](./migration-mapping.md) - 完全な変換マッピング表

## サポート

問題が発生した場合は、以下を確認してください：

1. 旧形式のJSONファイルが有効か
2. 必要なプリセットが存在するか
3. エラーメッセージの内容

それでも解決しない場合は、GitHubのIssuesでご報告ください。
