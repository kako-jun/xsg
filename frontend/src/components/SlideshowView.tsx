"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NodeRenderer from "./NodeRenderer";
import { useSlideshow } from "../hooks/useSlideshow";
import { resolvePath } from "../lib/pathResolver";
import type { Playlist, PlaylistSource } from "../lib/playlistTypes";
import type { PatternLoad, XSGPattern } from "../lib/types";

interface SlideshowViewProps {
  /** Playlist name (e.g. "digital-signage") taken from `?playlist=`. */
  name: string;
}

/**
 * SlideshowView — full-screen slideshow renderer.
 *
 * Loads the named playlist (Tauri command in desktop, public/ fetch in web),
 * drives playback via `useSlideshow`, and renders the current source by type.
 * It is intentionally a thin shell: all ordering/timing lives in
 * `useSlideshow` / `slideshowSequencer`, all per-source drawing in the small
 * `Slide*` components below.
 */
export default function SlideshowView({ name }: SlideshowViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request fullscreen on mount (screensaver/signage use case).
  useEffect(() => {
    if (containerRef.current && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request failed:", err);
      });
    }
  }, []);

  // Load the playlist definition.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { safeInvoke } = await import("../lib/tauriCompat");
        const data = await safeInvoke<Playlist>("load_playlist", {
          path: name,
        });
        if (!cancelled) setPlaylist(data);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load playlist:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load playlist"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [name]);

  const slideshow = useSlideshow(playlist);

  // Keyboard controls: Space = play/pause, ArrowRight/Left = next/prev.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") {
        e.preventDefault();
        slideshow.toggle();
      } else if (e.key === "ArrowRight") {
        slideshow.next();
      } else if (e.key === "ArrowLeft") {
        slideshow.prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slideshow]);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen overflow-hidden relative bg-black flex items-center justify-center"
      style={{ imageRendering: "pixelated" }}
    >
      <SlideshowBody
        loading={loading}
        error={error}
        playlist={playlist}
        current={slideshow.current}
        isStopped={slideshow.isStopped}
      />
    </div>
  );
}

interface SlideshowBodyProps {
  loading: boolean;
  error: string | null;
  playlist: Playlist | null;
  current: PlaylistSource | undefined;
  isStopped: boolean;
}

function SlideshowBody({
  loading,
  error,
  playlist,
  current,
  isStopped,
}: SlideshowBodyProps) {
  if (loading) {
    return <CenterMessage>Loading playlist...</CenterMessage>;
  }
  if (error) {
    return <CenterMessage>Error: {error}</CenterMessage>;
  }
  if (!playlist) {
    return <CenterMessage>No playlist</CenterMessage>;
  }
  if (!current) {
    return (
      <CenterMessage>
        {isStopped ? "Slideshow finished" : "No slides"}
      </CenterMessage>
    );
  }
  return <Slide source={current} />;
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black text-white">
      {children}
    </div>
  );
}

/** Dispatch a single source to its renderer. */
function Slide({ source }: { source: PlaylistSource }) {
  switch (source.type) {
    case "pattern":
      return <PatternSlide path={source.path} />;
    case "inline":
      return <InlineSlide pattern={source.pattern} />;
    case "image":
      return <ImageSlide source={source} />;
    case "url":
      return <UrlSlide source={source} />;
    default:
      return null;
  }
}

/**
 * Extract a pattern id usable by `get_pattern` from a source `path`.
 * "@/patterns/colorbar-simple.yaml" -> "colorbar-simple".
 */
function patternIdFromPath(path: string): string {
  const fileName = path.replace(/\\/g, "/").split("/").pop() || path;
  return fileName.replace(/\.(ya?ml|json)$/i, "");
}

/** Pattern source: load via get_pattern then render nodes (like PatternDisplay). */
function PatternSlide({ path }: { path: string }) {
  // Runtime load state (規律2): the loaded `XSGPattern` is an immutable
  // definition; loading/error are held alongside it in `PatternLoad` instead of
  // overloading the definition type as a state container.
  const [load, setLoad] = useState<PatternLoad>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoad({ status: "loading" });
      try {
        // get_pattern 取得 + preset/background 展開（Issue #23）。
        const { loadResolvedPattern } = await import("../lib/tauriCompat");
        const data = await loadResolvedPattern(patternIdFromPath(path), {});
        if (!cancelled) setLoad({ status: "ready", pattern: data });
      } catch (err) {
        if (!cancelled) {
          setLoad({
            status: "error",
            message:
              err instanceof Error ? err.message : "Failed to load pattern",
          });
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (load.status === "error")
    return <CenterMessage>Error: {load.message}</CenterMessage>;
  if (load.status !== "ready" || !load.pattern.nodes) return null;
  return <PatternNodes pattern={load.pattern} />;
}

/** Inline source: render the embedded pattern's nodes directly. */
function InlineSlide({ pattern }: { pattern: Record<string, unknown> }) {
  const data = pattern as unknown as XSGPattern;
  if (!data.nodes) return null;
  return <PatternNodes pattern={data} />;
}

/**
 * Shared pattern-node renderer (mirror of PatternDisplay's render path).
 *
 * Each `NodeRenderer` returns its own full-screen `<canvas class="w-full
 * h-full">`. To layer them (multi-node patterns like multi-layer-example),
 * wrap them in a `relative` box and pin every canvas with `absolute inset-0` so
 * they overlap instead of stacking/centering inside the parent flex container.
 */
function PatternNodes({ pattern }: { pattern: XSGPattern }) {
  return (
    <div className="relative w-full h-full">
      {(pattern.nodes || []).map((node) => (
        <div key={node.id} className="absolute inset-0">
          <NodeRenderer node={node} />
        </div>
      ))}
    </div>
  );
}

/** Image source: <img> with object-fit, or tiled background when `tile`. */
function ImageSlide({
  source,
}: {
  source: Extract<PlaylistSource, { type: "image" }>;
}) {
  const src = useMemo(() => resolvePath(source.src), [source.src]);

  if (source.tile) {
    const sizePx = source.tileSize ? `${source.tileSize}px` : "auto";
    return (
      <div
        className="w-full h-full"
        style={{
          backgroundImage: `url("${src}")`,
          backgroundRepeat: "repeat",
          backgroundSize: sizePx,
          backgroundColor: "black",
        }}
      />
    );
  }

  // object-fit: fall back to "contain" (screensaver-friendly, no cropping).
  const objectFit = (source.fit ?? "contain") as "contain" | "cover" | "fill";
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full"
      style={{ objectFit, backgroundColor: "black" }}
    />
  );
}

/** URL source: full-screen <iframe>. readonly disables interaction. */
function UrlSlide({
  source,
}: {
  source: Extract<PlaylistSource, { type: "url" }>;
}) {
  return (
    <iframe
      src={source.url}
      title="slideshow-url"
      className="w-full h-full border-0"
      // Playlist URLs are assumed to be trusted (a signage operator's own
      // dashboards). We still avoid the sandbox-escape combo: `allow-scripts`
      // together with `allow-same-origin` lets a framed page remove its own
      // sandbox, so we never grant both. Scripts stay enabled (dashboards need
      // them) but same-origin is withheld. readonly signage additionally blocks
      // all pointer/keyboard interaction via CSS.
      sandbox={
        source.readonly
          ? "allow-scripts allow-popups"
          : "allow-scripts allow-forms allow-popups"
      }
      style={{
        pointerEvents: source.readonly ? "none" : "auto",
        backgroundColor: "black",
      }}
    />
  );
}
