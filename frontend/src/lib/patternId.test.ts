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
 *     未知名→solid、大文字混在（`COLORBAR` 等）を網羅する。
 *   - `parsePatternParams` は `pattern` 除外・複数パラメータ・空・混在クエリを固定する。
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

  it("未知名は solid に落ちる", () => {
    expect(resolvePatternId("nope")).toBe("solid");
    expect(resolvePatternId("")).toBe("solid");
    expect(resolvePatternId("colorbarz")).toBe("solid");
    expect(resolvePatternId("xyz123")).toBe("solid");
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
