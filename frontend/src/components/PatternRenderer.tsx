/**
 * Pattern Renderer Component
 *
 * Dynamically loads and renders a pattern by name.
 */

import { useEffect, useState, Suspense } from "react";
import type { PatternComponent } from "../lib/patternTypes";
import { getPatternRegistry, loadPattern } from "../lib/patternRegistry";

export interface PatternRendererProps {
  /** Pattern name/ID */
  pattern: string;
  /** Pattern parameters */
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
 * Pattern Renderer
 *
 * Loads and renders a pattern component dynamically.
 */
export default function PatternRenderer({
  pattern,
  params = {},
  canvas,
  fallback = <div className="w-full h-full bg-gray-800" />,
  onError,
}: PatternRendererProps) {
  const [Component, setComponent] = useState<PatternComponent | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Check registry first
        const registry = getPatternRegistry();
        let component = registry.getComponent(pattern);

        // If not in registry, try to load it
        if (!component) {
          const module = await loadPattern(pattern);
          if (module) {
            component = module.default;
          }
        }

        if (!component) {
          throw new Error(`Pattern not found: ${pattern}`);
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
  }, [pattern]);

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
          <h2 className="text-2xl font-bold mb-2">Pattern Error</h2>
          <p className="text-sm">{error.message}</p>
          <p className="text-xs mt-4 opacity-50">Pattern: {pattern}</p>
        </div>
      </div>
    );
  }

  if (!Component) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
        <p>Pattern not found: {pattern}</p>
      </div>
    );
  }

  return (
    <Suspense fallback={fallback}>
      <Component params={params} canvas={canvas} />
    </Suspense>
  );
}
