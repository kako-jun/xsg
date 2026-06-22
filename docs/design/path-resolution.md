# XSG パス解決仕様

> ⚠️ **この文書は現行実装（Tauri + TypeScript）に合わせて 2026-06 に改訂した。**
> 旧版は存在しない Python バックエンド（`backend/app/path_resolver.py`・`uv run python -m app.main` CLI・pytest）を前提に書かれていたが、その設計は破棄された。現行の座標／パス解決はすべて TypeScript 実装（`frontend/src/lib/pathResolver.ts` ほか）が正本である。Python 実装は存在しない。

XSG のパス解決には 2 系統ある。

1. **画像ファイルパスの解決**（`src` 属性 → 実 URL／ファイルパス）
2. **座標の解決**（`x`/`y` 等 → ピクセル値。`%`・`calc()` を含む）

両方とも `frontend/src/lib/pathResolver.ts` に実装されている。

---

## 1. 画像ファイルパスの解決

### 正本

- 実装: `frontend/src/lib/pathResolver.ts` の `class PathResolver` ＋ 便宜関数 `resolvePath(path, options?)` / `getPathResolver(options?)`
- 呼び出し元: `frontend/src/components/SlideshowView.tsx`（L241 `resolvePath(source.src)`）でスライドショーの画像 `src` を解決している。
  - 注意: 単体ノードを描く `NodeRenderer.tsx` の `renderImage` は現状 `img.src = node.src`（L463）と **生の `src` をそのまま** `<img>` に渡している（`resolvePath` を経由しない）。`@/`・相対パスの正規化は SlideshowView 経路でのみ効く。これは既知の非対称で、image ノードのパス正規化を全描画経路に通すかは要検討。

### 対応する 4 形式

`PathResolver.resolve(path)` は次の順で判定する（`resolve` メソッド本体）。

```yaml
# 1. URL（HTTP/HTTPS）— そのまま返す
src: "https://example.com/images/test.png"

# 2. プロジェクト相対（@/ プレフィックス）
src: "@/images/fg/crosstalk.png"

# 3. 絶対パス（Windows / UNC / Unix）
src: "/home/user/images/test.png"
src: "C:\\Users\\user\\images\\test.png"

# 4. 相対パス（YAML ファイルのディレクトリ基準）
src: "../images/fg/crosstalk.png"
```

判定ロジック（private メソッド）:

| 形式 | 判定 | 解決先 |
| --- | --- | --- |
| URL | `isUrl` = `/^https?:\/\//i` | そのまま返す |
| `@/...` | `path.startsWith("@/")` → `resolveProjectRelative` | `${baseUrl}/<@/ 以降>` |
| 絶対 | `isAbsolutePath`（`[A-Za-z]:[\\/]` / `^\\\\` / 先頭 `/`） → `resolveAbsolute` | `${baseUrl}/api/file?path=<encoded>`（バックエンド経由の想定 API） |
| 相対 | 上記いずれも非該当 → `resolveRelative` | `currentFileDir` と結合（`combinePaths` が `.`/`..` を解決） |

`baseUrl` の既定は `window.location.origin`。`PathResolverOptions`（`currentFilePath` / `projectRoot` / `baseUrl`）で上書きできる。

### 相対パスのカレントディレクトリ

相対パスの基準は **YAML ファイルが置かれているディレクトリ**（`currentFileDir`）。`PathResolverOptions.currentFilePath` から `getDirectory` で算出する。`combinePaths` がセグメントを走査し、`..` で 1 段上がり、`.` を捨て、それ以外を積む（純粋な文字列計算で、ファイルシステムには触れない）。

```
patterns/
├── test1.yaml          → 相対の基準: patterns/
└── subdir/test2.yaml   → 相対の基準: patterns/subdir/
```

- `patterns/test1.yaml` の `src: "../images/fg/x.png"` → `images/fg/x.png`
- `patterns/subdir/test2.yaml` の `src: "../../images/fg/x.png"` → `images/fg/x.png`

### プロジェクトルート検出（`@/`）

`@/` はプロジェクトルート相対を意図する。ただしブラウザは直接ファイルシステムを読めないため、`detectProjectRoot()` は **ブラウザ文脈では `null` を返す**（コメント済み）。実際の `resolveProjectRelative` は `@/` を外して `${baseUrl}/<rest>` を組むだけで、`projectRoot` の有無で挙動は変わらない。`PathResolverOptions.projectRoot`（または `setProjectRoot`）で値を渡せる契約は残しているが、解決結果には現状ほぼ寄与しない。

> 旧版が列挙していた検出優先順位（`--project-root` 引数・`XSG_PROJECT_ROOT` 環境変数・`package.json`/`pyproject.toml`/`.git` 走査）は **Python CLI 前提の設計で、現行 TS 実装には存在しない**。`pathResolver.ts` の JSDoc には検出候補としてコメントが残るが、ブラウザ実装では `null` 固定である。

### 実 YAML 例

`frontend/public/patterns/image-example.yaml` が 3 形式を実演する。

```yaml
nodes:
  - id: img-1
    type: image
    src: "@/images/logo.png"      # プロジェクト相対
    x: 100
    y: 100
    fit: contain
    width: 400
    height: 300
  - id: img-2
    type: image
    src: "https://picsum.photos/400/300"  # URL
    x: calc(50% + 50px)
    y: 200
    scale: 0.5
  - id: img-3
    type: image
    src: "../images/test.png"     # 相対
    x: 50%
    y: 50%
    width: 300
    height: 300
```

---

## 2. 座標の解決（`x`/`y` 等）

### 正本

`frontend/src/lib/pathResolver.ts` の以下の **公開 API**:

- `type CoordinateValue = { type: "absolute"; value } | { type: "percentage"; value } | { type: "calc"; expr }`
- `parseCoordinate(coord: number | string): CoordinateValue`
- `evaluateCoordinate(coord: number | string, containerSize: number): number`

評価の本体 `evaluateCalcExpression` と算術パーサ `evaluateArithmetic` は **モジュール内 private**（export していない）。外から触る入口は `parseCoordinate` / `evaluateCoordinate` の 2 つ。

利用側: `NodeRenderer.tsx` の `evalCoord(coord, containerSize)` が `evaluateCoordinate` を呼び、各ノードの座標をピクセルに落として Canvas 2D で描画する。`containerSize` は描画時の `canvas.width` / `canvas.height`（ウィンドウサイズ）。

### `parseCoordinate`

| 入力 | 結果 |
| --- | --- |
| `number`（例 `100`） | `{ type: "absolute", value: 100 }` |
| `"50%"` | `{ type: "percentage", value: 50 }` |
| `"calc(50% + 10px)"` | `{ type: "calc", expr: "50% + 10px" }` |
| その他文字列 | `parseFloat` で `absolute`（パース不能なら `value: 0`） |

### `evaluateCoordinate`

```
absolute   → value
percentage → (value / 100) * containerSize
calc       → evaluateCalcExpression(expr, containerSize)
```

### `evaluateCalcExpression`（private）

1. 式中の `<数値>%` を `(percentage/100)*containerSize` の px へ正規化（正規表現置換）。
2. `px` 単位を除去。
3. 残った純粋な算術式を `evaluateArithmetic` で評価。

### `evaluateArithmetic`（private・安全な算術パーサ）

**#4 で `eval()` から置き換えた、再帰下降パーサ**。`eval()`／`Function` を使わないことで、敵対的なパターンファイルが座標式経由でコードを注入することを防ぐ。

- トークナイザが受理するのは **数値・`+ - * /`・`(` `)`・空白のみ**。識別子・関数呼び出し・`,`・`;` 等が来たら式全体を棄却する。
- 文法（左結合・標準の優先順位）:
  ```
  expression := term (('+' | '-') term)*
  term       := factor (('*' | '/') factor)*
  factor     := ('+' | '-') factor | '(' expression ')' | number
  ```
- 解析失敗（不正文字・不完全な式・末尾ゴミ）は `0` を返す（旧 `catch { return 0 }` 互換）。
- 解析成功でも結果が非有限（0 除算 → `Infinity`、`0/0` → `NaN`）なら **意図的に `0` に丸める**（旧 eval は Infinity/NaN を素通ししていた点からの安全側の差分）。

スキーマ上の `Coordinate` 制約（`xsg-pattern.schema.json` の `definitions.Coordinate`）は `^(\d+(\.\d+)?%|calc\(.+\))$` または `number`。`%`・`calc()`・数値以外の文字列は弾かれる。

---

## 3. repeat オフセットの計算（補足）

ノードの `repeat`（`grid` / `tile` / CSS 風 `repeat`/`repeat-x`/...）からタイル配置オフセットを生成する純粋計算 `calculateRepeatOffsets` は **`pathResolver.ts` ではなく `frontend/src/components/NodeRenderer.tsx`** にある。座標解決とは別レイヤ（描画時のタイル展開）なので、ここでは存在場所だけ示す。詳細は `web-rendering.md` を参照。

---

## 関連ドキュメント

- スキーマの直交設計: `schema-orthogonality.md`
- Web/Canvas 描画: `web-rendering.md`
- preset/extends 展開: `preset-system.md`

---

## 履歴

当初は Python バックエンド（FastAPI + `uv run python -m app.main` CLI、`PathResolver` クラス、pytest）でパス解決する設計だった。実装は Tauri（Rust コマンド）＋ TypeScript フロントへ移行し、座標・パス解決は `frontend/src/lib/pathResolver.ts` に集約された。本文書はその現行 TS 実装を記述する。旧 Python 設計の詳細は破棄した。
