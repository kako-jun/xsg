/**
 * XSG Pattern Format - TypeScript Type Definitions
 * Based on xsg-pattern.schema.json
 * Version: 1.0.0
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Coordinate type: number (pixels) or string (%, calc())
 * Examples: 100, "50%", "calc(50% + 10px)"
 */
export type Coordinate = number | string;

/**
 * Color in hex format (#RRGGBB)
 */
export type Color = string;

/**
 * Canvas dimensions
 */
export interface Canvas {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
}

// ============================================================================
// Repeat
// ============================================================================

/**
 * Simple repeat mode (CSS/Canvas API style, for images)
 */
export type SimpleRepeat = "repeat" | "repeat-x" | "repeat-y" | "no-repeat";

/**
 * Grid repeat configuration
 */
export interface GridRepeat {
  /** Repeat mode */
  mode: "grid";
  /** Number of repetitions horizontally */
  countX?: number;
  /** Number of repetitions vertically */
  countY?: number;
  /** Horizontal spacing between elements (fixed pixels) */
  spacingX?: number;
  /** Vertical spacing between elements (fixed pixels) */
  spacingY?: number;
  /** Unit type: "fr" for fractional (equal division), undefined for fixed spacing */
  unit?: "fr";
}

/**
 * Tile repeat configuration
 */
export interface TileRepeat {
  /** Repeat mode */
  mode: "tile";
  /** Width of each tile */
  tileWidth: number;
  /** Height of each tile */
  tileHeight: number;
}

/**
 * Advanced repeat configuration
 */
export type AdvancedRepeat = GridRepeat | TileRepeat;

/**
 * Repeat definition (CSS/Canvas API + advanced configuration)
 */
export type Repeat = SimpleRepeat | AdvancedRepeat;

// ============================================================================
// Animation (Web Animations API)
// ============================================================================

/**
 * Animation keyframe (WAAPI format)
 */
export interface AnimationKeyframe {
  [key: string]: unknown;
}

/**
 * Animation properties (sugar syntax)
 */
export interface AnimationProps {
  [key: string]: unknown[];
}

/**
 * Animation definition following Web Animations API
 */
export interface Animation {
  /** Keyframes (WAAPI: Array of Objects format) */
  keyframes?: AnimationKeyframe[];
  /** Props (WAAPI: Object with Arrays format, sugar syntax) */
  props?: AnimationProps;
  /** Animation duration in milliseconds */
  duration: number;
  /** Number of iterations or 'Infinity' */
  iterations?: number | "Infinity";
  /** Easing function (WAAPI) */
  easing?: "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Animation direction (WAAPI) */
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
}

// ============================================================================
// Base Node
// ============================================================================

/**
 * Base properties shared by all nodes
 */
export interface BaseNode {
  /** Unique identifier for this node */
  id: string;
  /** Node type */
  type: string;
  /** Fill color (p5.js: fill()) */
  fill?: Color;
  /** Stroke color (p5.js: stroke()) */
  stroke?: Color;
  /** Stroke width (p5.js: strokeWeight()) */
  strokeWidth?: number;
  /** Opacity (CSS: opacity, 0-1) */
  opacity?: number;
  /** Blur radius in pixels (CSS: filter: blur()) */
  blur?: number;
  /** Rotation angle in degrees (0-360) */
  rotate?: number;
  /** Blink interval in milliseconds */
  blink?: number;
  /** Animation definition */
  animation?: Animation;
  /** Repeat definition (CSS/Canvas API + advanced configuration) */
  repeat?: Repeat;
}

// ============================================================================
// Node Types
// ============================================================================

/**
 * Background node - uses a preset for background rendering
 */
export interface BackgroundNode extends BaseNode {
  type: "background";
  /** Preset name (from presets/ directory) */
  preset: string;
  /** Preset-specific parameters */
  params?: Record<string, unknown>;
}

/**
 * Rectangle node
 */
export interface RectNode extends BaseNode {
  type: "rect";
  /** X coordinate */
  x: Coordinate;
  /** Y coordinate */
  y: Coordinate;
  /** Rectangle width */
  width: number;
  /** Rectangle height */
  height: number;
}

/**
 * Circle node
 */
export interface CircleNode extends BaseNode {
  type: "circle";
  /** X coordinate (center) */
  x: Coordinate;
  /** Y coordinate (center) */
  y: Coordinate;
  /** Circle diameter (p5.js: circle(x,y,d)) */
  diameter: number;
}

/**
 * Ellipse node
 */
export interface EllipseNode extends BaseNode {
  type: "ellipse";
  /** X coordinate (center) */
  x: Coordinate;
  /** Y coordinate (center) */
  y: Coordinate;
  /** Ellipse width */
  width: number;
  /** Ellipse height */
  height: number;
}

/**
 * Line node (two-point specification)
 */
export interface LineNode extends BaseNode {
  type: "line";
  /** Start X coordinate */
  x1: Coordinate;
  /** Start Y coordinate */
  y1: Coordinate;
  /** End X coordinate */
  x2: Coordinate;
  /** End Y coordinate */
  y2: Coordinate;
}

/**
 * Directed line node (direction + length specification)
 */
export interface DirectedLineNode extends BaseNode {
  type: "directedLine";
  /** Start X coordinate */
  x: Coordinate;
  /** Start Y coordinate */
  y: Coordinate;
  /** Line direction */
  direction: "horizontal" | "vertical";
  /** Line length in pixels */
  length: number;
}

/**
 * Image node
 */
export interface ImageNode extends BaseNode {
  type: "image";
  /** Image source: local path, @/ (project-relative), or URL */
  src: string;
  /** X coordinate */
  x: Coordinate;
  /** Y coordinate */
  y: Coordinate;
  /** Image width (priority 1) */
  width?: number;
  /** Image height (priority 1) */
  height?: number;
  /** Image scale factor (priority 2, ignored if width/height specified) */
  scale?: number;
  /** Image fit mode (priority 3, ignored if width/height or scale specified) */
  fit?: "contain" | "cover" | "fill";
}

/**
 * Preset node - uses a custom preset
 */
export interface PresetNode extends BaseNode {
  type: "preset";
  /** Preset name (from presets/ directory) */
  preset: string;
  /** Preset-specific parameters */
  params?: Record<string, unknown>;
}

/**
 * Gradient node - automatically generates gradient steps
 */
export interface GradientNode extends BaseNode {
  type: "gradient";
  /** Number of gradient steps */
  steps: number;
  /** Gradient direction */
  direction: "horizontal" | "vertical";
  /** Start color (hex format) */
  startColor: string;
  /** End color (hex format) */
  endColor: string;
}

/**
 * Union type of all possible pattern nodes
 */
export type PatternNode =
  | BackgroundNode
  | RectNode
  | CircleNode
  | EllipseNode
  | LineNode
  | DirectedLineNode
  | ImageNode
  | PresetNode
  | GradientNode;

// ============================================================================
// Main Pattern Interface
// ============================================================================

/**
 * Parameter definition for pattern templates
 */
export interface ParamDef {
  /** Parameter type */
  type: "number" | "string" | "color" | "boolean";
  /** Default value */
  default?: any;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Description */
  description?: string;
}

/**
 * XSG Pattern definition
 */
export interface XSGPattern {
  /** Extends another pattern (template inheritance) */
  extends?: string;
  /** Canvas dimensions */
  canvas?: Canvas;
  /** Parameter definitions (optional, for template patterns) */
  params?: Record<string, ParamDef>;
  /** Array of nodes (layers), rendered in order (first = back, last = front) */
  nodes?: PatternNode[];
}

// ============================================================================
// Legacy Format (for migration)
// ============================================================================

/**
 * Legacy pg format types
 * Used for backward compatibility and migration
 */
export namespace Legacy {
  export type BackgroundType =
    | "Solid"
    | "Crosshatch"
    | "Mesh"
    | "Grayscale"
    | "RepeatCropImage"
    | "Image";

  export type ForegroundType =
    | "Dot"
    | "Line"
    | "Window"
    | "Image"
    | "Crosshatch";

  export interface Background {
    type: BackgroundType;
    rgb_string?: string;
    rgb_string2?: string;
    alpha?: number;
    rect_width?: number;
    rect_height?: number;
    step_num?: number;
    grayscale_direction?: "h" | "v";
    grayscale_inverse?: boolean;
    flat_step_ids?: number[];
    inverted_step_ids?: number[];
    image_id?: string;
    image_scale?: number;
    image_stretch?: "fill" | "none";
    rotate?: number;
    blur_radius?: number;
  }

  export interface Foreground {
    type: ForegroundType;
    x?: string | number;
    y?: string | number;
    rgb_string?: string;
    alpha?: number;
    rotate?: number;
    blur_radius?: number;
    blink_interval?: number;
    line_direction?: "h" | "v";
    line_length?: string | number;
    line_width?: number;
    window_width?: number;
    window_height?: number;
    window_speed?: number;
    image_id?: string;
    image_scale?: number;
    image_stretch?: "fill" | "none";
  }

  export interface Pattern {
    background: Background;
    foreground: Foreground[];
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type guard to check if a node is a BackgroundNode
 */
export function isBackgroundNode(node: PatternNode): node is BackgroundNode {
  return node.type === "background";
}

/**
 * Type guard to check if a node is a RectNode
 */
export function isRectNode(node: PatternNode): node is RectNode {
  return node.type === "rect";
}

/**
 * Type guard to check if a node is a CircleNode
 */
export function isCircleNode(node: PatternNode): node is CircleNode {
  return node.type === "circle";
}

/**
 * Type guard to check if a node is an EllipseNode
 */
export function isEllipseNode(node: PatternNode): node is EllipseNode {
  return node.type === "ellipse";
}

/**
 * Type guard to check if a node is a LineNode
 */
export function isLineNode(node: PatternNode): node is LineNode {
  return node.type === "line";
}

/**
 * Type guard to check if a node is a DirectedLineNode
 */
export function isDirectedLineNode(
  node: PatternNode
): node is DirectedLineNode {
  return node.type === "directedLine";
}

/**
 * Type guard to check if a node is an ImageNode
 */
export function isImageNode(node: PatternNode): node is ImageNode {
  return node.type === "image";
}

/**
 * Type guard to check if a node is a PresetNode
 */
export function isPresetNode(node: PatternNode): node is PresetNode {
  return node.type === "preset";
}
