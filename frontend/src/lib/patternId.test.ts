/**
 * patternId — characterization golden（#14）。
 *
 * `resolvePatternId` / `parsePatternParams` を `PatternDisplay.tsx` のインライン実装から
 * 純粋関数へ抽出するにあたり、抽出前の挙動をリテラルで固定する回帰スイート。
 * ここが緑であることが「挙動を1文字も変えていない」担保になる（characterization-first）。
 *
 * 方針:
 *   - `resolvePatternId` は全別名（colorbar 系/ebu/arib/gradient/grayscale 系/staircase 系/
 *     checker 系/crosshatch 系/pluge/solid/multiburst 系/convergence 系/pixel-defect 系）と
 *     安全な未知名→その名前自身（ファイル名扱い）、大文字混在（`COLORBAR` 等）を網羅する。
 *   - #23 で未知名フォールバックを `"solid"` 黙殺 → 名前パススルーに変更したが、
 *     パストラバーサル遮断のため passthrough は **安全な id（`[a-z0-9-]`、先頭英数字）**
 *     に限定する。安全な未知名（`colorbar-simple` 等）のみその名前自身（lowercased）に
 *     解決し、不正文字を含む名前（`../../etc/passwd`・`foo/bar`・`a.yaml` 等）と空白のみは
 *     安全な既定 `"solid"` に倒す（意図的な characterization 更新）。
 *   - `parsePatternParams` は `pattern` 除外・複数パラメータ・空・混在クエリを固定する（不変）。
 */

import { describe, expect, it } from "vitest";
import { parsePatternParams, resolvePatternId } from "./patternId";

describe("resolvePatternId — alias → id（characterization）", () => {
  // 抽出元 patternMap の全エントリ（名前 → 期待 id）を網羅する。
  const aliasTable: Array<[string, string]> = [
    ["colorbar", "colorbar"],
    ["colorbars", "colorbar"],
    ["smpte", "colorbar"],
    ["ebu", "ebu-colorbar"],
    ["ebucolorbar", "ebu-colorbar"],
    ["arib", "arib-colorbar"],
    ["aribcolorbar", "arib-colorbar"],
    ["gradient", "gradient"],
    ["grayscale", "grayscale"],
    ["greyscale", "grayscale"],
    ["gray", "grayscale"],
    ["grey", "grayscale"],
    ["staircase", "staircase"],
    ["stairs", "staircase"],
    ["vertical-gradient", "vertical-gradient"],
    ["horizontal-gradient", "horizontal-gradient"],
    ["checker", "checker"],
    ["checkerboard", "checker"],
    ["crosshatch", "crosshatch"],
    ["grid", "crosshatch"],
    ["pluge", "pluge"],
    ["solid", "solid"],
    ["multiburst", "multiburst"],
    ["burst", "multiburst"],
    ["convergence", "convergence"],
    ["align", "convergence"],
    ["pixeldefect", "pixel-defect"],
    ["deadpixel", "pixel-defect"],
    ["dotdefect", "pixel-defect"],
  ];

  it.each(aliasTable)("%s → %s", (name, expected) => {
    expect(resolvePatternId(name)).toBe(expected);
  });

  // #23: 安全な未知名は「ファイル名」として扱い、そのまま pattern id に解決する
  // （旧挙動の `"solid"` 黙殺を廃止）。エイリアス未登録の colorbar-simple 等の
  // パターンファイルへ `?pattern=` で到達できるようにするための意図的な characterization 更新。
  // 実在しない名前は loader が 404 → error 状態にする（黒画面でなく明示エラー）。
  it("安全な未知名はファイル名としてそのまま扱う（solid 黙殺を廃止）", () => {
    expect(resolvePatternId("colorbar-simple")).toBe("colorbar-simple");
    expect(resolvePatternId("multi-layer-example")).toBe("multi-layer-example");
    expect(resolvePatternId("animation-example")).toBe("animation-example");
    expect(resolvePatternId("unknown-xyz")).toBe("unknown-xyz");
    expect(resolvePatternId("nope")).toBe("nope");
    expect(resolvePatternId("colorbarz")).toBe("colorbarz");
    expect(resolvePatternId("xyz123")).toBe("xyz123");
  });

  it("大文字混在の安全な未知名も lowercased passthrough（ファイル名扱い）", () => {
    expect(resolvePatternId("Colorbar-Simple")).toBe("colorbar-simple");
    expect(resolvePatternId("Multi-Layer-Example")).toBe("multi-layer-example");
    expect(resolvePatternId("UNKNOWN-XYZ")).toBe("unknown-xyz");
  });

  // #23 security: passthrough は「安全な id（[a-z0-9-]・先頭英数字）」に限定する。
  // パストラバーサル（`../../etc/passwd`・`foo/bar`）・拡張子注入（`a.yaml`・`a.b`）・
  // 不正文字（空白・記号）を含む名前は passthrough せず安全な既定 `"solid"` に倒す。
  // これがないと resolve 結果が Rust の patterns_dir.join(path) に渡り、patterns
  // ディレクトリ外の任意 .yaml を読まれる（pattern_expander.load_pattern_file）。
  it("パストラバーサル/不正文字は solid に倒す（passthrough 遮断）", () => {
    expect(resolvePatternId("../../etc/passwd")).toBe("solid");
    expect(resolvePatternId("foo/bar")).toBe("solid");
    expect(resolvePatternId("a.yaml")).toBe("solid");
    expect(resolvePatternId("a.b")).toBe("solid"); // ドットも除外＝拡張子注入防止
    expect(resolvePatternId("..")).toBe("solid");
    expect(resolvePatternId("foo bar")).toBe("solid"); // 内部空白
    expect(resolvePatternId("foo\\bar")).toBe("solid"); // バックスラッシュ
    expect(resolvePatternId("-leading-hyphen")).toBe("solid"); // 先頭ハイフンは不可
    expect(resolvePatternId("foo_bar")).toBe("solid"); // アンダースコアは不可
  });

  // 空白のみ（空文字含む）は安全な既定として従来どおり solid を返す（防御ガード）。
  // App.tsx がデフォルト "colorbar" を保証するため実運用では来ない。
  it("空文字・空白のみは安全な既定として solid を返す", () => {
    expect(resolvePatternId("")).toBe("solid");
    expect(resolvePatternId("   ")).toBe("solid");
  });

  it("大文字・混在ケースは toLowerCase 経由で解決される", () => {
    expect(resolvePatternId("COLORBAR")).toBe("colorbar");
    expect(resolvePatternId("ColorBar")).toBe("colorbar");
    expect(resolvePatternId("SMPTE")).toBe("colorbar");
    expect(resolvePatternId("EBU")).toBe("ebu-colorbar");
    expect(resolvePatternId("GrayScale")).toBe("grayscale");
    expect(resolvePatternId("Vertical-Gradient")).toBe("vertical-gradient");
    expect(resolvePatternId("DeadPixel")).toBe("pixel-defect");
  });
});

describe("parsePatternParams — pattern 除外（characterization）", () => {
  it("pattern キーを除外し他を残す", () => {
    expect(parsePatternParams("?pattern=x&foo=1&bar=2")).toEqual({
      foo: "1",
      bar: "2",
    });
  });

  it("pattern のみのクエリは空オブジェクト", () => {
    expect(parsePatternParams("?pattern=colorbar")).toEqual({});
  });

  it("空クエリは空オブジェクト", () => {
    expect(parsePatternParams("")).toEqual({});
    expect(parsePatternParams("?")).toEqual({});
  });

  it("pattern を含まないクエリは全パラメータを残す", () => {
    expect(parsePatternParams("?steps=21&startColor=%23FF0000")).toEqual({
      steps: "21",
      startColor: "#FF0000",
    });
  });

  it("先頭 ? の有無に依らない（URLSearchParams は両方受ける）", () => {
    expect(parsePatternParams("foo=1&bar=2")).toEqual({ foo: "1", bar: "2" });
  });

  it("同名キーは最後の値が勝つ（URLSearchParams.forEach の挙動）", () => {
    // forEach は各値を順に渡し、同じキーは後勝ちで上書きされる。
    expect(parsePatternParams("?foo=1&foo=2&foo=3")).toEqual({ foo: "3" });
  });

  it("値なしパラメータは空文字列になる", () => {
    expect(parsePatternParams("?foo&bar=2")).toEqual({ foo: "", bar: "2" });
  });
});
