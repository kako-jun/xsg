/**
 * Preset System Type Definitions
 *
 * Presets are plugins that render patterns.
 * All presets are equal - there are no "built-in" presets.
 */

import { ReactElement } from "react";

/**
 * Preset parameter definition
 */
export interface PresetParamDef {
  type: "string" | "number" | "boolean" | "color" | "select";
  default?: any;
  min?: number;
  max?: number;
  options?: string[]; // For select type
  description?: string;
}

/**
 * Preset metadata
 */
export interface PresetMetadata {
  /** Preset name (display) */
  name: string;
  /** Description */
  description?: string;
  /** Parameter definitions */
  params?: Record<string, PresetParamDef>;
  /** Category (for grouping in UI) */
  category?: "standard" | "test" | "custom";
  /** Tags for search */
  tags?: string[];
}

/**
 * Preset component props
 */
export interface PresetProps {
  /** User-provided parameters */
  params?: Record<string, any>;
  /** Canvas dimensions */
  canvas?: {
    width: number;
    height: number;
  };
}

/**
 * Preset component type
 */
export type PresetComponent = (props: PresetProps) => ReactElement;

/**
 * Preset module structure
 */
export interface PresetModule {
  /** Default export: the component */
  default: PresetComponent;
  /** Named export: metadata */
  metadata?: PresetMetadata;
}

/**
 * Preset registry entry
 */
export interface PresetRegistryEntry {
  /** Preset identifier (filename without extension) */
  id: string;
  /** Metadata */
  metadata: PresetMetadata;
  /** Component */
  component: PresetComponent;
}
