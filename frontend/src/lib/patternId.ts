/**
 * patternId — パターン名解決とクエリパラメータ解析の純粋ロジック。
 *
 * もとは `PatternDisplay.tsx` の読込 useEffect 内にインラインで埋まっていた2つの
 * 純粋関数を、テスト可能な単位として切り出したもの（規律3: 計算ロジックの隔離）。
 * 別名テーブル・`toLowerCase()`・fallback `"solid"`・`pattern` キー除外の挙動は
 * 抽出元と1文字も変えていない（characterization テストが固定する）。
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
 * 小文字化したうえで {@link PATTERN_MAP} を引き、未知名は `"solid"` に落とす。
 * 抽出元: `patternMap[pattern.toLowerCase()] || "solid"`。
 */
export function resolvePatternId(name: string): string {
  return PATTERN_MAP[name.toLowerCase()] || "solid";
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
