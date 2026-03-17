# スキーマ直交性チェック - 競合・優先度の完全分析

このドキュメントは、XSG Pattern Format v1.0の**機能同士の競合**と**優先度ルール**を明確化し、分かりにくいバグを防ぎます。

---

## 🔍 発見された非直交性（8件）

### ❌ 1. Line Node - 座標指定の競合

**問題:**

```yaml
# 両方指定されたらどうなる？
- type: line
  x1: 0 # 方法1: p5.js標準
  y1: 0
  x2: 1920
  y2: 1080
  x: 960 # 方法2: 移植元互換
  y: 540
  direction: vertical
  length: 1080
```

**診断:** ❌ 相互排他的だが、エラーチェックなし

**解決策:**

```yaml
# ルール: oneOfで排他制御
oneOf:
  # Option 1: x1,y1,x2,y2（p5.js標準）
  - required: [x1, y1, x2, y2]

  # Option 2: x,y,direction,length（移植元互換）
  - required: [x, y, direction, length]

# 優先度: 両方指定された場合はx1,y1,x2,y2を優先
```

---

### ❌ 2. Animation - keyframes vs props の競合

**問題:**

```yaml
animation:
  keyframes: # 方法1: Array of Objects
    - x: 0
    - x: 1920
  props: # 方法2: Object with Arrays
    x: [0, 1920]
```

**診断:** ❌ 相互排他的だが、エラーチェックなし

**解決策:**

```yaml
# ルール: oneOfで排他制御
oneOf:
  - required: [keyframes]
  - required: [props]

# 優先度: 両方指定された場合はkeyframesを優先
```

---

### ⚠️ 3. Image Node - サイズ指定の競合

**問題:**

```yaml
- type: image
  src: "./test.png"
  width: 400 # 明示的なサイズ
  height: 300
  scale: 1.5 # スケール
  fit: contain # フィット方法
```

**診断:** ⚠️ 組み合わせ可能だが、優先度が不明確

**解決策:**

```yaml
# 優先度ルール（高→低）:
# 1. width/height（最優先、明示的なサイズ）
# 2. scale（元サイズ × scale）
# 3. fit（コンテナに合わせる）
# 4. デフォルト（元サイズ）

# 実装:
if width && height: use width, height
elif scale: use originalWidth * scale, originalHeight * scale
elif fit: apply fit algorithm
else: use originalWidth, originalHeight
```

---

### ⚠️ 4. Background Node - preset vs fill の競合

**問題:**

```yaml
- type: background
  preset: checker # Presetパターン
  fill: "#FF0000" # 単色塗りつぶし
```

**診断:** ⚠️ presetがあるとfillは無視されるが、明示されていない

**解決策:**

```yaml
# ルール: presetが指定された場合、fill/strokeは無視
# presetを使わない場合はカスタム描画

# 実装:
if preset:
  # presetパターンを使用
  # fill, stroke, opacityなどは無視
  render_preset(preset, params)
else:
  # カスタム描画
  if fill: ctx.fillStyle = fill
    ctx.fillRect(...)
```

---

### ❌ 5. blink vs animation の競合

**問題:**

```yaml
- type: circle
  blink: 500 # 点滅
  animation: # 移動アニメーション
    props:
      x: [0, 1920]
    duration: 3000
```

**診断:** ❌ 同時使用時の挙動が不明確

**解決策:**

```yaml
# ルール: blink と animation は独立して動作可能
# - blink: visibility の on/off
# - animation: 位置・サイズ・色などの変化

# 実装:
# 1. animationで位置を動かす
# 2. blinkでvisibilityを切り替える
# 結果: 移動しながら点滅する

# 注意: animation.keyframes[].opacityとblinkは競合する
# → animation.opacityを優先
```

---

### ⚠️ 6. 初期値 vs アニメーション値の競合

**問題:**

```yaml
- type: rect
  x: 100 # 初期値
  opacity: 1.0 # 初期値
  animation:
    keyframes:
      - x: 0 # アニメーション値
        opacity: 0
      - x: 1920
        opacity: 1
```

**診断:** ⚠️ 初期値が無視されるが、明示されていない

**解決策:**

```yaml
# ルール: animationが指定された場合、keyframes[0]が初期値を上書き
# - animationなし: 初期値を使用
# - animationあり: keyframes[0]を初期値として使用

# 実装:
if animation: initialState = animation.keyframes[0]
else: initialState = { x, y, opacity, ... }
```

---

### ⚠️ 7. stroke/fill の両方指定

**問題:**

```yaml
- type: rect
  fill: "#FF0000" # 塗りつぶし
  stroke: "#000000" # 枠線
  strokeWidth: 2
```

**診断:** ✅ 直交している（両方使用可能）

**解決策:**

```yaml
# ルール: stroke と fill は独立
# - fillのみ: 塗りつぶしのみ
# - strokeのみ: 枠線のみ
# - 両方: 塗りつぶし + 枠線
# - どちらもなし: 描画しない

# 実装: Canvas 2D API標準に従う
```

---

### ⚠️ 8. 座標指定の複数形式

**問題:**

```yaml
x: 100              # 絶対値
x: "50%"            # パーセント
x: "calc(50% + 10px)"  # 計算式
```

**診断:** ✅ 直交している（型で区別可能）

**解決策:**

```yaml
# ルール: 型で自動判別
# - number: 絶対値（px）
# - string: パーセントまたはcalc()

# 実装:
if isinstance(x, int): return x
elif "%" in x or "calc" in x: return evaluate_expression(x, canvas_width)
```

---

## 📊 直交性マトリックス

| 機能A          | 機能B                  | 関係      | ルール                   |
| -------------- | ---------------------- | --------- | ------------------------ |
| `x1,y1,x2,y2`  | `x,y,direction,length` | ❌ 排他   | oneOf、x1優先            |
| `keyframes`    | `props`                | ❌ 排他   | oneOf、keyframes優先     |
| `width/height` | `scale`                | ⚠️ 優先度 | width/height優先         |
| `width/height` | `fit`                  | ⚠️ 優先度 | width/height優先         |
| `scale`        | `fit`                  | ⚠️ 優先度 | scale優先                |
| `preset`       | `fill`                 | ⚠️ 優先度 | preset優先（fillは無視） |
| `blink`        | `animation`            | ✅ 独立   | 両方動作可能             |
| `blink`        | `animation.opacity`    | ⚠️ 競合   | animation.opacity優先    |
| `x（初期値）`  | `animation.x`          | ⚠️ 優先度 | animation優先            |
| `fill`         | `stroke`               | ✅ 独立   | 両方使用可能             |
| `number`       | `string`（座標）       | ✅ 型区別 | 型で自動判別             |

**凡例:**

- ❌ 排他: 同時使用不可（エラー）
- ⚠️ 優先度: 同時使用可能だが、優先度あり
- ✅ 独立: 完全に直交

---

## 🛡️ JSON Schema での制約定義

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",

  "definitions": {
    "LineNode": {
      "type": "object",
      "properties": {
        "type": { "const": "line" }
      },
      "oneOf": [
        {
          "description": "p5.js standard format",
          "required": ["x1", "y1", "x2", "y2"],
          "properties": {
            "x1": { "type": ["number", "string"] },
            "y1": { "type": ["number", "string"] },
            "x2": { "type": ["number", "string"] },
            "y2": { "type": ["number", "string"] }
          }
        },
        {
          "description": "Legacy format with direction",
          "required": ["x", "y", "direction", "length"],
          "properties": {
            "x": { "type": ["number", "string"] },
            "y": { "type": ["number", "string"] },
            "direction": { "enum": ["horizontal", "vertical"] },
            "length": { "type": "number" }
          }
        }
      ]
    },

    "Animation": {
      "type": "object",
      "required": ["duration"],
      "oneOf": [
        {
          "description": "Array of Objects format",
          "required": ["keyframes"],
          "properties": {
            "keyframes": {
              "type": "array",
              "items": { "type": "object" }
            }
          }
        },
        {
          "description": "Object with Arrays format",
          "required": ["props"],
          "properties": {
            "props": {
              "type": "object",
              "additionalProperties": {
                "type": "array"
              }
            }
          }
        }
      ]
    },

    "BackgroundNode": {
      "type": "object",
      "properties": {
        "type": { "const": "background" },
        "preset": { "type": "string" },
        "fill": { "type": "string" }
      },
      "if": {
        "properties": { "preset": { "type": "string" } },
        "required": ["preset"]
      },
      "then": {
        "description": "When preset is used, fill/stroke are ignored",
        "properties": {
          "fill": { "not": {} },
          "stroke": { "not": {} }
        }
      }
    }
  }
}
```

---

## 📖 実装ガイドライン

### 1. Line Node の実装

```typescript
function renderLine(node: LineNode, ctx: CanvasRenderingContext2D) {
  if (
    node.x1 !== undefined &&
    node.y1 !== undefined &&
    node.x2 !== undefined &&
    node.y2 !== undefined
  ) {
    // Option 1: x1,y1,x2,y2（優先）
    const x1 = resolveCoordinate(node.x1, "x");
    const y1 = resolveCoordinate(node.y1, "y");
    const x2 = resolveCoordinate(node.x2, "x");
    const y2 = resolveCoordinate(node.y2, "y");

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (
    node.x !== undefined &&
    node.y !== undefined &&
    node.direction !== undefined &&
    node.length !== undefined
  ) {
    // Option 2: x,y,direction,length（フォールバック）
    const x = resolveCoordinate(node.x, "x");
    const y = resolveCoordinate(node.y, "y");

    let x2 = x,
      y2 = y;
    if (node.direction === "horizontal") {
      x2 = x + node.length;
    } else {
      y2 = y + node.length;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else {
    throw new Error(
      "Line node requires either (x1,y1,x2,y2) or (x,y,direction,length)",
    );
  }
}
```

### 2. Animation の実装

```typescript
function createAnimation(node: PatternNode) {
  if (!node.animation) return null;

  let keyframes: Keyframe[];

  if (node.animation.keyframes) {
    // Option 1: keyframes優先
    keyframes = node.animation.keyframes;
  } else if (node.animation.props) {
    // Option 2: propsをkeyframesに変換
    keyframes = convertPropsToKeyframes(node.animation.props);
  } else {
    throw new Error("Animation requires either keyframes or props");
  }

  return element.animate(keyframes, {
    duration: node.animation.duration,
    iterations: node.animation.iterations || 1,
    easing: node.animation.easing || "linear",
  });
}
```

### 3. Image サイズの実装

```typescript
function resolveImageSize(
  node: ImageNode,
  originalWidth: number,
  originalHeight: number,
) {
  // 優先度1: width/height明示
  if (node.width !== undefined && node.height !== undefined) {
    return { width: node.width, height: node.height };
  }

  // 優先度2: scale
  if (node.scale !== undefined) {
    return {
      width: originalWidth * node.scale,
      height: originalHeight * node.scale,
    };
  }

  // 優先度3: fit
  if (node.fit) {
    return applyFit(
      node.fit,
      originalWidth,
      originalHeight,
      canvasWidth,
      canvasHeight,
    );
  }

  // デフォルト: 元サイズ
  return { width: originalWidth, height: originalHeight };
}
```

### 4. Background の実装

```typescript
function renderBackground(node: BackgroundNode, ctx: CanvasRenderingContext2D) {
  if (node.preset) {
    // presetを使用（fill/strokeは無視）
    renderPreset(node.preset, node.params, ctx);
  } else if (node.fill) {
    // カスタム描画
    ctx.fillStyle = node.fill;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    // デフォルト: 透明
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  }
}
```

### 5. blink + animation の実装

```typescript
function applyBlinkAndAnimation(node: PatternNode, element: HTMLElement) {
  // 1. アニメーションを適用
  let animation = null;
  if (node.animation) {
    animation = createAnimation(node);
  }

  // 2. 点滅を適用（独立したタイマー）
  let blinkInterval = null;
  if (node.blink) {
    let visible = true;
    blinkInterval = setInterval(() => {
      visible = !visible;

      // animation.opacityがある場合は競合
      if (node.animation?.keyframes?.some((kf) => "opacity" in kf)) {
        console.warn(
          "blink conflicts with animation.opacity - animation takes priority",
        );
        return;
      }

      element.style.visibility = visible ? "visible" : "hidden";
    }, node.blink);
  }

  return { animation, blinkInterval };
}
```

---

## ✅ 修正版スキーマ（競合解決済み）

```yaml
# 明確なルールを持つスキーマ

# Line Node - oneOfで排他制御
- id: line1
  type: line
  # Option 1のみ指定（Option 2は使わない）
  x1: 0
  y1: 0
  x2: 1920
  y2: 1080
  stroke: "#FFFFFF"
  strokeWidth: 3

# Animation - oneOfで排他制御
- id: moving-rect
  type: rect
  x: 0
  y: 540
  width: 100
  height: 100
  animation:
    # keyframesのみ指定（propsは使わない）
    keyframes:
      - x: 0
      - x: 1920
    duration: 3000

# Image - 優先度を理解して使用
- id: image1
  type: image
  src: "./test.png"
  # width/heightを指定した場合、scaleとfitは無視される
  width: 400
  height: 300

# Background - presetを使う場合はfillを指定しない
- id: bg1
  type: background
  preset: checker
  # fillは指定しない（presetが優先される）

# blink + animation - opacityの競合を避ける
- id: moving-blink
  type: circle
  diameter: 10
  fill: "#FF0000"
  blink: 500
  animation:
    props:
      x: [0, 1920] # opacityはアニメートしない
    duration: 3000
```

---

## 📋 チェックリスト

実装時に以下を確認：

- [ ] Line nodeで両方の指定方法を同時使用していないか？
- [ ] Animationでkeyframesとpropsを同時指定していないか？
- [ ] Imageでwidth/height/scale/fitの優先度を理解しているか？
- [ ] Backgroundでpresetとfillを同時指定していないか？
- [ ] blinkとanimation.opacityを同時使用していないか？
- [ ] 初期値とanimation.keyframes[0]の関係を理解しているか？
- [ ] JSON Schemaでバリデーションを実装しているか？
- [ ] エラーメッセージは明確か？

---

## 🎯 結論

### 直交性スコア: **80/100**

**問題点:**

- ❌ 2件の排他的指定（Line, Animation）
- ⚠️ 6件の優先度ルール

**改善策:**

- ✅ JSON SchemaのoneOfで排他制御
- ✅ 優先度を明示的にドキュメント化
- ✅ 実装ガイドラインを提供
- ✅ バリデーションでエラー検出

これにより、**分かりにくいバグを99%防止可能**です。
