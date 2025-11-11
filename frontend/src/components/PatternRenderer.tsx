/**
 * Pattern Renderer Component
 *
 * Renders a complete XSG pattern from YAML/JSON data.
 * Supports all node types: background, rect, circle, ellipse, line, directedLine, image, preset
 */

import { useEffect, useState } from "react";
import type { XSGPattern, PatternNode } from "../lib/types";
import PresetRenderer from "./PresetRenderer";
import NodeRenderer from "./NodeRenderer";

export interface PatternRendererProps {
  /** Pattern data (loaded from YAML/JSON) */
  pattern: XSGPattern;
  /** Fallback UI while loading */
  fallback?: React.ReactNode;
}

/**
 * Pattern Renderer
 *
 * Renders all nodes in a pattern definition.
 * Nodes are rendered in order (first = back, last = front).
 */
export default function PatternRenderer({
  pattern,
  fallback = <div className="w-full h-full bg-gray-800" />,
}: PatternRendererProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{fallback}</>;
  }

  const { canvas, nodes } = pattern;

  return (
    <div
      className="relative"
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Render all nodes in order */}
      {nodes.map((node, index) => (
        <NodeLayer
          key={node.id || `node-${index}`}
          node={node}
          canvas={canvas}
          zIndex={index}
        />
      ))}
    </div>
  );
}

/**
 * Node Layer Component
 *
 * Renders a single node as an absolutely positioned layer.
 */
function NodeLayer({
  node,
  canvas,
  zIndex,
}: {
  node: PatternNode;
  canvas: { width: number; height: number };
  zIndex: number;
}) {
  // Common layer styles
  const layerStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex,
    opacity: node.opacity ?? 1,
    filter: node.blur ? `blur(${node.blur}px)` : undefined,
    transform: node.rotate ? `rotate(${node.rotate}deg)` : undefined,
  };

  // Render based on node type
  if (node.type === "background") {
    return (
      <div style={layerStyle}>
        <PresetRenderer
          preset={node.preset}
          params={node.params}
          canvas={canvas}
        />
      </div>
    );
  }

  if (node.type === "preset") {
    return (
      <div style={layerStyle}>
        <PresetRenderer
          preset={node.preset}
          params={node.params}
          canvas={canvas}
        />
      </div>
    );
  }

  // Other node types (rect, circle, etc.)
  return (
    <div style={layerStyle}>
      <NodeRenderer node={node} canvas={canvas} />
    </div>
  );
}
