/**
 * useSlideshow — runtime playback state for a playlist.
 *
 * The ordering/timing semantics live in the pure `slideshowSequencer` module
 * (the TS mirror of Rust `PlaylistRunner`). This hook only owns the React
 * runtime state (`SlideshowState`) and the timer that advances slides. The
 * `Playlist` definition passed in is never mutated.
 *
 * Public API:
 * - `current`     — the source to display now (or undefined when stopped/empty).
 * - `isPlaying`   — whether the auto-advance timer is running.
 * - `isStopped`   — true once a non-looping playlist has run past its end.
 * - `index`       — current cursor (sequence/shuffle); meaningless for random.
 * - `play()/pause()/toggle()` — control the timer.
 * - `next()/prev()` — manual navigation (resets the timer).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Playlist, PlaylistSource } from "../lib/playlistTypes";
import {
  advance,
  durationFor,
  getCurrent,
  prepare,
  retreat,
  shouldContinue,
  type Rng,
  type SequencerState,
} from "../lib/slideshowSequencer";

export interface SlideshowState {
  /** Source to render now, or undefined when nothing should be shown. */
  current: PlaylistSource | undefined;
  /** Auto-advance timer running. */
  isPlaying: boolean;
  /** Non-looping playlist exhausted (no further slides). */
  isStopped: boolean;
  /** Current cursor (sequence/shuffle). For `random` this stays 0. */
  index: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
}

export interface UseSlideshowOptions {
  /** Start playing immediately. Default true. */
  autoPlay?: boolean;
  /** Injectable RNG (tests/determinism). Default Math.random. */
  rng?: Rng;
}

export function useSlideshow(
  playlist: Playlist | null,
  options: UseSlideshowOptions = {}
): SlideshowState {
  const { autoPlay = true, rng } = options;

  // Prepare once per playlist identity (one-time shuffle for `shuffle` order).
  const initialState = useMemo<SequencerState | null>(
    () => (playlist ? prepare(playlist, rng) : null),
    [playlist, rng]
  );

  const [seqState, setSeqState] = useState<SequencerState | null>(initialState);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Reset sequencer state whenever the playlist (and thus prepared state)
  // changes identity.
  useEffect(() => {
    setSeqState(initialState);
    setIsPlaying(autoPlay);
  }, [initialState, autoPlay]);

  // For `random`, getCurrent samples a fresh index each call. We freeze that
  // sample per advance step into `current` so a slide does not "flicker"
  // between renders while it is on screen. The sample is recomputed only when
  // the underlying sequencer state changes (i.e. on each advance/next/prev).
  const current = useMemo<PlaylistSource | undefined>(
    () => (seqState ? getCurrent(seqState, rng) : undefined),
    [seqState, rng]
  );

  // A non-looping playlist is "stopped" once getCurrent yields nothing while
  // there are sources (cursor ran past the end). Empty playlist is also stopped.
  const isStopped = useMemo<boolean>(() => {
    if (!seqState) return true;
    if (seqState.sources.length === 0) return true;
    return !shouldContinue(seqState) && current === undefined;
  }, [seqState, current]);

  const doAdvance = useCallback(() => {
    setSeqState((prev) => (prev ? advance(prev) : prev));
  }, []);

  const doRetreat = useCallback(() => {
    setSeqState((prev) => (prev ? retreat(prev) : prev));
  }, []);

  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);
  const toggle = useCallback(() => setIsPlaying((p) => !p), []);

  const next = useCallback(() => {
    doAdvance();
  }, [doAdvance]);

  const prev = useCallback(() => {
    doRetreat();
  }, [doRetreat]);

  // Auto-advance timer. Re-armed whenever the current slide or play state
  // changes. Uses the per-source duration (mirrors runner's get_duration).
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isPlaying || !seqState || !current) {
      return;
    }

    const ms = durationFor(current, playlistPlayback(playlist));
    timerRef.current = setTimeout(() => {
      doAdvance();
    }, ms);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, seqState, current, playlist, doAdvance]);

  return {
    current,
    isPlaying,
    isStopped,
    index: seqState?.currentIndex ?? 0,
    play,
    pause,
    toggle,
    next,
    prev,
  };
}

/** Narrow helper: a non-null playback config (used for duration resolution). */
function playlistPlayback(playlist: Playlist | null): Playlist["playback"] {
  return playlist?.playback ?? { order: "sequence", loop: true };
}
