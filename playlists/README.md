# XSG Playlists

プレイリストは、パターンやURL、画像を自動的に切り替えて表示する機能です。

## 設計哲学

プレイリストは**3つの独立した軸**で構成されます：

1. **データソース（what）**: 何を表示するか
   - `sources`: 明示的なソース（パターン、URL、画像）
   - `generator`: ランダム生成

2. **再生順序（how）**: どの順序で表示するか
   - `sequence`: 順番通り
   - `random`: 毎回ランダム
   - `shuffle`: 最初にシャッフル、以降固定

3. **ループ（loop）**: 繰り返すか
   - `true`: ループ
   - `false`: ワンショット

**完全に直交** - すべての組み合わせが可能です。

## サンプルプレイリスト

### random-screensaver.yaml

- **用途**: スクリーンセーバー（ランダムパターン）
- **データソース**: ランダム生成のみ（100個）
- **再生順序**: ランダム
- **ループ**: あり

### image-slideshow.yaml

- **用途**: 画像スライドショー
- **データソース**: URL画像（5枚）
- **再生順序**: ランダム
- **ループ**: あり

### digital-signage.yaml

- **用途**: デジタルサイネージ
- **データソース**: Webページ + パターン + 画像
- **再生順序**: シーケンシャル
- **ループ**: あり

### test-pattern-loop.yaml

- **用途**: テストパターン循環表示
- **データソース**: パターンファイル（4個）
- **再生順序**: シーケンシャル
- **ループ**: あり

## プレイリストの書き方

### 基本構造

```yaml
# 再生設定（必須）
playback:
  order: sequence | random | shuffle
  loop: true | false
  defaultDuration: 5000 # ミリ秒

# データソース（オプション）
sources:
  - type: pattern | url | image | inline
    # ...

# ランダム生成（オプション）
generator:
  enabled: true
  count: 10
  # ...
```

### データソースの種類

#### 1. パターンファイル

```yaml
sources:
  - type: pattern
    path: "@/patterns/colorbar-simple.yaml"
    duration: 3000
```

パスの形式：

- `@/patterns/test.yaml` - プロジェクト相対
- `../patterns/test.yaml` - 相対パス
- `/absolute/path/test.yaml` - 絶対パス
- `https://example.com/test.yaml` - URL

#### 2. Webページ

```yaml
sources:
  - type: url
    url: "https://example.com/dashboard"
    readonly: true # 操作無効化
    duration: 30000
```

#### 3. 画像

```yaml
sources:
  - type: image
    src: "https://picsum.photos/1920/1080"
    fit: cover # contain | cover | fill
    duration: 5000

  # タイル表示（キャラクター展示など）
  - type: image
    src: "@/images/character.png"
    tile: true
    tileSize: 200
    duration: 10000
```

#### 4. インラインパターン

```yaml
sources:
  - type: inline
    pattern:
      canvas:
        width: 1920
        height: 1080
      nodes:
        - id: bg
          type: background
          preset: solid
          params:
            color: "#FF0000"
    duration: 5000
```

### ランダム生成

```yaml
generator:
  enabled: true
  count: 100 # 生成する数
  duration: 3000 # デフォルト表示時間
  constraints:
    presets:
      - colorbar
      - checker
      - grayscale
    layers:
      min: 1
      max: 3
    colors:
      - "#FF0000"
      - "#00FF00"
      - "#0000FF"
```

## 使用例

### 例1: ランダムパターンのみ

```yaml
playback:
  order: random
  loop: true

generator:
  enabled: true
  count: 100
```

### 例2: URL画像のランダム表示

```yaml
playback:
  order: random
  loop: true

sources:
  - type: image
    src: "https://picsum.photos/1920/1080?random=1"
  - type: image
    src: "https://picsum.photos/1920/1080?random=2"
  - type: image
    src: "https://picsum.photos/1920/1080?random=3"
```

### 例3: パターン + ランダム生成の混在

```yaml
playback:
  order: shuffle
  loop: true

sources:
  # 固定パターン
  - type: pattern
    path: "@/patterns/colorbar-simple.yaml"
    duration: 5000

  # 会社ロゴ
  - type: image
    src: "@/images/logo.png"
    duration: 10000

# ランダムパターンも追加
generator:
  enabled: true
  count: 10
  duration: 3000

# → 合計12個のソースがシャッフルされる
```

### 例4: デジタルサイネージ（順番固定）

```yaml
playback:
  order: sequence
  loop: true

sources:
  - type: url
    url: "https://company.com/dashboard"
    readonly: true
    duration: 30000

  - type: pattern
    path: "@/patterns/colorbar-simple.yaml"
    duration: 5000

  - type: image
    src: "@/images/announcement.png"
    duration: 15000
```

## CLI使用方法

```bash
# プレイリストを実行
cd backend
uv run python -m app.main --playlist ../playlists/random-screensaver.yaml

# スクリーンセーバーモード
uv run python -m app.main --screensaver --playlist ../playlists/random-screensaver.yaml
```

## 直交性マトリックス

| データソース           | シーケンシャル | ランダム | シャッフル | ループ | ワンショット |
| ---------------------- | -------------- | -------- | ---------- | ------ | ------------ |
| **明示的なソースのみ** | ✅             | ✅       | ✅         | ✅     | ✅           |
| **ランダム生成のみ**   | ✅             | ✅       | ✅         | ✅     | ✅           |
| **両方混在**           | ✅             | ✅       | ✅         | ✅     | ✅           |

**全ての組み合わせが直交しています。**

## 参考資料

- [PLAYLIST_ORTHOGONAL_DESIGN.md](../PLAYLIST_ORTHOGONAL_DESIGN.md) - 直交設計の詳細
- [SCREENSAVER_PLAYLIST.md](../SCREENSAVER_PLAYLIST.md) - スクリーンセーバー機能
- [WEB_RENDERING_MODE.md](../WEB_RENDERING_MODE.md) - Webレンダリング
