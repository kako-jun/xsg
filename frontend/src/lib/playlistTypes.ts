/**
 * Playlist Type Definitions (definition data, immutable)
 *
 * These types mirror the Rust serde shapes in
 * `src-tauri/src/playlist/models.rs`. They describe the *definition* of a
 * playlist (loaded from YAML/JSON) and must never be used as a container for
 * runtime playback state (current index, isPlaying, ...). Runtime state lives
 * in `slideshowSequencer.ts` / `useSlideshow.ts` under separate `~State` types.
 *
 * Wire-format notes (must match Rust):
 * - `Order` serializes lowercase: "sequence" | "random" | "shuffle".
 * - `Playback.loop_playback` is serialized as `loop` (serde rename).
 * - `Playback.default_duration` is serialized as `defaultDuration`.
 * - `PlaylistSource` is a tagged union with discriminator `type`.
 * - `ImageSource.tile_size` is serialized as `tileSize`.
 */

/** Playback order. Mirrors Rust `Order` (rename_all = "lowercase"). */
export type Order = "sequence" | "random" | "shuffle";

/**
 * Playback configuration (definition).
 * `loop` defaults to `true` on the Rust side (`default_loop`), so when a
 * playlist comes through with `loop` absent we treat it as `true`.
 */
export interface Playback {
  order: Order;
  /** Wire key is `loop`. Defaults to true (matches Rust `default_loop`). */
  loop: boolean;
  /** Wire key is `defaultDuration`. Milliseconds. */
  defaultDuration?: number;
}

/** Pattern source (file path to a pattern YAML). */
export interface PatternSource {
  type: "pattern";
  path: string;
  duration?: number;
}

/** URL source (web page shown in an iframe). */
export interface UrlSource {
  type: "url";
  url: string;
  readonly?: boolean;
  duration?: number;
}

/** Image source (single image, optionally tiled). */
export interface ImageSource {
  type: "image";
  src: string;
  fit?: "contain" | "cover" | "fill";
  tile?: boolean;
  /** Wire key is `tileSize`. */
  tileSize?: number;
  duration?: number;
}

/** Inline source (a pattern definition embedded directly in the playlist). */
export interface InlineSource {
  type: "inline";
  /** Inline XSG pattern object (canvas/nodes/...). */
  pattern: Record<string, unknown>;
  duration?: number;
}

/** Tagged union of all playlist sources. Discriminator is `type`. */
export type PlaylistSource =
  | PatternSource
  | UrlSource
  | ImageSource
  | InlineSource;

/** Layer constraints for the (not-yet-supported) generator. */
export interface LayerConstraints {
  min?: number;
  max?: number;
}

/** Generator constraints. */
export interface Constraints {
  presets?: string[];
  layers?: LayerConstraints;
  colors?: string[];
}

/**
 * Pattern generator configuration (definition).
 * Generator-driven sources are out of scope for this phase; the type is kept
 * so the wire shape round-trips, but `prepare()` ignores it (mirrors the
 * runner's `TODO` for generator integration).
 */
export interface Generator {
  enabled: boolean;
  count?: number;
  duration?: number;
  constraints?: Constraints;
}

/** Playlist definition. Mirrors Rust `Playlist`. */
export interface Playlist {
  playback: Playback;
  sources?: PlaylistSource[];
  generator?: Generator;
}
