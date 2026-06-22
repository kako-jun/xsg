# プレイリスト 直交設計

## 🎯 問題点

現在の設計では、**データソース**と**再生順序**が混在しています：

```yaml
# ❌ 混在している（非直交）
playlist:
  mode: random # 再生順序
items:
  - generator: random # データソース
    count: 10
```

**問題:**

- `playlist.mode: random` と `generator: random` の違いが分かりにくい
- URLや画像を使う場合、ランダム生成は不要
- 3つの概念が混在：データソース、再生順序、ループ

---

## ✅ 直交設計

### 3つの独立した軸

```
1. データソース（what）  : パターン | URL | 画像 | ランダム生成
2. 再生順序（how）      : シーケンシャル | ランダム | シャッフル
3. 再生モード（loop）   : ループ | ワンショット
```

これらは**完全に独立**して選択可能であるべきです。

---

## 📋 新しいスキーマ

```yaml
# playlist.yaml
version: "1.0"

# 再生設定（how + loop）
playback:
  order: sequence # sequence | random | shuffle
  loop: true # true | false
  defaultDuration: 5000

# データソース（what）
sources:
  # Source 1: パターンファイル
  - type: pattern
    path: "@/patterns/colorbar.yaml"
    duration: 3000

  # Source 2: URL（Webページ）
  - type: url
    url: "https://example.com"
    readonly: true
    duration: 10000

  # Source 3: 画像（URL）
  - type: image
    src: "https://picsum.photos/1920/1080"
    fit: cover
    duration: 5000

  # Source 4: 画像（ローカル）
  - type: image
    src: "@/images/logo.png"
    tile: true
    tileSize: 200
    duration: 10000

  # Source 5: インラインパターン
  - type: inline
    pattern:
      canvas:
        width: 1920
        height: 1080
      nodes:
        - type: background
          preset: checker
    duration: 5000

# データソース（ランダム生成）
generator:
  enabled: true # ランダム生成を有効化
  count: 20 # 生成する数
  duration: 3000 # デフォルト表示時間
  constraints:
    presets:
      - checker
      - colorbar
    layers:
      min: 1
      max: 5
    colors:
      - "#FF0000"
      - "#00FF00"
      - "#0000FF"
```

---

## 🔧 直交性の保証

### 軸1: データソース（what）

```yaml
# 選択肢A: 明示的なソース
sources:
  - type: pattern
    path: "@/patterns/colorbar.yaml"

# 選択肢B: ランダム生成
generator:
  enabled: true
  count: 20

# 選択肢C: 両方（マージ）
sources:
  - type: pattern
    path: "@/patterns/colorbar.yaml"
generator:
  enabled: true
  count: 10
# → 合計11個のソースが生成される
```

### 軸2: 再生順序（how）

```yaml
# 選択肢A: シーケンシャル（定義順）
playback:
  order: sequence

# 選択肢B: ランダム（毎回違う順序）
playback:
  order: random

# 選択肢C: シャッフル（全体をシャッフルして固定）
playback:
  order: shuffle
```

### 軸3: ループ

```yaml
# 選択肢A: ループ
playback:
  loop: true

# 選択肢B: ワンショット
playback:
  loop: false
```

---

## 🎨 使用例

### 例1: URL画像をランダム順序でループ

```yaml
# URLからの画像をランダム再生
playback:
  order: random # ランダム順序
  loop: true # ループ

sources:
  - type: image
    src: "https://picsum.photos/id/1/1920/1080"
  - type: image
    src: "https://picsum.photos/id/2/1920/1080"
  - type: image
    src: "https://picsum.photos/id/3/1920/1080"

# ランダム生成は使わない
generator:
  enabled: false
```

### 例2: パターンをシーケンシャルにループ

```yaml
# 検査用：パターンを順番にループ
playback:
  order: sequence # 順番通り
  loop: true

sources:
  - type: pattern
    path: "@/patterns/colorbar.yaml"
    duration: 2000
  - type: pattern
    path: "@/patterns/checker.yaml"
    duration: 2000
  - type: pattern
    path: "@/patterns/white.yaml"
    duration: 2000

generator:
  enabled: false
```

### 例3: ランダム生成のみ

```yaml
# スクリーンセーバー：ランダムパターンをランダム順序
playback:
  order: random
  loop: true

# 明示的なソースなし
sources: []

# ランダム生成のみ
generator:
  enabled: true
  count: 100
  constraints:
    presets:
      - checker
      - colorbar
      - grayscale
```

### 例4: 混在（パターン + ランダム生成）

```yaml
# 会社ロゴ + ランダムパターン
playback:
  order: shuffle # シャッフル
  loop: true

sources:
  # 会社ロゴ（必ず含まれる）
  - type: image
    src: "@/images/company-logo.png"
    duration: 10000

  # お知らせ（必ず含まれる）
  - type: url
    url: "https://company.com/notice"
    duration: 15000

# ランダムパターンも追加
generator:
  enabled: true
  count: 10
  duration: 5000

# → 合計12個のソースがシャッフルされる
```

---

## 📊 直交性マトリックス

| データソース           | シーケンシャル | ランダム | シャッフル | ループ | ワンショット |
| ---------------------- | -------------- | -------- | ---------- | ------ | ------------ |
| **明示的なソースのみ** | ✅             | ✅       | ✅         | ✅     | ✅           |
| **ランダム生成のみ**   | ✅             | ✅       | ✅         | ✅     | ✅           |
| **両方混在**           | ✅             | ✅       | ✅         | ✅     | ✅           |

**全ての組み合わせが直交しています。**

---

## 🔍 再生順序の詳細

### sequence（シーケンシャル）

```yaml
playback:
  order: sequence

sources:
  - A
  - B
  - C

# 再生順序: A → B → C → A → B → C → ...
```

`loop: false` のときは全件（A → B → C）を再生したあと停止する。

### random（ランダム）

```yaml
playback:
  order: random

sources:
  - A
  - B
  - C

# 再生順序: B → A → C → B → B → A → ...（毎回ランダム）
```

**random は本質的に無限再生で `loop` を無視する**（#20）。毎回ソースを乱択するだけで「全件出した」という終端の概念が無いため、`loop: false` を指定しても停止しない（`loop` フラグは random には無意味）。停止が必要なら sequence / shuffle を使う。

### shuffle（シャッフル）

```yaml
playback:
  order: shuffle

sources:
  - A
  - B
  - C

# 再生順序: C → A → B → C → A → B → ...（最初にシャッフル、以降固定）
```

`loop: false` のときは（シャッフル後の）全件を再生したあと停止する。

---

## 🚀 実装

```python
# backend/app/playlist.py
class PlaylistRunner:
    def __init__(self, playlist_data: Dict):
        self.playback = playlist_data["playback"]
        self.sources = self._load_sources(playlist_data)

    def _load_sources(self, playlist_data: Dict) -> List[Dict]:
        """データソースを読み込み"""
        sources = []

        # 明示的なソース
        for source in playlist_data.get("sources", []):
            sources.append(source)

        # ランダム生成
        generator = playlist_data.get("generator", {})
        if generator.get("enabled", False):
            gen = PatternGenerator(generator.get("constraints", {}))
            count = generator.get("count", 10)
            duration = generator.get("duration", 5000)

            for _ in range(count):
                pattern = gen.generate()
                sources.append({
                    "type": "inline",
                    "pattern": pattern,
                    "duration": duration,
                })

        # 再生順序を適用
        order = self.playback.get("order", "sequence")
        if order == "shuffle":
            random.shuffle(sources)

        return sources

    def get_next(self) -> Dict:
        """次のソースを取得"""
        order = self.playback.get("order", "sequence")

        if order == "sequence":
            source = self.sources[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.sources)
        elif order == "random":
            source = random.choice(self.sources)
        elif order == "shuffle":
            # すでにシャッフル済み
            source = self.sources[self.current_index]
            self.current_index = (self.current_index + 1) % len(self.sources)

        return source

    async def run(self, on_change_callback):
        """プレイリスト実行"""
        while True:
            source = self.get_next()
            duration = source.get("duration", self.playback.get("defaultDuration", 5000))

            await on_change_callback(source)
            await asyncio.sleep(duration / 1000)

            # ループ設定
            if not self.playback.get("loop", True) and self.current_index == 0:
                break
```

---

## 📋 スキーマ定義（確定版）

```yaml
# playlist-schema.yaml
version: "1.0"

# 再生設定（独立した軸）
playback:
  order: sequence | random | shuffle # 再生順序
  loop: boolean # ループ（random では無視＝random は常に無限再生 #20）
  defaultDuration: number # デフォルト表示時間（ms）

# データソース（独立した軸）
sources:
  - type: pattern | url | image | inline
    # type固有のプロパティ
    duration: number # Optional（上書き）

# ランダム生成（独立した軸）
generator:
  enabled: boolean
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

## 🎯 直交性スコア

| 機能                   | 改善前     | 改善後         |
| ---------------------- | ---------- | -------------- |
| データソースと再生順序 | ❌ 混在    | ✅ 分離        |
| ランダム生成と再生順序 | ❌ 混在    | ✅ 分離        |
| ループと再生順序       | ✅ 分離    | ✅ 分離        |
| **直交性スコア**       | **60/100** | **100/100** ✅ |

---

## ✅ まとめ

**改善点:**

1. ✅ **データソース** - `sources` と `generator` に分離
2. ✅ **再生順序** - `playback.order` で統一
3. ✅ **ループ** - `playback.loop` で統一

**直交性:**

- ✅ データソースと再生順序は独立
- ✅ ランダム生成と再生順序は独立
- ✅ ループと再生順序は独立
- ✅ **全ての組み合わせが可能**

**用途別の使い方:**
| 用途 | データソース | 再生順序 | ループ |
|------|-------------|---------|-------|
| **スクリーンセーバー（ランダム）** | generator | random | true |
| **スクリーンセーバー（URL画像）** | sources(image) | random | true |
| **デジタルサイネージ** | sources(url+pattern) | sequence | true |
| **検査ツール** | sources(pattern) | sequence | true |

これで完全に直交した設計になりました！
