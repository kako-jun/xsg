# プリセットシステム

> ⚠️ **この文書は現行実装（YAML プリセット + TypeScript 展開）に合わせて 2026-06 に改訂した。**
> 旧版は存在しない設計（プリセット＝React `.tsx` コンポーネント、`backend/app/presets.py` の FastAPI 自動検出、`GET /api/presets`、`presets/` ディレクトリ）を前提に書かれていたが、その設計は破棄された。現行のプリセットは **YAML パターンファイル**であり、`type: background | preset` ノードから参照され、TypeScript（`frontend/src/lib/presetExpander.ts`）が展開する。`.tsx` プリセットも presets API も存在しない。

---

## 設計の要点

XSG に「組み込みプリセット」と「ユーザープリセット」の区別はない。**すべてのプリセットは普通の YAML パターンファイル**であり、リポジトリに同梱されているか否かの差しかない。

- プリセットの実体: `frontend/public/patterns/*.yaml`（web が `fetch`）／ リポジトリルートの `patterns/*.yaml`（Tauri/Rust が読む）。両者は同じファイル群。
- あるパターンが別パターンを「プリセット」として使うには、`{ type: background | preset, preset: "<id>", params: {...} }` ノードを置く。
- そのノードは描画時に **参照先パターンの nodes へ in-place 展開**される（`expandPresets`）。

`.tsx` コンポーネント・FastAPI 自動検出・Hot Reload する React プリセットは、いずれも現行実装に存在しない。

---

## プリセット参照ノード

`frontend/src/lib/types.ts` に 2 つの参照ノード型がある（中身は同形）。

```ts
interface BackgroundNode extends BaseNode {
  type: "background";
  preset: string;                      // 参照先パターン id
  params?: Record<string, unknown>;    // プリセット固有パラメータ
}
interface PresetNode extends BaseNode {
  type: "preset";
  preset: string;
  params?: Record<string, unknown>;
}
```

スキーマ正本は `xsg-pattern.schema.json` の `BackgroundNode` / `PresetNode`（どちらも `required: ["preset"]`）。`type` が `background` か `preset` かの違いだけで、展開ロジックは同一に扱う（背面に置きたいものを `background`、前景に重ねたいものを `preset` と書き分ける慣習）。

### 実 YAML 例

`frontend/public/patterns/colorbar-simple.yaml` — `colorbar` プリセットを背景に敷くだけのパターン:

```yaml
canvas:
  width: 1920
  height: 1080
nodes:
  - id: bg-colorbar
    type: background
    preset: colorbar        # → colorbar.yaml の nodes を借りる
```

参照先 `colorbar.yaml` はプリミティブ（`rect` 群）で本体を描く基底パターン:

```yaml
canvas: { width: 1920, height: 1080 }
nodes:
  - id: bar-white
    type: rect
    x: 0
    y: 0
    width: 274.3
    height: 1080
    fill: "#C0C0C0"
  # ... 残りの色バー
```

`frontend/public/patterns/checker-with-dot.yaml` — 背景プリセット ＋ 前景の生ノードを重ねる:

```yaml
nodes:
  - id: bg-checker
    type: background
    preset: checker
    params:
      size: 50
  - id: defect-1
    type: circle
    x: 50%
    y: 50%
    diameter: 2
    fill: "#FF0000"
```

---

## ロードと展開のパイプライン

### ① パターン取得 `get_pattern`（extends 継承 ＋ `{{param}}` 置換）

- **Tauri**: Rust コマンド `get_pattern(pattern_id, params)`（`frontend/src-tauri/src/lib.rs` → `pattern_loader::load_pattern_with_params` → `pattern_expander.rs`）。`resolve_extends` でテンプレート継承、`expand` で `{{param}}` 置換を行う。
- **Web**: `frontend/src/lib/tauriCompat.ts` の `loadPatternFromWeb`。`/patterns/<id>.yaml` を `fetch` → `paramExpander.ts` の `resolveExtends`（基底 YAML を再帰ロードしてマージ）→ `expandParams`（`{{param}}` 置換）。
- 両モードの入口は `safeInvoke("get_pattern", { patternId, params })`（`isTauri()` で分岐）。

この段階では `extends` と `{{param}}` は解決済みだが、**`background`/`preset` ノードはまだ残っている**。

#### `extends`（テンプレート継承）

子パターンの `extends: <base>.yaml` で基底パターンを継承する。`params`/`canvas`/`nodes` を子が上書きマージする（params はキー単位でマージ、canvas/nodes は子があれば子で置換）。

実例: `gradient.yaml`（基底） → `staircase.yaml` / `horizontal-gradient.yaml` / `vertical-gradient.yaml` が `extends: gradient.yaml`、`grayscale.yaml` が `extends: horizontal-gradient.yaml`。

```yaml
# staircase.yaml
extends: gradient.yaml
params:
  steps: { type: number, default: 21 }
  direction: { type: string, default: "horizontal" }
```

> ⚠️ **既知のスキーマ欠落**: `extends` はコード（TS `resolveExtends` / Rust `resolve_extends`）では実装されているが、`xsg-pattern.schema.json` の top-level プロパティには宣言されていない（`required: ["canvas", "nodes"]` のみ）。`extends` を使うファイルはスキーマ検証を通らない可能性がある。スキーマへの `extends` 追加は別 Issue 候補。

### ② プリセット展開 `expandPresets`（#23 新設）

`frontend/src/lib/presetExpander.ts` の `expandPresets(pattern, getPattern, depth?)`。`pattern.nodes` を走査し:

- `type === "background" | "preset"` のノードは、`node.preset`（参照先 id）を `getPattern(presetId, params)` で取得し、**再帰展開**した上で、その nodes を **同じ位置に差し込む**（z 順保持＝`background` を先頭に書けば背面に来る）。
- それ以外のノードはそのまま残す。

設計上の不変条件:

- **id の名前空間化**: 展開した子ノードの `id` を `${hostId}/${childId}`（host に id が無ければ `preset-${index}/${childId}`）に書き換える。同じプリセットを複数回参照しても、プリセット内 id が兄弟と衝突しても、展開後 id が一意になり、描画側の React `key={node.id}` の重複を防ぐ。id 以外（type/座標/fill/z 順）は変えない。
- **params の非伝播**: ユーザのクエリ params（`?pattern=...&size=...`）は **base パターンにのみ**適用され、プリセット参照の子には伝播しない。子プリセットは YAML 記述の `node.params` のみで解決される（プリセット params は作者固定）。`params` は `stringifyParams` で `Record<string,string>` 化して `get_pattern` に渡す。
- **黒落ち防止**: 参照不能（`preset` 欠落・取得失敗・深度超過）な展開ノードは `console.warn` して **drop** し、他ノードの描画は継続する。`MAX_DEPTH = 16` で自己参照・相互参照の無限ループを防ぐ。
- **入力不変**: 入力 `pattern` を破壊せず `{ ...pattern, nodes }` で新オブジェクトを返す（規律2: 定義 vs 状態の分離）。

### ③ 結線 `loadResolvedPattern`（両モード共通）

`frontend/src/lib/tauriCompat.ts` の `loadResolvedPattern(patternId, params)` が ① と ② を繋ぐ:

```ts
const base = await safeInvoke<XSGPattern>("get_pattern", { patternId, params });
return expandPresets(base, (id, p) =>
  safeInvoke<XSGPattern>("get_pattern", { patternId: id, params: p })
);
```

`getPattern` として `safeInvoke("get_pattern", ...)` 自身を渡すので、参照先パターン（さらにその extends/param）も **モード適切に**（Tauri=Rust / web=fetch）解決される。描画サイトはこの 1 関数を呼ぶだけでよい。

> **規律3（二重実装を作らない）**: プリセット展開ロジックは TS の `expandPresets` **1 箇所だけ**にある。Rust 側（`pattern_expander.rs`）には extends/param 展開はあるが **プリセット展開は無い**。両モードとも展開は TS 経由で行われる。

---

## プリセット id の解決とセキュリティ

`frontend/src/lib/patternId.ts` の `resolvePatternId(name)` がパターン名 → id を解決する。

- エイリアステーブル `PATTERN_MAP`（`colorbars`→`colorbar`、`smpte`→`colorbar`、`grey`→`grayscale` 等）で canonical id へ。
- 未知名は **安全な id（`SAFE_PATTERN_ID = /^[a-z0-9][a-z0-9-]*$/`）と確認できた場合のみ** passthrough（`colorbar-simple` のように `PATTERN_MAP` 未登録でもファイルが在ればロードできる）。
- `/`・`\`・`.`・`..`・空白・その他不正文字を含む名前は **`"solid"` に倒す**。これにより Rust `pattern_expander.load_pattern_file` の `patterns_dir.join(path)` 経由でディレクトリ外の任意 `.yaml` を読まれる事故（パストラバーサル・拡張子注入）を遮断する。
- `parsePatternParams(search)` がクエリ文字列から `pattern` キーを除いた params を集める。

---

## 同梱パターン一覧

`frontend/public/patterns/` ＝ ルート `patterns/` の YAML 群（同じ実体）。例:

```
colorbar.yaml / colorbar-simple.yaml   # SMPTE カラーバー（基底 / プリセット参照版）
ebu-colorbar.yaml / arib-colorbar.yaml
grayscale.yaml / staircase.yaml / gradient.yaml
horizontal-gradient.yaml / vertical-gradient.yaml
checker.yaml / checker-with-dot.yaml / crosshatch.yaml
convergence.yaml / pluge.yaml / multiburst.yaml / pixel-defect.yaml
solid.yaml / image-example.yaml / ...
```

ユーザは YAML を自由に追加・編集・削除でき、`type: preset`/`background` から相互参照できる。「組み込み」と「カスタム」を実装側は区別しない。

---

## 関連ドキュメント

- スキーマ正本: `../../xsg-pattern.schema.json`、設計は `schema-orthogonality.md`
- 座標・パス解決: `path-resolution.md`
- Web/Canvas 描画: `web-rendering.md`
- 拡張方法: `extensibility.md`

---

## 履歴

当初は「プリセット＝React `.tsx` コンポーネント」とし、`backend/app/presets.py`（FastAPI）が `presets/*.tsx` を自動検出して `GET /api/presets` で配る設計を構想していた。実装は Tauri + YAML + TypeScript へ移行し、プリセットは普通の YAML パターンファイル、参照は `type: background|preset` ノード、展開は TS の `expandPresets`（#23）に集約された。本文書はその現行実装を記述する。旧 `.tsx`/FastAPI 設計の詳細は破棄した。
