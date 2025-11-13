/**
 * Pattern Registry
 *
 * Manages discovery and loading of patterns.
 * Convention over Configuration: patterns are discovered by file naming.
 */

import type {
  PatternComponent,
  PatternMetadata,
  PatternModule,
  PatternRegistryEntry,
} from "./patternTypes";

/**
 * Pattern registry
 */
class PatternRegistry {
  private patterns = new Map<string, PatternRegistryEntry>();
  private loadedModules = new Map<string, PatternModule>();

  /**
   * Register a pattern
   */
  register(id: string, module: PatternModule): void {
    const metadata: PatternMetadata = module.metadata || {
      name: id,
      category: "custom",
    };

    this.patterns.set(id, {
      id,
      metadata,
      component: module.default,
    });

    this.loadedModules.set(id, module);
  }

  /**
   * Get a pattern by ID
   */
  get(id: string): PatternRegistryEntry | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get all registered patterns
   */
  getAll(): PatternRegistryEntry[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by category
   */
  getByCategory(category: string): PatternRegistryEntry[] {
    return this.getAll().filter((p) => p.metadata.category === category);
  }

  /**
   * Check if pattern exists
   */
  has(id: string): boolean {
    return this.patterns.has(id);
  }

  /**
   * Get pattern component
   */
  getComponent(id: string): PatternComponent | undefined {
    return this.patterns.get(id)?.component;
  }

  /**
   * Get pattern metadata
   */
  getMetadata(id: string): PatternMetadata | undefined {
    return this.patterns.get(id)?.metadata;
  }

  /**
   * Search patterns by name or tags
   */
  search(query: string): PatternRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter((p) => {
      const nameMatch = p.metadata.name.toLowerCase().includes(lowerQuery);
      const tagMatch = p.metadata.tags?.some((tag) =>
        tag.toLowerCase().includes(lowerQuery)
      );
      return nameMatch || tagMatch;
    });
  }

  /**
   * Clear all patterns (for testing)
   */
  clear(): void {
    this.patterns.clear();
    this.loadedModules.clear();
  }
}

// Global registry instance
const registry = new PatternRegistry();

/**
 * Auto-register patterns from /patterns/ directory
 * This uses Vite's glob import feature
 */
export async function autoRegisterPatterns(): Promise<void> {
  // Import all pattern files from /patterns directory
  // Note: This path is relative to project root
  const patternModules = import.meta.glob<PatternModule>("/patterns/*.tsx", {
    eager: false,
  });

  // Also check frontend/src/components/patterns for backward compatibility
  const legacyModules = import.meta.glob<PatternModule>(
    "../components/patterns/*.tsx",
    {
      eager: false,
    }
  );

  // Register patterns from /patterns
  for (const [path, importFn] of Object.entries(patternModules)) {
    const id = extractPatternId(path);
    const module = (await importFn()) as PatternModule;
    registry.register(id, module);
  }

  // Register legacy patterns
  for (const [path, importFn] of Object.entries(legacyModules)) {
    const id = extractPatternId(path);
    // Skip if already registered from /patterns
    if (!registry.has(id)) {
      const module = (await importFn()) as PatternModule;
      registry.register(id, module);
    }
  }
}

/**
 * Dynamically load a pattern by ID
 */
export async function loadPattern(id: string): Promise<PatternModule | null> {
  // Try loading from /patterns
  try {
    const module = await import(`/patterns/${id}.tsx`);
    registry.register(id, module);
    return module;
  } catch (e) {
    // Try legacy location
    try {
      const module = await import(`../components/patterns/${id}.tsx`);
      registry.register(id, module);
      return module;
    } catch (e2) {
      console.error(`Failed to load pattern: ${id}`, e2);
      return null;
    }
  }
}

/**
 * Extract pattern ID from file path
 */
function extractPatternId(path: string): string {
  // Extract filename without extension
  // /patterns/colorbar.tsx -> colorbar
  // ../components/patterns/ColorBar.tsx -> ColorBar
  const filename = path.split("/").pop() || "";
  return filename.replace(/\.tsx$/, "");
}

/**
 * Get the global pattern registry
 */
export function getPatternRegistry(): PatternRegistry {
  return registry;
}

/**
 * Register a pattern manually (for testing or dynamic registration)
 */
export function registerPattern(id: string, module: PatternModule): void {
  registry.register(id, module);
}

export default registry;
