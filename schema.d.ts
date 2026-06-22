/**
 * XSG Pattern Format v1.0 - TypeScript Type Definitions
 *
 * 移植元（pg）の全プロパティに対応
 * - Background Types: 6種類
 * - Foreground Types: 5種類
 * - Properties: 27個
 */

// ============================================
// 座標指定
// ============================================

/**
 * 座標値
 * - 絶対値: 100
 * - パーセント: "50%"
 * - 計算式: "calc(50% + 10px)"
 */
export type Coordinate = number | string;

// ============================================
// 色指定
// ============================================

/**
 * 色（Hex形式）
 * 例: "#FF0000", "#00FF00"
 */
export type Color = string;

// ============================================
// Background Presets（6種類）
// ============================================

export type BackgroundPreset =
  | "solid" // Solid
  | "crosshatch" // Crosshatch
  | "checker" // Mesh
  | "grayscale" // Grayscale
  | "repeatCropImage" // RepeatCropImage
  | "image"; // Image

// ============================================
// Foreground Presets
// ============================================

export type ForegroundPreset = "pixeldefect" | "crosshatch";

// ============================================
// Node Types
// ============================================

export type NodeType =
  | "background"
  | "rect"
  | "circle"
  | "ellipse"
  | "line"
  | "image"
  | "preset";

// ============================================
// Direction（方向）
// ============================================

export type Direction = "horizontal" | "vertical";

// ============================================
// Image Fit（画像フィット）
// ============================================

export type ImageFit = "contain" | "cover" | "fill";

// ============================================
// Animation（WAAPI準拠）
// ============================================

export type Easing = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out";

export type AnimationDirection =
  | "normal"
  | "reverse"
  | "alternate"
  | "alternate-reverse";

export interface Keyframe {
  x?: Coordinate;
  y?: Coordinate;
  width?: number;
  height?: number;
  opacity?: number;
  rotate?: number;
  scale?: number;
  [key: string]: any;
}

/**
 * ⚠️ 未実装（v1.1 予定）。現状 NodeRenderer は animation を描画しない。
 * 型・スキーマは契約として保持し、レンダラーは静的にのみ評価する。
 */
export interface Animation {
  // keyframes形式（配列 or オブジェクト）
  keyframes?: Keyframe[];
  props?: Record<string, any[]>;

  // タイミング（WAAPI KeyframeEffectOptions）
  duration: number;
  iterations?: number | "Infinity";
  easing?: Easing;
  delay?: number;
  direction?: AnimationDirection;
}

// ============================================
// Base Node
// ============================================

export interface BaseNode {
  id: string;
  type: NodeType;

  // スタイル（p5.js/CSS準拠）
  fill?: Color;
  stroke?: Color;
  strokeWidth?: number;
  opacity?: number;

  // エフェクト（CSS準拠）
  blur?: number;
  rotate?: number;

  // アニメーション（⚠️ 未実装・v1.1 予定。現状 NodeRenderer は描画しない＝静的表示のまま）
  blink?: number;
  animation?: Animation;
}

// ============================================
// Background Node
// ============================================

export interface BackgroundNode extends BaseNode {
  type: "background";
  preset: BackgroundPreset;
  params?: BackgroundParams;
}

export type BackgroundParams =
  | SolidParams
  | CrosshatchParams
  | CheckerParams
  | GrayscaleParams
  | RepeatCropImageParams
  | ImageParams;

export interface SolidParams {
  color: Color;
}

export interface CrosshatchParams {
  width: number; // rect_width
  height: number; // rect_height
  color1: Color; // rgb_string
  color2: Color; // rgb_string2
}

export interface CheckerParams {
  size: number; // rect_width/height（正方形）
  color1: Color;
  color2: Color;
}

export interface GrayscaleParams {
  steps: number; // step_num
  direction: Direction; // grayscale_direction
  reverse?: boolean; // grayscale_inverse
  flatSteps?: number[]; // flat_step_ids
  invertedSteps?: number[]; // inverted_step_ids
}

export interface RepeatCropImageParams {
  src: string;
  cropWidth: number;
  cropHeight: number;
  cropX: number;
  cropY: number;
}

export interface ImageParams {
  src: string;
  fit?: ImageFit;
}

// ============================================
// Rect Node
// ============================================

export interface RectNode extends BaseNode {
  type: "rect";
  x: Coordinate;
  y: Coordinate;
  width: number;
  height: number;
}

// ============================================
// Circle Node
// ============================================

export interface CircleNode extends BaseNode {
  type: "circle";
  x: Coordinate;
  y: Coordinate;
  diameter: number;
}

// ============================================
// Ellipse Node
// ============================================

export interface EllipseNode extends BaseNode {
  type: "ellipse";
  x: Coordinate;
  y: Coordinate;
  width: number;
  height: number;
}

// ============================================
// Line Node
// ============================================

export interface LineNode extends BaseNode {
  type: "line";

  // Option 1: x1,y1,x2,y2で指定（p5.js標準）
  x1?: Coordinate;
  y1?: Coordinate;
  x2?: Coordinate;
  y2?: Coordinate;

  // Option 2: x,y,direction,lengthで指定（移植元互換）
  x?: Coordinate;
  y?: Coordinate;
  direction?: Direction; // line_direction
  length?: number; // line_length
}

// ============================================
// Image Node
// ============================================

export interface ImageNode extends BaseNode {
  type: "image";
  src: string; // image_id
  x: Coordinate;
  y: Coordinate;
  width?: number;
  height?: number;
  fit?: ImageFit; // image_stretch
  scale?: number; // image_scale
}

// ============================================
// Preset Node
// ============================================

export interface PresetNode extends BaseNode {
  type: "preset";
  preset: ForegroundPreset;
  params?: Record<string, any>;
}

// ============================================
// Union Type
// ============================================

export type PatternNode =
  | BackgroundNode
  | RectNode
  | CircleNode
  | EllipseNode
  | LineNode
  | ImageNode
  | PresetNode;

// ============================================
// Canvas
// ============================================

export interface Canvas {
  width: number;
  height: number;
}

// ============================================
// Root Schema
// ============================================

export interface XSGPattern {
  canvas: Canvas;
  nodes: PatternNode[];
}

// ============================================
// Legacy Types（移植元の型定義）
// ============================================

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

    // Common
    rgb_string?: string;
    rgb_string2?: string;
    alpha?: number;
    rotate?: number;
    blur_radius?: number;

    // Crosshatch/Mesh
    rect_width?: number;
    rect_height?: number;

    // Grayscale
    step_num?: number;
    grayscale_direction?: "h" | "v";
    grayscale_inverse?: boolean;
    flat_step_ids?: number[];
    inverted_step_ids?: number[];

    // Image
    image_id?: string;
    image_scale?: number;
    image_stretch?: "fill" | "none";

    // RepeatCropImage
    crop_width?: number;
    crop_height?: number;
    crop_x?: number;
    crop_y?: number;
  }

  export interface Foreground {
    type: ForegroundType;

    // Common
    x: string | number;
    y: string | number;
    rgb_string?: string;
    alpha?: number;
    rotate?: number;
    blur_radius?: number;

    // Blink（移行先 blink へマップ。⚠️ 未実装・v1.1 予定のため現行レンダラーでは効果なし）
    blink_interval?: number;

    // Line
    line_direction?: "h" | "v";
    line_length?: number;
    line_width?: number;

    // Window
    window_width?: number;
    window_height?: number;
    window_speed?: number;

    // Image
    image_id?: string;
    image_scale?: number;
    image_stretch?: "fill" | "none";

    // Crosshatch
    rect_width?: number;
    rect_height?: number;
    rgb_string2?: string;
  }

  export interface Pattern {
    background: Background;
    foreground: Foreground[];
  }
}
