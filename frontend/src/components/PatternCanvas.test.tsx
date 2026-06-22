/**
 * PatternCanvas — PatternLoad の状態に応じて描画を出し分ける表示層のテスト。
 *
 * Issue #14 で `PatternDisplay.renderContent` から切り出したプレゼンテーショナル
 * コンポーネント。抽出が将来壊れないよう、4分岐の出し分けと nodes の map を固定する。
 * 守る挙動:
 *   - status:loading → "Loading pattern..."
 *   - status:error → "Error: {message}"（message を表示）
 *   - status:ready かつ pattern.nodes 無し → "No pattern data"
 *   - status:ready かつ nodes 配列 → NodeRenderer を node 件数ぶん描画（key=node.id）
 *
 * NodeRenderer の中身（Canvas 2D 描画）は本テストの対象外なので vi.mock でスタブ化し、
 * 「いくつ描画されたか・どの node に対してか」だけを観測する。jsdom に jest-dom
 * セットアップは無いので、素の DOM（screen.getByText / querySelectorAll）で assert する。
 */

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PatternCanvas from "./PatternCanvas";
import type { PatternLoad, PatternNode } from "../lib/types";

// NodeRenderer をスタブ化：受け取った node.id を data 属性に持つマーカー要素にする。
// 分岐レンダリングの検証が目的なので、実描画（canvas）には依存させない。
vi.mock("./NodeRenderer", () => ({
  default: ({ node }: { node: PatternNode }) => (
    <div data-testid="node" data-node-id={node.id} />
  ),
}));

/** rect ノードを id 指定で作る最小ヘルパ。 */
function rectNode(id: string): PatternNode {
  return { id, type: "rect", x: 0, y: 0, width: 10, height: 10 };
}

// ---------------------------------------------------------------------------
describe("PatternCanvas", () => {
  it("loading 状態で 'Loading pattern...' を表示する", () => {
    // --- 仕様: status:loading は読込中文言を出す ---
    const load: PatternLoad = { status: "loading" };
    render(<PatternCanvas load={load} />);
    expect(screen.getByText("Loading pattern...")).toBeTruthy();
  });

  it("error 状態で load.message を表示する", () => {
    // --- 仕様: status:error は "Error: {message}" を出す（message を埋める）---
    const load: PatternLoad = { status: "error", message: "boom happened" };
    render(<PatternCanvas load={load} />);
    // message がそのまま画面に出ていること。
    expect(screen.getByText(/boom happened/)).toBeTruthy();
    expect(screen.getByText(/^Error:/)).toBeTruthy();
  });

  it("ready かつ nodes 無しで 'No pattern data' を表示する", () => {
    // --- 仕様: 読込成功だが pattern.nodes が未定義なら no-data 文言を出す ---
    const load: PatternLoad = {
      status: "ready",
      pattern: { canvas: { width: 100, height: 100 } }, // nodes 無し
    };
    render(<PatternCanvas load={load} />);
    expect(screen.getByText("No pattern data")).toBeTruthy();
    // ノードは1つも描画されない。
    expect(screen.queryAllByTestId("node")).toHaveLength(0);
  });

  it("ready かつ nodes 2件で NodeRenderer を2つ描画する", () => {
    // --- 仕様: status:ready かつ nodes 配列は各 node を NodeRenderer に map する ---
    const nodes = [rectNode("n1"), rectNode("n2")];
    const load: PatternLoad = {
      status: "ready",
      pattern: { nodes },
    };
    render(<PatternCanvas load={load} />);

    const rendered = screen.getAllByTestId("node");
    expect(rendered).toHaveLength(2);
    // 各 node の id がそのまま渡っている（key=node.id で map している証跡）。
    expect(rendered.map((el) => el.getAttribute("data-node-id"))).toEqual([
      "n1",
      "n2",
    ]);
    // no-data / loading 文言は出ない。
    expect(screen.queryByText("No pattern data")).toBeNull();
    expect(screen.queryByText("Loading pattern...")).toBeNull();
  });

  it("ready かつ nodes 空配列は no-data ではなく 0 件描画になる", () => {
    // --- 仕様: nodes が [] のときは「存在する空配列」なので no-data 分岐に入らず、
    //          map 結果が 0 件になる（!load.pattern.nodes は false）---
    const load: PatternLoad = { status: "ready", pattern: { nodes: [] } };
    render(<PatternCanvas load={load} />);
    expect(screen.queryByText("No pattern data")).toBeNull();
    expect(screen.queryAllByTestId("node")).toHaveLength(0);
  });
});
