/**
 * Pattern System Type Definitions
 *
 * Patterns are plugins that render test patterns.
 * All patterns are equal - there are no "built-in" patterns.
 */

import { ReactElement } from "react";

/**
 * Pattern parameter definition
 */
export interface PatternParamDef {
  type: "string" | "number" | "boolean" | "color" | "select";
  default?: any;
  min?: number;
  max?: number;
  options?: string[]; // For select type
  description?: string;
}

/**
 * Pattern metadata
 */
export interface PatternMetadata {
  /** Pattern name (display) */
  name: string;
  /** Description */
  description?: string;
  /** Parameter definitions */
  params?: Record<string, PatternParamDef>;
  /** Category (for grouping in UI) */
  category?: "standard" | "test" | "custom";
  /** Tags for search */
  tags?: string[];
}

/**
 * Pattern component props
 */
export interface PatternProps {
  /** User-provided parameters */
  params?: Record<string, any>;
  /** Canvas dimensions */
  canvas?: {
    width: number;
    height: number;
  };
}

/**
 * Pattern component type
 */
export type PatternComponent = (props: PatternProps) => ReactElement;

/**
 * Pattern module structure
 */
export interface PatternModule {
  /** Default export: the component */
  default: PatternComponent;
  /** Named export: metadata */
  metadata?: PatternMetadata;
}

/**
 * Pattern registry entry
 */
export interface PatternRegistryEntry {
  /** Pattern identifier (filename without extension) */
  id: string;
  /** Metadata */
  metadata: PatternMetadata;
  /** Component */
  component: PatternComponent;
}
