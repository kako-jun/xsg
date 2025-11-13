/**
 * Parameter Expansion Utility
 *
 * Expands {{paramName}} variables in pattern definitions with actual values.
 * Also handles template inheritance (extends).
 */

import yaml from "js-yaml";
import type { XSGPattern, ParamDef } from "./types";

/**
 * Expand parameters in a pattern
 *
 * @param pattern - Pattern definition with {{paramName}} variables
 * @param userParams - User-provided parameter values (from URL query or API)
 * @returns Pattern with expanded parameters
 */
export function expandParams(
  pattern: XSGPattern,
  userParams: Record<string, any> = {}
): XSGPattern {
  // Merge default params with user params
  const params = resolveParams(pattern.params || {}, userParams);

  // Deep clone and expand
  const expanded = JSON.parse(JSON.stringify(pattern));

  // Expand all string values recursively
  expandObject(expanded, params);

  return expanded;
}

/**
 * Resolve parameter values (default + user overrides)
 */
function resolveParams(
  paramDefs: Record<string, ParamDef>,
  userParams: Record<string, any>
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, def] of Object.entries(paramDefs)) {
    if (key in userParams) {
      // User provided value
      resolved[key] = coerceType(userParams[key], def.type);
    } else if (def.default !== undefined) {
      // Default value
      resolved[key] = def.default;
    }
  }

  return resolved;
}

/**
 * Coerce value to the specified type
 */
function coerceType(value: any, type: string): any {
  switch (type) {
    case "number":
      return Number(value);
    case "boolean":
      return value === "true" || value === true;
    case "string":
    case "color":
    default:
      return String(value);
  }
}

/**
 * Recursively expand {{paramName}} in all string values
 */
function expandObject(obj: any, params: Record<string, any>): void {
  if (typeof obj === "string") {
    // This shouldn't happen at the top level, but handle it anyway
    return;
  }

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === "string") {
      // Expand {{paramName}} → actual value
      obj[key] = expandString(value, params);
    } else if (typeof value === "object" && value !== null) {
      // Recursively expand nested objects
      expandObject(value, params);
    }
  }
}

/**
 * Expand {{paramName}} in a single string
 */
function expandString(str: string, params: Record<string, any>): any {
  // Check if the entire string is a single variable reference
  const singleVarMatch = str.match(/^{{(\w+)}}$/);
  if (singleVarMatch) {
    const paramName = singleVarMatch[1];
    return params[paramName];
  }

  // Replace all {{paramName}} occurrences
  return str.replace(/{{(\w+)}}/g, (match, paramName) => {
    if (paramName in params) {
      return String(params[paramName]);
    }
    return match; // Keep original if param not found
  });
}

/**
 * Parse URL query parameters
 */
export function parseQueryParams(search: string): Record<string, any> {
  const params: Record<string, any> = {};
  const urlParams = new URLSearchParams(search);

  for (const [key, value] of urlParams.entries()) {
    params[key] = value;
  }

  return params;
}

/**
 * Resolve template inheritance (extends)
 *
 * @param pattern - Pattern that may have extends property
 * @returns Resolved pattern with base pattern merged
 */
export async function resolveExtends(pattern: XSGPattern): Promise<XSGPattern> {
  if (!pattern.extends) {
    return pattern;
  }

  // Load base pattern
  const basePattern = await loadPatternFile(pattern.extends);

  // Recursively resolve base pattern's extends
  const resolvedBase = await resolveExtends(basePattern);

  // Merge base and child patterns
  const merged: XSGPattern = {
    // Canvas: child overrides base
    canvas: pattern.canvas || resolvedBase.canvas,
    // Params: merge (child overrides base)
    params: { ...resolvedBase.params, ...pattern.params },
    // Nodes: child overrides base (or use base if child has none)
    nodes: pattern.nodes || resolvedBase.nodes || [],
  };

  return merged;
}

/**
 * Load a pattern file by path
 *
 * @param path - Pattern file path (relative to /patterns/)
 * @returns Loaded pattern
 */
async function loadPatternFile(path: string): Promise<XSGPattern> {
  // Normalize path
  const normalizedPath = path.startsWith("/") ? path : `/patterns/${path}`;

  const response = await fetch(normalizedPath);
  const yamlText = await response.text();
  const pattern = yaml.load(yamlText) as XSGPattern;

  return pattern;
}
