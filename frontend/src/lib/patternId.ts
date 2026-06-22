/**
 * patternId — パターン名解決とクエリパラメータ解析の純粋ロジック。
 *
 * もとは `PatternDisplay.tsx` の読込 useEffect 内にインラインで埋まっていた2つの
 * 純粋関数を、テスト可能な単位として切り出したもの（規律3: 計算ロジックの隔離）。
 * 別名テーブル・`toLowerCase()`・`pattern` キー除外の挙動は抽出元と同じだが、
 * `resolvePatternId` の未知名フォールバックは `"solid"` 黙殺を廃止し、**安全な id**
 * と確認できた名前のみ pattern id として返すよう変更した（#23: エイリアス未登録の
 * パターンファイルが到達不能になるバグの修正＋パストラバーサル遮断）。詳細は当該
 * 関数の JSDoc を参照。
 */

/**
 * 安全な pattern id（＝そのまま `.yaml` ファイル名にできる文字）の集合。
 *
 * 先頭は英数字、以降は英数字とハイフンのみ。`/`・`\`・`.`・`..`・空白・その他記号を
 * 含む名前は弾く（パストラバーサル・拡張子注入・予期せぬパス注入の遮断）。
 */
const SAFE_PATTERN_ID = /^[a-z0-9][a-z0-9-]*$/;

/**
 * よく使われるパターン名（別名含む）→ パターン ID の対応表。
 *
 * 抽出元（`PatternDisplay.tsx`）のインライン定義をそのまま移したもの。
 * 並び・別名・値はいずれも変更しない。
 */
const PATTERN_MAP: Record<string, string> = {
  colorbar: "colorbar",
  colorbars: "colorbar",
  smpte: "colorbar",
  ebu: "ebu-colorbar",
  ebucolorbar: "ebu-colorbar",
  arib: "arib-colorbar",
  aribcolorbar: "arib-colorbar",
  gradient: "gradient",
  grayscale: "grayscale",
  greyscale: "grayscale",
  gray: "grayscale",
  grey: "grayscale",
  staircase: "staircase",
  stairs: "staircase",
  "vertical-gradient": "vertical-gradient",
  "horizontal-gradient": "horizontal-gradient",
  checker: "checker",
  checkerboard: "checker",
  crosshatch: "crosshatch",
  grid: "crosshatch",
  pluge: "pluge",
  solid: "solid",
  multiburst: "multiburst",
  burst: "multiburst",
  convergence: "convergence",
  align: "convergence",
  pixeldefect: "pixel-defect",
  deadpixel: "pixel-defect",
  dotdefect: "pixel-defect",
};

/**
 * パターン名（別名可・大文字小文字を問わない）をパターン ID に解決する。
 *
 * `name.trim()` で前後空白を正規化し、小文字化したうえで {@link PATTERN_MAP} を
 * 引く。既知のニックネームは canonical id へ解決する（不変）。
 *
 * 未知名は、**安全な id（{@link SAFE_PATTERN_ID} = `[a-z0-9-]`、先頭は英数字）だと
 * 確認できた場合のみ**、その名前をファイル名として扱い passthrough する。
 * `colorbar-simple` のように {@link PATTERN_MAP} 未登録でも
 * `/patterns/<name>.yaml`（web）/ root `patterns/`（Tauri）から loader がロードできる。
 * 実在しない名前は loader が 404 → `error` 状態にする（旧挙動の「黙って solid を
 * 出す」黒画面より、明示エラーの方が良 UX）。
 *
 * 一方、`/`・`\`・`.`・`..`・空白・その他の不正文字を含む名前（例
 * `../../etc/passwd`・`foo/bar`・`a.yaml`）は **passthrough せず安全な既定 `"solid"`
 * に倒す**。これにより、解決結果が Tauri 側 Rust `pattern_expander.load_pattern_file`
 * の `patterns_dir.join(path)` に渡って patterns ディレクトリ外の任意 `.yaml` を
 * 読まれる事故（パストラバーサル・拡張子注入）を遮断する。
 *
 * 空白のみ（または空文字）も安全な既定として従来どおり `"solid"` を返す。
 * App.tsx がデフォルト `"colorbar"` を保証するため空文字は実運用で来ないが、防御的に温存する。
 */
export function resolvePatternId(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === "") {
    return "solid";
  }
  // 既知エイリアスは canonical id へ（安全集合のみを値に持つので無条件で許可）。
  const mapped = PATTERN_MAP[normalized];
  if (mapped !== undefined) {
    return mapped;
  }
  // 未知名は「安全な id」だと確認できた場合だけファイル名として passthrough。
  // 不正文字（パストラバーサル・拡張子注入）を含むものは solid に倒す。
  return SAFE_PATTERN_ID.test(normalized) ? normalized : "solid";
}

/**
 * クエリ文字列から `pattern` キーを除いた全パラメータを `Record<string,string>` にする。
 *
 * 抽出元は `new URLSearchParams(window.location.search)` を回して `pattern` 以外を
 * 集める処理。ここでは検索文字列を引数で受け取り純粋関数化しているが、走査・除外規則・
 * 同名キーの最終勝ち（`URLSearchParams.forEach` の挙動）はそのまま維持する。
 */
export function parsePatternParams(search: string): Record<string, string> {
  const searchParams = new URLSearchParams(search);
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "pattern") {
      // Exclude 'pattern' itself
      params[key] = value;
    }
  });
  return params;
}
