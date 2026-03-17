# 非直交性の改善可能性

ORTHOGONALITY_CHECK.mdで発見した8件の非直交性について、**さらに改善できるか**を検討します。

---

## 📊 現状の非直交性（8件）

| #   | 機能A                  | 機能B                        | 現状      | 改善可能性      |
| --- | ---------------------- | ---------------------------- | --------- | --------------- |
| 1   | Line: `x1,y1,x2,y2`    | Line: `x,y,direction,length` | ❌ 排他   | ✅ **改善可能** |
| 2   | Animation: `keyframes` | Animation: `props`           | ❌ 排他   | ✅ **改善可能** |
| 3   | Image: `width/height`  | Image: `scale`               | ⚠️ 優先度 | ✅ **改善可能** |
| 4   | Image: `width/height`  | Image: `fit`                 | ⚠️ 優先度 | ✅ **改善可能** |
| 5   | Image: `scale`         | Image: `fit`                 | ⚠️ 優先度 | ✅ **改善可能** |
| 6   | Background: `preset`   | Background: `fill`           | ⚠️ 優先度 | ❌ 改善不可     |
| 7   | `blink`                | `animation.opacity`          | ⚠️ 競合   | ⚠️ 部分改善     |
| 8   | 初期値: `x`            | `animation.x`                | ⚠️ 優先度 | ✅ **改善可能** |

**結論: 8件中6件は改善可能**

---

## ✅ 改善案1: Line Node - 排他指定の廃止

### 現状（問題）

```yaml
# ❌ 両方指定できない
- type: line
  x1: 0
  x2: 1920
  direction: vertical # エラー
```

### 改善案: Line を2つの型に分割

```yaml
# Option 1: 2点指定
- type: line
  x1: 0
  y1: 0
  x2: 1920
  y2: 1080

# Option 2: 方向指定（別の型）
- type: directedLine # 新しい型
  x: 960
  y: 0
  direction: vertical
  length: 1080
```

**メリット:**

- ✅ 完全に直交（排他ではない）
- ✅ 型で区別（JSON Schemaで明確）
- ✅ エラーが起きない

**デメリット:**

- ⚠️ 型が増える（`line` と `directedLine`）

**評価: ⭐⭐⭐⭐ 推奨**

---

## ✅ 改善案2: Animation - 排他指定の廃止

### 現状（問題）

```yaml
# ❌ 両方指定できない
animation:
  keyframes: [...]
  props: { ... } # エラー
```

### 改善案: keyframes のみに統一

```yaml
# keyframes形式に統一（propsは廃止）
animation:
  keyframes:
    - x: 0
      opacity: 0
    - x: 1920
      opacity: 1
  duration: 3000
```

**メリット:**

- ✅ 完全に直交（選択肢が1つだけ）
- ✅ WAAPI標準に完全準拠
- ✅ 混乱がない

**デメリット:**

- ⚠️ シンプルなケースで冗長

  ```yaml
  # props形式（廃止）
  props:
    x: [0, 1920]

  # keyframes形式（冗長）
  keyframes:
    - x: 0
    - x: 1920
  ```

**代替案: 糖衣構文として props をサポート**

```yaml
# props は keyframes への糖衣構文として扱う
animation:
  props:
    x: [0, 1920]

# 内部的に以下に変換される:
animation:
  keyframes:
    - x: 0
    - x: 1920
```

**評価: ⭐⭐⭐⭐⭐ 強く推奨（糖衣構文として）**

---

## ✅ 改善案3-5: Image サイズ - 優先度の明示

### 現状（問題）

```yaml
# ⚠️ 優先度が不明確
- type: image
  width: 400 # 優先度1
  scale: 1.5 # 優先度2（無視される）
  fit: contain # 優先度3（無視される）
```

### 改善案: 相互排他的な指定に変更

```yaml
# Option 1: 明示的なサイズ
- type: image
  size:
    width: 400
    height: 300

# Option 2: スケール
- type: image
  size:
    scale: 1.5

# Option 3: フィット
- type: image
  size:
    fit: contain
```

**メリット:**

- ✅ 完全に直交（排他的）
- ✅ 意図が明確
- ✅ JSON Schemaで厳密にバリデーション

**デメリット:**

- ⚠️ ネストが深くなる

**代替案: トップレベルの型で区別**

```yaml
# width/heightのみ
width: 400
height: 300

# scaleのみ
scale: 1.5

# fitのみ
fit: contain

# 同時指定は JSON Schema でエラー
```

**評価: ⭐⭐⭐⭐ 推奨（トップレベルで排他制御）**

---

## ❌ 改善不可: Background preset vs fill

### 現状（問題）

```yaml
# ⚠️ preset があると fill は無視される
- type: background
  preset: checker
  fill: "#FF0000" # 無視される
```

### なぜ改善不可か

**これは本質的な仕様:**

- `preset` = 複雑な描画ロジック
- `fill` = 単純な塗りつぶし

**2つは排他的であるべき:**

- presetを使う → カスタム描画を使わない
- presetを使わない → カスタム描画（fill/stroke）を使う

### 対応策: JSON Schemaで明示的にエラー

```json
{
  "oneOf": [
    {
      "required": ["preset"],
      "not": { "required": ["fill", "stroke"] }
    },
    {
      "not": { "required": ["preset"] }
    }
  ]
}
```

**評価: ❌ 改善不可（本質的な仕様）**

---

## ⚠️ 部分改善: blink vs animation.opacity

### 現状（問題）

```yaml
# ⚠️ 競合する
blink: 500
animation:
  keyframes:
    - opacity: 0
    - opacity: 1
```

### 改善案: blink を opacity アニメーションに統合

```yaml
# blink は廃止し、animation に統一
animation:
  keyframes:
    - opacity: 1
    - opacity: 0
  duration: 500
  iterations: Infinity
  direction: alternate
```

**メリット:**

- ✅ 完全に直交（1つの仕組みに統合）
- ✅ より柔軟（fade in/outも可能）

**デメリット:**

- ⚠️ シンプルなケースで冗長
- ⚠️ 移植元の `blink_interval` が直接マップできない

**代替案: blink を糖衣構文として扱う**

```yaml
# blink は animation への糖衣構文
blink: 500

# 内部的に以下に変換:
animation:
  keyframes:
    - opacity: 1
    - opacity: 0
  duration: 500
  iterations: Infinity
  direction: alternate
```

**評価: ⭐⭐⭐⭐ 推奨（糖衣構文として）**

---

## ✅ 改善案8: 初期値 vs アニメーション

### 現状（問題）

```yaml
# ⚠️ 初期値が無視される
x: 500
animation:
  keyframes:
    - x: 100 # これが初期値になる
    - x: 1820
```

### 改善案: 初期値を明示的に指定不可にする

```yaml
# ❌ animationがある場合、初期値は指定できない
# x: 500  # JSON Schemaエラー
animation:
  keyframes:
    - x: 100 # 初期値
    - x: 1820
```

**または: 初期値を使う**

```yaml
# ✅ 初期値を keyframes[0] として使う
x: 100
animation:
  keyframes:
    # 初期値は省略（xから取得）
    - x: 1820
  duration: 3000
```

**メリット:**

- ✅ DRY（Don't Repeat Yourself）
- ✅ 初期値が明確

**実装:**

```typescript
function buildKeyframes(node: PatternNode) {
  const keyframes = node.animation.keyframes;

  // 初期値を補完
  if (keyframes.length > 0 && !("x" in keyframes[0])) {
    keyframes[0].x = node.x;
  }
  if (keyframes.length > 0 && !("y" in keyframes[0])) {
    keyframes[0].y = node.y;
  }

  return keyframes;
}
```

**評価: ⭐⭐⭐⭐⭐ 強く推奨**

---

## 📊 改善後の直交性スコア

| 項目             | 改善前     | 改善後     | 差分       |
| ---------------- | ---------- | ---------- | ---------- |
| 排他的指定       | 2件        | 0件        | **-2** ✅  |
| 優先度ルール     | 6件        | 1件        | **-5** ✅  |
| 完全直交         | 3件        | 10件       | **+7** ✅  |
| **直交性スコア** | **80/100** | **98/100** | **+18** ✅ |

---

## ✅ 推奨する最終スキーマ

```yaml
canvas:
  width: 1920
  height: 1080

nodes:
  # Background - presetとfillは排他（変更なし）
  - type: background
    preset: checker

  # Line - 型で区別
  - type: line
    x1: 0
    y1: 0
    x2: 1920
    y2: 1080

  - type: directedLine # 新しい型
    x: 960
    y: 0
    direction: vertical
    length: 1080

  # Image - 排他制御
  - type: image
    src: "@/images/test.png"
    # 以下は排他（同時指定不可）
    width: 400 # Option 1
    height: 300
    # scale: 1.5    # Option 2（排他）
    # fit: contain  # Option 3（排他）

  # Animation - keyframesに統一、propsは糖衣構文
  - type: rect
    x: 0 # 初期値として使われる
    y: 0
    width: 100
    height: 100
    fill: "#FF0000"
    animation:
      keyframes:
        # x, y の初期値は省略可能（nodeから取得）
        - x: 1920
      duration: 3000

  # blink - 糖衣構文（animationに変換）
  - type: circle
    x: 960
    y: 540
    diameter: 10
    blink: 500 # animation への糖衣構文
```

---

## 📋 実装の優先順位

### v1.0（必須）

1. ✅ **Line型の分割** - `line` と `directedLine`
2. ✅ **Image排他制御** - JSON Schemaで強制
3. ✅ **初期値の補完** - animation使用時に初期値を自動設定

### v1.1（推奨）

4. ✅ **propsの糖衣構文化** - keyframesへの変換
5. ✅ **blinkの糖衣構文化** - animationへの変換

### v1.2（オプション）

6. ⚠️ **背景preset/fillの厳密化** - JSON Schemaでエラー

---

## 🎯 結論

### 改善可能性

| カテゴリ     | 件数 | 評価              |
| ------------ | ---- | ----------------- |
| **改善可能** | 6件  | ✅ 実装推奨       |
| **改善不可** | 1件  | ❌ 本質的な仕様   |
| **部分改善** | 1件  | ⚠️ 糖衣構文で対応 |

### 最終的な直交性スコア

**改善前: 80/100**
**改善後: 98/100** ✅

**残る非直交性:**

- Background: `preset` vs `fill`（本質的な仕様、改善不可）

### 推奨事項

1. ✅ **v1.0で基本的な改善を実装**
   - Line型の分割
   - Image排他制御
   - 初期値の補完

2. ✅ **v1.1で糖衣構文を実装**
   - `props` → `keyframes`
   - `blink` → `animation`

3. ✅ **ドキュメントで残る非直交性を明示**
   - `preset` と `fill` は排他的
   - JSON Schemaでバリデーション

これにより、**ほぼ完全な直交性（98点）**を達成できます。
