/**
 * Tauri compatibility layer
 *
 * Detects whether running inside Tauri or a plain browser,
 * and provides a unified invoke() wrapper.
 * In browser mode, Tauri commands are simulated with web-based fallbacks.
 */

/**
 * Check if running inside Tauri webview
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Invoke a Tauri command, or fall back to a web-based stub.
 * In web mode, only a subset of commands are supported.
 */
export async function safeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<T>(cmd, args);
  }

  // Web-mode fallbacks
  return webFallback<T>(cmd, args);
}

/**
 * Web-mode fallback implementations for Tauri commands
 */
async function webFallback<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  switch (cmd) {
    case "get_pattern": {
      const patternId = (args?.patternId as string) || "solid";
      const params = (args?.params as Record<string, string>) || {};
      return loadPatternFromWeb(patternId, params) as T;
    }

    case "get_patterns": {
      return loadPatternsListFromWeb() as T;
    }

    case "get_calibration_status": {
      return {
        platform: "web",
        gamma: {
          supported: false,
          current_value: null,
          saved_value: null,
          is_default: true,
          message: "Not available in web mode",
        },
        night_mode: {
          supported: false,
          enabled: false,
          message: "Not available in web mode",
        },
        hdr: {
          supported: false,
          enabled: false,
          message: "Not available in web mode",
        },
        gpu: {
          vendor: "unknown",
          message: "Not available in web mode",
        },
      } as T;
    }

    case "reset_gamma":
    case "restore_gamma":
    case "disable_night_mode": {
      return {
        success: false,
        message: "Not available in web mode",
      } as T;
    }

    default:
      throw new Error(`Command '${cmd}' is not supported in web mode`);
  }
}

/**
 * Load a pattern YAML file via fetch (web mode)
 */
async function loadPatternFromWeb(
  patternId: string,
  _params: Record<string, string>
): Promise<unknown> {
  const { default: yaml } = await import("js-yaml");
  const { expandParams, resolveExtends } = await import("./paramExpander");

  const url = `/patterns/${patternId}.yaml`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Pattern not found: ${patternId}`);
  }

  const yamlText = await response.text();
  let pattern = yaml.load(yamlText) as Record<string, unknown>;

  // Resolve extends
  pattern = (await resolveExtends(pattern as any)) as Record<string, unknown>;

  // Expand params
  pattern = expandParams(pattern as any, _params) as Record<string, unknown>;

  return pattern;
}

/**
 * Load patterns list by fetching a known index or scanning (web mode)
 */
async function loadPatternsListFromWeb(): Promise<unknown> {
  // In web mode, we provide a static list of known patterns
  // A production setup could use an API endpoint or generated manifest
  const knownPatterns = [
    { id: "colorbar", name: "SMPTE Color Bars", category: "Color Bars" },
    { id: "ebu-colorbar", name: "EBU Color Bars", category: "Color Bars" },
    { id: "arib-colorbar", name: "ARIB Color Bars", category: "Color Bars" },
    { id: "grayscale", name: "Grayscale", category: "Grayscale" },
    { id: "staircase", name: "Staircase", category: "Grayscale" },
    { id: "gradient", name: "Gradient", category: "Grayscale" },
    {
      id: "vertical-gradient",
      name: "Vertical Gradient",
      category: "Grayscale",
    },
    {
      id: "horizontal-gradient",
      name: "Horizontal Gradient",
      category: "Grayscale",
    },
    { id: "checker", name: "Checkerboard", category: "Geometry" },
    { id: "crosshatch", name: "Crosshatch", category: "Geometry" },
    { id: "convergence", name: "Convergence", category: "Geometry" },
    { id: "pluge", name: "PLUGE", category: "Calibration" },
    { id: "solid", name: "Solid", category: "Basic" },
    { id: "multiburst", name: "Multiburst", category: "Frequency" },
    { id: "pixel-defect", name: "Pixel Defect", category: "Testing" },
  ];

  // Filter to patterns that actually exist by trying to fetch them
  const available = [];
  for (const p of knownPatterns) {
    try {
      const resp = await fetch(`/patterns/${p.id}.yaml`, { method: "HEAD" });
      if (resp.ok) {
        available.push(p);
      }
    } catch {
      // Skip unavailable patterns
    }
  }

  return { patterns: available.length > 0 ? available : knownPatterns };
}
