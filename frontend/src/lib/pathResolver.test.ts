/**
 * pathResolver — 座標式評価の characterization golden（#4）。
 *
 * これは `evaluateCoordinate()` の「現状挙動」をリテラルで固定するための回帰スイートである。
 * 目的は `evaluateCalcExpression()` 内部の `eval()` を安全な算術評価器に置き換える前後で
 * 数値出力が一切変わらないことを機械検証すること（characterization-first）。
 *
 * 方針:
 *   - 非公開の `evaluateCalcExpression` を export して直接叩くのではなく、公開 API
 *     `evaluateCoordinate(coord, containerSize)` 経由でのみ検証する。
 *   - golden 値は eval() ベースの現行実装の実出力に厳密に合わせる（浮動小数の桁も含む）。
 *   - 代表 containerSize として 1280 を用いる（パーセント計算の基準）。
 *
 * ここで扱うのは「正当な入力」の golden のみ。injection 拒否・敵対的入力・パーサの
 * エッジケース（英字/関数呼び出し/`;`/深いネスト/ゼロ除算/演算子の連続/末尾演算子 等）の
 * 網羅は後続の別スイートが担当する。
 */

import { describe, expect, it } from "vitest";
import { evaluateCoordinate } from "./pathResolver";

// パーセント計算の基準となるコンテナサイズ。
const CONTAINER = 1280;

describe("evaluateCoordinate — characterization golden (#4)", () => {
  describe("absolute（number 入力）", () => {
    it("整数の絶対値はそのまま返す", () => {
      expect(evaluateCoordinate(100, CONTAINER)).toBe(100);
    });

    it("0 はそのまま返す", () => {
      expect(evaluateCoordinate(0, CONTAINER)).toBe(0);
    });

    it("小数の絶対値はそのまま返す", () => {
      expect(evaluateCoordinate(1920.5, CONTAINER)).toBe(1920.5);
    });
  });

  describe("percentage（'N%' 入力）", () => {
    it("0% は 0", () => {
      expect(evaluateCoordinate("0%", CONTAINER)).toBe(0);
    });

    it("50% は containerSize の半分", () => {
      expect(evaluateCoordinate("50%", CONTAINER)).toBe(640);
    });

    it("100% は containerSize そのもの", () => {
      expect(evaluateCoordinate("100%", CONTAINER)).toBe(1280);
    });

    it("小数パーセント 33.3% は浮動小数のまま（桁を固定）", () => {
      expect(evaluateCoordinate("33.3%", CONTAINER)).toBe(426.23999999999995);
    });
  });

  describe("calc（四則演算）", () => {
    it("calc(50% + 10px) = 640 + 10", () => {
      expect(evaluateCoordinate("calc(50% + 10px)", CONTAINER)).toBe(650);
    });

    it("calc(50% - 10px) = 640 - 10", () => {
      expect(evaluateCoordinate("calc(50% - 10px)", CONTAINER)).toBe(630);
    });

    it("calc(50% * 2) = 640 * 2", () => {
      expect(evaluateCoordinate("calc(50% * 2)", CONTAINER)).toBe(1280);
    });

    it("calc(100% / 2) = 1280 / 2", () => {
      expect(evaluateCoordinate("calc(100% / 2)", CONTAINER)).toBe(640);
    });
  });

  describe("calc（ネスト括弧）", () => {
    it("calc((50% + 10px) / 2) = (640 + 10) / 2", () => {
      expect(evaluateCoordinate("calc((50% + 10px) / 2)", CONTAINER)).toBe(325);
    });
  });

  describe("calc（小数混在）", () => {
    it("calc(33.3% + 0.5px) は浮動小数のまま（桁を固定）", () => {
      expect(evaluateCoordinate("calc(33.3% + 0.5px)", CONTAINER)).toBe(
        426.73999999999995
      );
    });
  });

  describe("calc（負値になるケース）", () => {
    it("calc(10px - 50%) = 10 - 640 = -630", () => {
      expect(evaluateCoordinate("calc(10px - 50%)", CONTAINER)).toBe(-630);
    });
  });

  describe("フォールバック（parseCoordinate が absolute 0 になる経路）", () => {
    it("数値化できない文字列は 0", () => {
      expect(evaluateCoordinate("abc", CONTAINER)).toBe(0);
    });

    it("空文字列は 0", () => {
      expect(evaluateCoordinate("", CONTAINER)).toBe(0);
    });
  });
});
