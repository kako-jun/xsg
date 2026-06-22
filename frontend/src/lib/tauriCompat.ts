/**
 * Tauri compatibility layer
 *
 * Detects whether running inside Tauri or a plain browser,
 * and provides a unified invoke() wrapper.
 * In browser mode, Tauri commands are simulated with web-based fallbacks.
 */

import { expandPresets } from "./presetExpander";
import type { XSGPattern } from "./types";

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
 * `get_pattern` でパターンを取得し、preset/background ノードを参照先の nodes に
 * 展開した「描画可能な」パターンを返す（Issue #23）。
 *
 * `safeInvoke("get_pattern", ...)` の戻りは extends 継承と `{{param}}` 置換まで
 * 解決済みだが、preset/background ノードはそのまま残る。`expandPresets` に
 * `safeInvoke("get_pattern", ...)` 自身を `getPattern` として渡すことで、参照先
 * パターン（さらにその extends/params）もモード適切（Tauri=Rust / web=fetch）に
 * 解決されつつ in-place 展開される。
 *
 * 規律3: preset 展開は TS のこの経路 1 箇所だけ。Rust 側には足さない。
 * 描画サイト（usePatternLoader / SlideshowView）は本関数を呼ぶだけでよい。
 */
export async function loadResolvedPattern(
  patternId: string,
  params: Record<string, string>
): Promise<XSGPattern> {
  const base = await safeInvoke<XSGPattern>("get_pattern", {
    patternId,
    params,
  });
  return expandPresets(base, (id, p) =>
    safeInvoke<XSGPattern>("get_pattern", { patternId: id, params: p })
  );
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

    case "load_playlist": {
      const path = (args?.path as string) || "";
      return loadPlaylistFromWeb(path) as T;
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
  let pattern = yaml.load(yamlText) as XSGPattern;

  // Resolve extends
  pattern = await resolveExtends(pattern);

  // Expand params
  pattern = expandParams(pattern, _params);

  return pattern;
}

/**
 * Load a playlist file via fetch (web mode).
 *
 * The Tauri `load_playlist` command takes a filesystem `path`; in web mode we
 * can't hit the filesystem, so we serve playlists from `public/playlists/` the
 * same way patterns come from `public/patterns/`. The incoming `path` may be a
 * bare name ("digital-signage"), a name with extension, or a relative/absolute
 * path; we reduce it to `<name>` and fetch `/playlists/<name>.yaml` (falling
 * back to `.json`).
 *
 * `loop` is defaulted to `true` to match the Rust serde `default_loop`, so a
 * playlist whose YAML omits `loop` behaves identically in web and Tauri modes.
 */
async function loadPlaylistFromWeb(path: string): Promise<unknown> {
  const { default: yaml } = await import("js-yaml");

  // Reduce the path to a bare playlist name (strip dir + extension).
  const fileName = path.replace(/\\/g, "/").split("/").pop() || path;
  const name = fileName.replace(/\.(ya?ml|json)$/i, "");

  // Try YAML first, then JSON.
  const candidates = [
    { url: `/playlists/${name}.yaml`, kind: "yaml" as const },
    { url: `/playlists/${name}.json`, kind: "json" as const },
  ];

  let lastError = "";
  for (const { url, kind } of candidates) {
    const response = await fetch(url);
    if (!response.ok) {
      lastError = `${url} -> ${response.status}`;
      continue;
    }
    const text = await response.text();
    const parsed =
      kind === "json"
        ? (JSON.parse(text) as Record<string, unknown>)
        : (yaml.load(text) as Record<string, unknown>);
    return normalizePlaylist(parsed);
  }

  throw new Error(`Playlist not found: ${name} (${lastError})`);
}

/**
 * Apply Rust-side serde defaults that aren't expressed in the raw file, so the
 * web `Playlist` matches what the Tauri command would return.
 */
function normalizePlaylist(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const playback = (raw.playback as Record<string, unknown>) || {};
  if (playback.loop === undefined) {
    // serde `default_loop` => true.
    playback.loop = true;
  }
  return { ...raw, playback };
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
