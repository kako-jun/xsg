/**
 * patternId — パターン名解決とクエリパラメータ解析の純粋ロジック。
 *
 * もとは `PatternDisplay.tsx` の読込 useEffect 内にインラインで埋まっていた2つの
 * 純粋関数を、テスト可能な単位として切り出したもの（規律3: 計算ロジックの隔離）。
 * 別名テーブル・`toLowerCase()`・`pattern` キー除外の挙動は抽出元と同じだが、
 * `resolvePatternId` の未知名フォールバックは `"solid"` 黙殺を廃止し、名前を
 * pattern id としてそのまま返すよう変更した（#23: エイリアス未登録のパターンファイル
 * が到達不能になるバグの修正）。詳細は当該関数の JSDoc を参照。
 */

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
 * 小文字化したうえで {@link PATTERN_MAP} を引き、既知のニックネームは canonical id へ
 * 解決する。未知名は `"solid"` に黙殺せず、小文字化した名前を pattern id として
 * そのまま扱う（ファイル名直指定を許可）。`colorbar-simple` のように
 * {@link PATTERN_MAP} 未登録でも `/patterns/<name>.yaml`（web）/ root `patterns/`（Tauri）
 * から loader がロードできる。実在しない名前は loader が 404 → `error` 状態にする
 * （旧挙動の「黙って solid を出す」黒画面より、明示エラーの方が良 UX）。
 *
 * 空白のみ（または空文字）は安全な既定として従来どおり `"solid"` を返す。
 * App.tsx がデフォルト `"colorbar"` を保証するため空文字は実運用で来ないが、防御的に温存する。
 */
export function resolvePatternId(name: string): string {
  const normalized = name.trim().toLowerCase();
  if (normalized === "") {
    return "solid";
  }
  return PATTERN_MAP[normalized] ?? normalized;
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
