/**
 * Node Renderer Component
 *
 * Renders individual pattern nodes (rect, circle, ellipse, line, directedLine, image).
 */

import { useEffect, useRef } from "react";
import type {
  PatternNode,
  RectNode,
  CircleNode,
  EllipseNode,
  LineNode,
  DirectedLineNode,
  ImageNode,
  GradientNode,
  Coordinate,
  Repeat,
} from "../lib/types";
import { evaluateCoordinate } from "../lib/pathResolver";

export interface NodeRendererProps {
  node: PatternNode;
}

/**
 * Node Renderer
 *
 * Renders a single node using Canvas 2D API.
 */
export default function NodeRenderer({ node }: NodeRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const renderPattern = () => {
      const ctx = canvasEl.getContext("2d");
      if (!ctx) return;

      // Set canvas size to current window size
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

      // Render based on node type
      switch (node.type) {
        case "rect":
          renderRect(ctx, node as RectNode, canvasEl);
          break;
        case "circle":
          renderCircle(ctx, node as CircleNode, canvasEl);
          break;
        case "ellipse":
          renderEllipse(ctx, node as EllipseNode, canvasEl);
          break;
        case "line":
          renderLine(ctx, node as LineNode, canvasEl);
          break;
        case "directedLine":
          renderDirectedLine(ctx, node as DirectedLineNode, canvasEl);
          break;
        case "image":
          renderImage(ctx, node as ImageNode, canvasEl);
          break;
        case "gradient":
          renderGradient(ctx, node as GradientNode, canvasEl);
          break;
      }
    };

    // Initial render
    renderPattern();

    // Re-render on window resize
    window.addEventListener("resize", renderPattern);

    // Cleanup
    return () => {
      window.removeEventListener("resize", renderPattern);
    };
  }, [node]);

  return <canvas ref={canvasRef} className="w-full h-full" />;
}

/**
 * Evaluate coordinate to pixels
 */
function evalCoord(coord: Coordinate, containerSize: number): number {
  return evaluateCoordinate(coord, containerSize);
}

/**
 * Calculate repeat offsets based on repeat configuration
 */
interface RepeatOffset {
  x: number;
  y: number;
}

function calculateRepeatOffsets(
  repeat: Repeat | undefined,
  canvas: HTMLCanvasElement,
  nodeWidth?: number,
  nodeHeight?: number
): RepeatOffset[] {
  if (!repeat) {
    return [{ x: 0, y: 0 }];
  }

  // Simple repeat (for images)
  if (typeof repeat === "string") {
    const offsets: RepeatOffset[] = [];
    const w = nodeWidth || 0;
    const h = nodeHeight || 0;

    if (repeat === "no-repeat") {
      return [{ x: 0, y: 0 }];
    }

    const repeatX = repeat === "repeat" || repeat === "repeat-x";
    const repeatY = repeat === "repeat" || repeat === "repeat-y";

    const countX = repeatX ? Math.ceil(canvas.width / w) : 1;
    const countY = repeatY ? Math.ceil(canvas.height / h) : 1;

    for (let iy = 0; iy < countY; iy++) {
      for (let ix = 0; ix < countX; ix++) {
        offsets.push({ x: ix * w, y: iy * h });
      }
    }

    return offsets;
  }

  // Advanced repeat (grid or tile)
  const offsets: RepeatOffset[] = [];

  if (repeat.mode === "grid") {
    const countX = repeat.countX || 1;
    const countY = repeat.countY || 1;

    let spacingX: number;
    let spacingY: number;

    // Unit: fr (fractional) - equal division
    if (repeat.unit === "fr") {
      spacingX = canvas.width / countX;
      spacingY = canvas.height / countY;
    }
    // Unit: undefined - fixed pixel spacing
    else {
      spacingX = repeat.spacingX || 0;
      spacingY = repeat.spacingY || 0;
    }

    for (let iy = 0; iy < countY; iy++) {
      for (let ix = 0; ix < countX; ix++) {
        offsets.push({ x: ix * spacingX, y: iy * spacingY });
      }
    }
  } else if (repeat.mode === "tile") {
    const tileWidth = repeat.tileWidth;
    const tileHeight = repeat.tileHeight;
    const countX = Math.ceil(canvas.width / tileWidth);
    const countY = Math.ceil(canvas.height / tileHeight);

    for (let iy = 0; iy < countY; iy++) {
      for (let ix = 0; ix < countX; ix++) {
        offsets.push({ x: ix * tileWidth, y: iy * tileHeight });
      }
    }
  }

  return offsets;
}

/**
 * Render Rectangle
 */
function renderRect(
  ctx: CanvasRenderingContext2D,
  node: RectNode,
  canvas: HTMLCanvasElement
) {
  const baseX = evalCoord(node.x, canvas.width);
  const baseY = evalCoord(node.y, canvas.height);
  const width = node.width;
  const height = node.height;

  const offsets = calculateRepeatOffsets(node.repeat, canvas, width, height);

  for (const offset of offsets) {
    const x = baseX + offset.x;
    const y = baseY + offset.y;

    // Fill
    if (node.fill) {
      ctx.fillStyle = node.fill;
      ctx.fillRect(x, y, width, height);
    }

    // Stroke
    if (node.stroke && node.strokeWidth) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth;
      ctx.strokeRect(x, y, width, height);
    }
  }
}

/**
 * Render Circle
 */
function renderCircle(
  ctx: CanvasRenderingContext2D,
  node: CircleNode,
  canvas: HTMLCanvasElement
) {
  const baseX = evalCoord(node.x, canvas.width);
  const baseY = evalCoord(node.y, canvas.height);
  const radius = node.diameter / 2;

  const offsets = calculateRepeatOffsets(
    node.repeat,
    canvas,
    node.diameter,
    node.diameter
  );

  for (const offset of offsets) {
    const x = baseX + offset.x;
    const y = baseY + offset.y;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);

    // Fill
    if (node.fill) {
      ctx.fillStyle = node.fill;
      ctx.fill();
    }

    // Stroke
    if (node.stroke && node.strokeWidth) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth;
      ctx.stroke();
    }
  }
}

/**
 * Render Ellipse
 */
function renderEllipse(
  ctx: CanvasRenderingContext2D,
  node: EllipseNode,
  canvas: HTMLCanvasElement
) {
  const baseX = evalCoord(node.x, canvas.width);
  const baseY = evalCoord(node.y, canvas.height);
  const radiusX = node.width / 2;
  const radiusY = node.height / 2;

  const offsets = calculateRepeatOffsets(
    node.repeat,
    canvas,
    node.width,
    node.height
  );

  for (const offset of offsets) {
    const x = baseX + offset.x;
    const y = baseY + offset.y;

    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);

    // Fill
    if (node.fill) {
      ctx.fillStyle = node.fill;
      ctx.fill();
    }

    // Stroke
    if (node.stroke && node.strokeWidth) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth;
      ctx.stroke();
    }
  }
}

/**
 * Render Line (two-point)
 */
function renderLine(
  ctx: CanvasRenderingContext2D,
  node: LineNode,
  canvas: HTMLCanvasElement
) {
  const baseX1 = evalCoord(node.x1, canvas.width);
  const baseY1 = evalCoord(node.y1, canvas.height);
  const baseX2 = evalCoord(node.x2, canvas.width);
  const baseY2 = evalCoord(node.y2, canvas.height);

  const lineWidth = Math.abs(baseX2 - baseX1);
  const lineHeight = Math.abs(baseY2 - baseY1);

  const offsets = calculateRepeatOffsets(
    node.repeat,
    canvas,
    lineWidth || 1,
    lineHeight || 1
  );

  for (const offset of offsets) {
    const x1 = baseX1 + offset.x;
    const y1 = baseY1 + offset.y;
    const x2 = baseX2 + offset.x;
    const y2 = baseY2 + offset.y;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);

    // Stroke
    if (node.stroke && node.strokeWidth) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth;
      ctx.stroke();
    }
  }
}

/**
 * Render Directed Line (direction + length)
 */
function renderDirectedLine(
  ctx: CanvasRenderingContext2D,
  node: DirectedLineNode,
  canvas: HTMLCanvasElement
) {
  const baseX = evalCoord(node.x, canvas.width);
  const baseY = evalCoord(node.y, canvas.height);
  const length = node.length;

  const lineWidth = node.direction === "horizontal" ? length : 0;
  const lineHeight = node.direction === "vertical" ? length : 0;

  const offsets = calculateRepeatOffsets(
    node.repeat,
    canvas,
    lineWidth || 1,
    lineHeight || 1
  );

  for (const offset of offsets) {
    const x = baseX + offset.x;
    const y = baseY + offset.y;
    let x2 = x;
    let y2 = y;

    if (node.direction === "horizontal") {
      x2 = x + length;
    } else {
      y2 = y + length;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x2, y2);

    // Stroke
    if (node.stroke && node.strokeWidth) {
      ctx.strokeStyle = node.stroke;
      ctx.lineWidth = node.strokeWidth;
      ctx.stroke();
    }
  }
}

/**
 * Render Image
 */
function renderImage(
  ctx: CanvasRenderingContext2D,
  node: ImageNode,
  canvas: HTMLCanvasElement
) {
  const baseX = evalCoord(node.x, canvas.width);
  const baseY = evalCoord(node.y, canvas.height);

  const img = new Image();
  img.onload = () => {
    let drawWidth: number;
    let drawHeight: number;

    // Priority 1: width/height
    if (node.width !== undefined && node.height !== undefined) {
      drawWidth = node.width;
      drawHeight = node.height;
    }
    // Priority 2: scale
    else if (node.scale !== undefined) {
      drawWidth = img.width * node.scale;
      drawHeight = img.height * node.scale;
    }
    // Priority 3: fit
    else if (node.fit) {
      const aspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;

      if (node.fit === "contain") {
        if (aspect > canvasAspect) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / aspect;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * aspect;
        }
      } else if (node.fit === "cover") {
        if (aspect > canvasAspect) {
          drawHeight = canvas.height;
          drawWidth = canvas.height * aspect;
        } else {
          drawWidth = canvas.width;
          drawHeight = canvas.width / aspect;
        }
      } else {
        // fill
        drawWidth = canvas.width;
        drawHeight = canvas.height;
      }
    }
    // Default: original size
    else {
      drawWidth = img.width;
      drawHeight = img.height;
    }

    // Calculate repeat offsets with actual image dimensions
    const offsets = calculateRepeatOffsets(
      node.repeat,
      canvas,
      drawWidth,
      drawHeight
    );

    // Draw image at each offset position
    for (const offset of offsets) {
      const x = baseX + offset.x;
      const y = baseY + offset.y;
      ctx.drawImage(img, x, y, drawWidth, drawHeight);
    }
  };

  img.src = node.src;
}

/**
 * Render Gradient
 * Automatically generates gradient steps
 */
function renderGradient(
  ctx: CanvasRenderingContext2D,
  node: GradientNode,
  canvas: HTMLCanvasElement
) {
  const steps = node.steps || 16;
  const direction = node.direction || "horizontal";
  const startColor = parseColor(node.startColor || "#000000");
  const endColor = parseColor(node.endColor || "#FFFFFF");

  // Generate gradient steps
  for (let i = 0; i < steps; i++) {
    // Calculate position with fractional distribution
    // This ensures remainders are distributed evenly, not at edges
    const isHorizontal = direction === "horizontal";
    const totalSize = isHorizontal ? canvas.width : canvas.height;

    const start = Math.floor((i / steps) * totalSize);
    const end = Math.floor(((i + 1) / steps) * totalSize);
    const size = end - start;

    // Interpolate color
    const t = i / (steps - 1);
    const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
    const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
    const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
    const color = `rgb(${r}, ${g}, ${b})`;

    // Draw rectangle
    ctx.fillStyle = color;
    if (isHorizontal) {
      ctx.fillRect(start, 0, size, canvas.height);
    } else {
      ctx.fillRect(0, start, canvas.width, size);
    }
  }
}

/**
 * Parse hex color to RGB
 */
interface RGB {
  r: number;
  g: number;
  b: number;
}

function parseColor(color: string): RGB {
  // Remove # if present
  const hex = color.startsWith("#") ? color.slice(1) : color;

  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);

  return { r, g, b };
}
