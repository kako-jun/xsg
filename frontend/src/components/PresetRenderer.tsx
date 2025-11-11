/**
 * Preset Renderer Component
 *
 * Dynamically loads and renders a preset by name.
 */

import { useEffect, useState, Suspense } from "react";
import type { PresetComponent } from "../lib/presetTypes";
import { getPresetRegistry, loadPreset } from "../lib/presetRegistry";

export interface PresetRendererProps {
  /** Preset name/ID */
  preset: string;
  /** Preset parameters */
  params?: Record<string, any>;
  /** Canvas dimensions */
  canvas?: {
    width: number;
    height: number;
  };
  /** Fallback UI while loading */
  fallback?: React.ReactNode;
  /** Error UI */
  onError?: (error: Error) => React.ReactNode;
}

/**
 * Preset Renderer
 *
 * Loads and renders a preset component dynamically.
 */
export default function PresetRenderer({
  preset,
  params = {},
  canvas,
  fallback = <div className="w-full h-full bg-gray-800" />,
  onError,
}: PresetRendererProps) {
  const [Component, setComponent] = useState<PresetComponent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Check registry first
        const registry = getPresetRegistry();
        let component = registry.getComponent(preset);

        // If not in registry, try to load it
        if (!component) {
          const module = await loadPreset(preset);
          if (module) {
            component = module.default;
          }
        }

        if (!component) {
          throw new Error(`Preset not found: ${preset}`);
        }

        if (mounted) {
          setComponent(() => component!);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [preset]);

  if (loading) {
    return <>{fallback}</>;
  }

  if (error) {
    if (onError) {
      return <>{onError(error)}</>;
    }
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Preset Error</h2>
          <p className="text-sm">{error.message}</p>
          <p className="text-xs mt-4 opacity-50">Preset: {preset}</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p>Preset not found: {preset}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <Component params={params} canvas={canvas} />
    </Suspense>
  );
}
