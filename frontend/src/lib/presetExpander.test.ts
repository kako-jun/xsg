/**
 * presetExpander — preset/background ノード展開の回帰スイート（Issue #23）。
 *
 * `colorbar-simple.yaml` のような `type: background, preset: colorbar` 参照ノードを
 * 参照先パターンの nodes に in-place 展開する純粋寄り関数 `expandPresets` の挙動を
 * 固定する。守る仕様:
 *   - background/preset ノードが getPattern の戻り nodes に置換される
 *   - nested preset（参照先がさらに preset を持つ）を再帰展開する
 *   - node.params が getPattern の第2引数へ文字列化して渡る
 *   - z 順: 展開 nodes は元の位置に in-place 展開され前後関係が保たれる
 *   - 取得失敗（getPattern reject）は warn して drop、throw しない・他ノードは残る
 *   - preset 欠落（node.preset 無し）は warn して drop
 *   - 循環ガード: 自己参照 preset は depth 上限で打ち切り無限ループしない
 *   - 非 preset ノード（rect 等）はそのまま不変
 *
 * getPattern は mock し、console.warn は spy で握って出力を汚さない。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expandPresets } from "./presetExpander";
import type { PatternNode, XSGPattern } from "./types";

// ---------------------------------------------------------------------------
// テスト用ヘルパ
// ---------------------------------------------------------------------------

/** 任意 fill の rect ノード（プリミティブ本体の代用）。 */
function rect(id: string, fill: string): PatternNode {
  return {
    id,
    type: "rect",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    fill,
  } as PatternNode;
}

/** background 参照ノード（colorbar-simple の bg-colorbar 相当）。 */
function background(
  id: string,
  preset: string,
  params?: Record<string, unknown>
): PatternNode {
  return { id, type: "background", preset, params } as PatternNode;
}

/** preset 参照ノード。 */
function preset(
  id: string,
  presetId: string,
  params?: Record<string, unknown>
): PatternNode {
  return { id, type: "preset", preset: presetId, params } as PatternNode;
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // 出力汚染を避けつつ warn 呼び出しを検証できるよう握る。
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
describe("expandPresets", () => {
  it("background ノードが参照先パターンの nodes に展開される", async () => {
    // --- 仕様: {type:background, preset:colorbar} → colorbar の rect 群 ---
    const colorbarNodes = [
      rect("bar-white", "#C0C0C0"),
      rect("bar-yellow", "#C0C000"),
    ];
    const getPattern = vi.fn(
      async (): Promise<XSGPattern> => ({
        canvas: { width: 1920, height: 1080 },
        nodes: colorbarNodes,
      })
    );

    const input: XSGPattern = {
      canvas: { width: 1920, height: 1080 },
      nodes: [background("bg-colorbar", "colorbar")],
    };

    const result = await expandPresets(input, getPattern);

    // 参照先の rect 群がそのまま nodes になる。
    expect(result.nodes).toEqual(colorbarNodes);
    // canvas など他フィールドは保持される。
    expect(result.canvas).toEqual({ width: 1920, height: 1080 });
    // getPattern は参照先 id と空 params で1回呼ばれる。
    expect(getPattern).toHaveBeenCalledTimes(1);
    expect(getPattern).toHaveBeenCalledWith("colorbar", {});
  });

  it("preset ノードも同様に展開される", async () => {
    const inner = [rect("a", "#fff")];
    const getPattern = vi.fn(
      async (): Promise<XSGPattern> => ({ nodes: inner })
    );
    const input: XSGPattern = { nodes: [preset("p", "some-preset")] };

    const result = await expandPresets(input, getPattern);

    expect(result.nodes).toEqual(inner);
    expect(getPattern).toHaveBeenCalledWith("some-preset", {});
  });

  it("nested preset を再帰展開する", async () => {
    // outer は preset:mid を参照、mid はさらに preset:leaf を参照、leaf が rect。
    const leafNodes = [rect("leaf-rect", "#abc")];
    const getPattern = vi.fn(async (id: string): Promise<XSGPattern> => {
      if (id === "mid") {
        return { nodes: [preset("mid-ref", "leaf")] };
      }
      if (id === "leaf") {
        return { nodes: leafNodes };
      }
      throw new Error(`unexpected id: ${id}`);
    });

    const input: XSGPattern = { nodes: [preset("outer-ref", "mid")] };
    const result = await expandPresets(input, getPattern);

    // 2段深く展開され、最終的に leaf の rect だけが残る。
    expect(result.nodes).toEqual(leafNodes);
    expect(getPattern).toHaveBeenCalledWith("mid", {});
    expect(getPattern).toHaveBeenCalledWith("leaf", {});
  });

  it("node.params を文字列化して getPattern の第2引数に渡す", async () => {
    const getPattern = vi.fn(async (): Promise<XSGPattern> => ({ nodes: [] }));
    const input: XSGPattern = {
      nodes: [
        background("bg", "colorbar", { level: 75, hue: "red", on: true }),
      ],
    };

    await expandPresets(input, getPattern);

    // 値はすべて String() 化されて渡る（get_pattern の user_params は文字列前提）。
    expect(getPattern).toHaveBeenCalledWith("colorbar", {
      level: "75",
      hue: "red",
      on: "true",
    });
  });

  it("z 順: background が先頭なら展開 nodes が先頭（背面）に来て後続ノードが続く", async () => {
    // background(背景) を先頭に、その後に通常 rect(前景) を置く。
    const bgNodes = [rect("bg-1", "#111"), rect("bg-2", "#222")];
    const getPattern = vi.fn(
      async (): Promise<XSGPattern> => ({ nodes: bgNodes })
    );

    const fg = rect("fg", "#fff");
    const input: XSGPattern = {
      nodes: [background("bg", "colorbar"), fg],
    };

    const result = await expandPresets(input, getPattern);

    // 展開 nodes が in-place（先頭位置）に並び、その後に前景 rect が続く。
    expect(result.nodes).toEqual([...bgNodes, fg]);
  });

  it("取得失敗（getPattern reject）は warn して drop、throw せず他ノードは残る", async () => {
    const fg = rect("fg", "#fff");
    const getPattern = vi.fn(async (): Promise<XSGPattern> => {
      throw new Error("not found");
    });
    const input: XSGPattern = {
      nodes: [background("bad", "missing"), fg],
    };

    // throw せず解決する。
    const result = await expandPresets(input, getPattern);

    // 失敗 preset は消え、他ノードは残る。
    expect(result.nodes).toEqual([fg]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("preset 欠落（node.preset 無し）は warn して drop", async () => {
    const fg = rect("fg", "#fff");
    const getPattern = vi.fn(async (): Promise<XSGPattern> => ({ nodes: [] }));
    const input: XSGPattern = {
      // preset プロパティを持たない background ノード。
      nodes: [{ id: "no-ref", type: "background" } as PatternNode, fg],
    };

    const result = await expandPresets(input, getPattern);

    expect(result.nodes).toEqual([fg]);
    // 参照先が無いので getPattern は呼ばれない。
    expect(getPattern).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("循環ガード: 自己参照 preset は depth 上限で打ち切り無限ループしない", async () => {
    // mock が常に自分（同じ preset 参照）を返す → 再帰が depth 上限で止まる。
    const getPattern = vi.fn(
      async (id: string): Promise<XSGPattern> => ({
        nodes: [preset("self", id)],
      })
    );
    const input: XSGPattern = { nodes: [preset("root", "loop")] };

    const result = await expandPresets(input, getPattern);

    // 最終的に展開できるノードは無くなる（depth 超過で drop）。
    expect(result.nodes).toEqual([]);
    // 上限（MAX_DEPTH=16）回前後で打ち切られ、呼び出し回数は有限。
    expect(getPattern.mock.calls.length).toBeLessThanOrEqual(17);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("非 preset ノード（rect 等）はそのまま不変", async () => {
    const getPattern = vi.fn(async (): Promise<XSGPattern> => ({ nodes: [] }));
    const r1 = rect("r1", "#aaa");
    const r2 = rect("r2", "#bbb");
    const input: XSGPattern = { nodes: [r1, r2] };

    const result = await expandPresets(input, getPattern);

    // 何も置換されず順序も同じ。getPattern は呼ばれない。
    expect(result.nodes).toEqual([r1, r2]);
    expect(getPattern).not.toHaveBeenCalled();
  });

  it("nodes が未定義/空ならそのまま返す（同一参照）", async () => {
    const getPattern = vi.fn(async (): Promise<XSGPattern> => ({ nodes: [] }));

    const emptyNodes: XSGPattern = {
      canvas: { width: 10, height: 10 },
      nodes: [],
    };
    expect(await expandPresets(emptyNodes, getPattern)).toBe(emptyNodes);

    const noNodes: XSGPattern = { canvas: { width: 10, height: 10 } };
    expect(await expandPresets(noNodes, getPattern)).toBe(noNodes);

    expect(getPattern).not.toHaveBeenCalled();
  });
});
