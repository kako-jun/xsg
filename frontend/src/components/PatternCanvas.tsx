/**
 * PatternCanvas — `PatternLoad` の状態に応じて描画内容を出し分ける表示専用コンポーネント。
 *
 * `PatternDisplay` にあった `renderContent`（loading / error / no-data / nodes の分岐）を
 * そのまま兄弟のプレゼンテーショナルコンポーネントへ切り出したもの（規律3: 責務分離）。
 * className・文言・`NodeRenderer` への map（`node.id` を key にする）は抽出元と一致させる。
 * 状態を持たず props の `load` だけで描画が決まる純粋な表示層。
 */

import NodeRenderer from "./NodeRenderer";
import type { PatternLoad } from "../lib/types";

export interface PatternCanvasProps {
  load: PatternLoad;
}

export default function PatternCanvas({ load }: PatternCanvasProps) {
  if (load.status === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        Loading pattern...
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        Error: {load.message}
      </div>
    );
  }

  if (!load.pattern.nodes) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        No pattern data
      </div>
    );
  }

  return (
    <>
      {load.pattern.nodes.map((node) => (
        <NodeRenderer key={node.id} node={node} />
      ))}
    </>
  );
}
