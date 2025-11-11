/**
 * Preset Registry
 *
 * Manages discovery and loading of presets.
 * Convention over Configuration: presets are discovered by file naming.
 */

import type {
  PresetComponent,
  PresetMetadata,
  PresetModule,
  PresetRegistryEntry,
} from "./presetTypes";

/**
 * Preset registry
 */
class PresetRegistry {
  private presets = new Map<string, PresetRegistryEntry>();
  private loadedModules = new Map<string, PresetModule>();

  /**
   * Register a preset
   */
  register(id: string, module: PresetModule): void {
    const metadata: PresetMetadata = module.metadata || {
      name: id,
      category: "custom",
    };

    this.presets.set(id, {
      id,
      metadata,
      component: module.default,
    });

    this.loadedModules.set(id, module);
  }

  /**
   * Get a preset by ID
   */
  get(id: string): PresetRegistryEntry | undefined {
    return this.presets.get(id);
  }

  /**
   * Get all registered presets
   */
  getAll(): PresetRegistryEntry[] {
    return Array.from(this.presets.values());
  }

  /**
   * Get presets by category
   */
  getByCategory(category: string): PresetRegistryEntry[] {
    return this.getAll().filter((p) => p.metadata.category === category);
  }

  /**
   * Check if preset exists
   */
  has(id: string): boolean {
    return this.presets.has(id);
  }

  /**
   * Get preset component
   */
  getComponent(id: string): PresetComponent | undefined {
    return this.presets.get(id)?.component;
  }

  /**
   * Get preset metadata
   */
  getMetadata(id: string): PresetMetadata | undefined {
    return this.presets.get(id)?.metadata;
  }

  /**
   * Search presets by name or tags
   */
  search(query: string): PresetRegistryEntry[] {
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
   * Clear all presets (for testing)
   */
  clear(): void {
    this.presets.clear();
    this.loadedModules.clear();
  }
}

// Global registry instance
const registry = new PresetRegistry();

/**
 * Auto-register presets from presets/ directory
 * This uses Vite's glob import feature
 */
export async function autoRegisterPresets(): Promise<void> {
  // Import all preset files from /presets directory
  // Note: This path is relative to project root
  const presetModules = import.meta.glob<PresetModule>("/presets/*.tsx", {
    eager: false,
  });

  // Also check frontend/src/components/patterns for backward compatibility
  const legacyModules = import.meta.glob<PresetModule>(
    "../components/patterns/*.tsx",
    {
      eager: false,
    }
  );

  // Register presets from /presets
  for (const [path, importFn] of Object.entries(presetModules)) {
    const id = extractPresetId(path);
    const module = (await importFn()) as PresetModule;
    registry.register(id, module);
  }

  // Register legacy patterns
  for (const [path, importFn] of Object.entries(legacyModules)) {
    const id = extractPresetId(path);
    // Skip if already registered from /presets
    if (!registry.has(id)) {
      const module = (await importFn()) as PresetModule;
      registry.register(id, module);
    }
  }
}

/**
 * Dynamically load a preset by ID
 */
export async function loadPreset(id: string): Promise<PresetModule | null> {
  // Try loading from /presets
  try {
    const module = await import(`/presets/${id}.tsx`);
    registry.register(id, module);
    return module;
  } catch (e) {
    // Try legacy location
    try {
      const module = await import(`../components/patterns/${id}.tsx`);
      registry.register(id, module);
      return module;
    } catch (e2) {
      console.error(`Failed to load preset: ${id}`, e2);
      return null;
    }
  }
}

/**
 * Extract preset ID from file path
 */
function extractPresetId(path: string): string {
  // Extract filename without extension
  // /presets/colorbar.tsx -> colorbar
  // ../components/patterns/ColorBar.tsx -> ColorBar
  const filename = path.split("/").pop() || "";
  return filename.replace(/\.tsx$/, "");
}

/**
 * Get the global preset registry
 */
export function getPresetRegistry(): PresetRegistry {
  return registry;
}

/**
 * Register a preset manually (for testing or dynamic registration)
 */
export function registerPreset(id: string, module: PresetModule): void {
  registry.register(id, module);
}

export default registry;
