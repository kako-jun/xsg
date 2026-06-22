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

import { describe, expect, it, vi } from "vitest";
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

/**
 * pathResolver — 座標式評価の敵対的・エッジケーステスト（#4）。
 *
 * eval() を安全な算術パーサに置き換えたことを保証する追加スイート。
 * characterization golden（上）が「正当入力の数値不変」を守るのに対し、
 * こちらは「コード注入・構文崩れ・退化入力を安全側（=0）に倒す」ことを守る。
 *
 * すべて公開 API `evaluateCoordinate(coord, 1280)` 経由で検証する。
 * injection payload は必ず `calc(<payload>)` でラップする。ラップしないと
 * `parseCoordinate` の fallback（parseFloat）で素通りし、パーサに到達せず
 * 無意味なテストになるため。
 */
describe("evaluateCoordinate — 敵対的・エッジケース（#4）", () => {
  // A. injection 拒否 — 期待値はすべて 0、副作用ゼロ。
  // 算術以外の識別子・記号・関数呼び出しはトークナイザが reject し 0 になる。
  describe("A. injection 拒否（code injection を 0 に倒す）", () => {
    it("A1 関数呼び出し alert(1) を実行せず 0 にする", () => {
      expect(evaluateCoordinate("calc(alert(1))", CONTAINER)).toBe(0);
    });

    it("A2 プロトタイプ汚染入口 constructor を 0 にする", () => {
      expect(evaluateCoordinate("calc(constructor)", CONTAINER)).toBe(0);
    });

    it("A3 グローバル参照 globalThis を 0 にする", () => {
      expect(evaluateCoordinate("calc(globalThis)", CONTAINER)).toBe(0);
    });

    it("A4 Node グローバル process を 0 にする", () => {
      expect(evaluateCoordinate("calc(process)", CONTAINER)).toBe(0);
    });

    it("A5 実行コンテキスト this を 0 にする", () => {
      expect(evaluateCoordinate("calc(this)", CONTAINER)).toBe(0);
    });

    it("A6 文の連結 ';' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1;2)", CONTAINER)).toBe(0);
    });

    it("A7 カンマ演算子 ',' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1,2)", CONTAINER)).toBe(0);
    });

    it("A8 バッククォート（テンプレートリテラル混入）を 0 にする", () => {
      // ソース内ではバッククォートを文字列リテラルとして渡す。
      expect(evaluateCoordinate("calc(`1`)", CONTAINER)).toBe(0);
    });

    it("A9 テンプレ展開構文 ${1} を 0 にする", () => {
      // 単一引用符で渡し、JS のテンプレ展開を発生させない。
      expect(evaluateCoordinate("calc(${1})", CONTAINER)).toBe(0);
    });

    it("A10 16進数化せず 'x' を含む 0x10 を 0 にする", () => {
      // '0' は数値、続く 'x' をトークナイザが拒否する。16進解釈はしない。
      expect(evaluateCoordinate("calc(0x10)", CONTAINER)).toBe(0);
    });

    it("A11 指数表記化せず 'e' を含む 1e3 を 0 にする", () => {
      // '1' は数値、続く 'e' を拒否する。指数解釈はしない。
      expect(evaluateCoordinate("calc(1e3)", CONTAINER)).toBe(0);
    });

    it("A12 連続 '*'（べき乗 2**3）を 0 にする", () => {
      expect(evaluateCoordinate("calc(2**3)", CONTAINER)).toBe(0);
    });

    it("A13 論理演算子 '&&' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1 && 1)", CONTAINER)).toBe(0);
    });

    it("A14 配列リテラル [] を 0 にする", () => {
      expect(evaluateCoordinate("calc([])", CONTAINER)).toBe(0);
    });

    it("A14 オブジェクトリテラル {} を 0 にする", () => {
      expect(evaluateCoordinate("calc({})", CONTAINER)).toBe(0);
    });

    it("A15 プロパティアクセス window.location を 0 にする", () => {
      expect(evaluateCoordinate("calc(window.location)", CONTAINER)).toBe(0);
    });

    it("A16 px 除去後に alert(1) が残る pxalert(1) でも安全に 0 にする", () => {
      // /px/g 除去で "alert(1)" になるが、'a' を拒否し評価しない。
      expect(evaluateCoordinate("calc(pxalert(1))", CONTAINER)).toBe(0);
    });
  });

  // B. 構文エラー — 算術トークンのみだが構造が破綻している入力を 0 に倒す。
  describe("B. 構文エラー（壊れた算術式を 0 に倒す）", () => {
    it("B1 末尾演算子 '1 +' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1 +)", CONTAINER)).toBe(0);
    });

    it("B2 先頭の二項演算子 '* 3' を 0 にする", () => {
      expect(evaluateCoordinate("calc(* 3)", CONTAINER)).toBe(0);
    });

    it("B3 演算子の連続 '1 +* 2' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1 +* 2)", CONTAINER)).toBe(0);
    });

    it("B4 閉じ括弧不足 '(1' を 0 にする", () => {
      expect(evaluateCoordinate("calc((1)", CONTAINER)).toBe(0);
    });

    it("B5 余剰の閉じ括弧 '1)' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1))", CONTAINER)).toBe(0);
    });

    it("B6 空の括弧 '()' を 0 にする", () => {
      expect(evaluateCoordinate("calc(())", CONTAINER)).toBe(0);
    });

    it("B7 余剰トークン '1 2' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1 2)", CONTAINER)).toBe(0);
    });

    it("B8 括弧直後の余剰トークン '(1)2' を 0 にする", () => {
      expect(evaluateCoordinate("calc((1)2)", CONTAINER)).toBe(0);
    });

    it("B9 二重小数点 '1.2.3' を 0 にする", () => {
      expect(evaluateCoordinate("calc(1.2.3)", CONTAINER)).toBe(0);
    });

    it("B10 裸のドット '.' を 0 にする", () => {
      expect(evaluateCoordinate("calc(.)", CONTAINER)).toBe(0);
    });

    it("B11 px 正規化後に空文字となる 'px' を 0 にする（空 expr 経路）", () => {
      // "px" は /px/g 除去で "" になり、空トークン列としてパーサが reject する。
      expect(evaluateCoordinate("calc(px)", CONTAINER)).toBe(0);
    });

    it("RC1 空括弧 'calc()' を 0 にする（parseCoordinate の /^calc\\((.+)\\)$/ に阻まれ別経路で 0。B11 の空 expr 経路とは別）", () => {
      // calc() は中身が 0 文字なので calc 正規表現にマッチせず、fallback の
      // parseFloat("calc()") = NaN → 0。パーサには到達しない。
      expect(evaluateCoordinate("calc()", CONTAINER)).toBe(0);
    });
  });

  // C. 数値セマンティクス — 純数 calc が JS 算術と一致する（精度・結合性）。
  describe("C. 数値セマンティクス（JS 算術と一致）", () => {
    it("C1 乗除が加減より先に束縛する 2 + 3 * 4 = 14", () => {
      expect(evaluateCoordinate("calc(2 + 3 * 4)", CONTAINER)).toBe(14);
    });

    it("C2 括弧が優先順位を上書きする (2 + 3) * 4 = 20", () => {
      expect(evaluateCoordinate("calc((2 + 3) * 4)", CONTAINER)).toBe(20);
    });

    it("C3 減算は左結合 10 - 3 - 2 = 5", () => {
      expect(evaluateCoordinate("calc(10 - 3 - 2)", CONTAINER)).toBe(5);
    });

    it("C4 除算は左結合 100 / 10 / 2 = 5", () => {
      expect(evaluateCoordinate("calc(100 / 10 / 2)", CONTAINER)).toBe(5);
    });

    it("C5 単項マイナスの連鎖 - - 5 = 5", () => {
      expect(evaluateCoordinate("calc(- - 5)", CONTAINER)).toBe(5);
    });

    it("C6 二項減算と単項マイナスの混在 3 - -2 = 5", () => {
      expect(evaluateCoordinate("calc(3 - -2)", CONTAINER)).toBe(5);
    });

    it("C7 単項プラス +5 = 5", () => {
      expect(evaluateCoordinate("calc(+5)", CONTAINER)).toBe(5);
    });

    it("C8 深いネスト括弧 (((1 + 2))) = 3", () => {
      expect(evaluateCoordinate("calc((((1 + 2))))", CONTAINER)).toBe(3);
    });

    it("C9 浮動小数の桁を固定 0.1 + 0.2 = 0.30000000000000004", () => {
      expect(evaluateCoordinate("calc(0.1 + 0.2)", CONTAINER)).toBe(
        0.30000000000000004
      );
    });

    it("C10 複数項の優先順位 2 * 3 + 4 * 5 = 26", () => {
      expect(evaluateCoordinate("calc(2 * 3 + 4 * 5)", CONTAINER)).toBe(26);
    });
  });

  // D. 退化入力 — 旧 eval は Infinity/NaN を返したが、安全側で 0 に倒す意図仕様。
  describe("D. 退化入力（旧 eval の Infinity/NaN を安全側で 0 に倒す意図仕様）", () => {
    it("D-1 ゼロ除算 1 / 0 は Infinity でなく 0（安全側）", () => {
      expect(evaluateCoordinate("calc(1 / 0)", CONTAINER)).toBe(0);
    });

    it("D-2 0/0 は NaN でなく 0（安全側）", () => {
      expect(evaluateCoordinate("calc(0 / 0)", CONTAINER)).toBe(0);
    });

    it("D-3 Infinity を含む式 1 / 0 * 0 は NaN でなく 0（安全側）", () => {
      expect(evaluateCoordinate("calc(1 / 0 * 0)", CONTAINER)).toBe(0);
    });
  });

  // E. 数値トークナイザ境界 — 小数省略・末尾ドット・先頭ゼロ・px 融合。
  describe("E. 数値トークナイザ境界", () => {
    it("E1 整数部省略の小数 .5 + .5 = 1", () => {
      expect(evaluateCoordinate("calc(.5 + .5)", CONTAINER)).toBe(1);
    });

    it("E2 末尾ドットの数値 12. + 0 = 12", () => {
      expect(evaluateCoordinate("calc(12. + 0)", CONTAINER)).toBe(12);
    });

    it("E3 先頭ゼロを8進化しない 007 + 1 = 8", () => {
      expect(evaluateCoordinate("calc(007 + 1)", CONTAINER)).toBe(8);
    });

    it("E4 px 融合で 1px2px が 12 に誤接合する既知挙動を固定", () => {
      // /px/g 除去で "1px2px" → "12" になり 12 + 0 = 12。
      // px 部分文字列の融合は現状仕様として pin する。
      expect(evaluateCoordinate("calc(1px2px + 0)", CONTAINER)).toBe(12);
    });
  });

  // F. 文字種混在・i18n — 全角数字・全角記号・絵文字は算術トークンでなく 0。
  describe("F. 文字種混在・i18n（非 ASCII を 0 に倒す）", () => {
    it("F1 全角数字 １２３ を 0 にする", () => {
      expect(evaluateCoordinate("calc(１２３)", CONTAINER)).toBe(0);
    });

    it("F2 全角プラス 1＋2 を 0 にする", () => {
      expect(evaluateCoordinate("calc(1＋2)", CONTAINER)).toBe(0);
    });

    it("F3 絵文字混入 1 + 😀 を 0 にする", () => {
      expect(evaluateCoordinate("calc(1 + 😀)", CONTAINER)).toBe(0);
    });
  });

  // G. 横断的性質 — ログ汚染なし・状態の冪等性。
  describe("G. 横断（ログ汚染なし・冪等）", () => {
    it("G1 injection 評価でエラーログを出さない（console を汚染しない）", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      expect(evaluateCoordinate("calc(alert(1))", CONTAINER)).toBe(0);

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(logSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
      logSpy.mockRestore();
    });

    it("G2 不正入力の直後でも正当入力が正しく評価される（pos/tokens を持ち越さない）", () => {
      // 不正入力で内部状態（pos/tokens）が汚染されない冪等性を確認する。
      expect(evaluateCoordinate("calc(1 2)", CONTAINER)).toBe(0);
      expect(evaluateCoordinate("calc(2 + 3)", CONTAINER)).toBe(5);
    });
  });
});
