/**
 * Slideshow Sequencer (pure ordering logic)
 *
 * This is the TypeScript mirror of the Rust `PlaylistRunner`
 * (`src-tauri/src/playlist/runner.rs`). It contains *only* pure functions over
 * an explicit, immutable-ish state value so the ordering semantics can be unit
 * tested without React. `useSlideshow` wraps these in React state.
 *
 * Behaviour mirrors the Rust runner, with one documented difference for shuffle
 * (the actual shuffle *order* is not reproduced — only set membership is):
 *
 * - prepare(): for `order === "shuffle"`, shuffle the sources **once**;
 *   `sequence` and `random` keep the source array as-is (random does NOT
 *   pre-shuffle — it picks a fresh index per advance). Shuffle's resulting
 *   order depends on the injected RNG, so it is only *membership-equivalent* to
 *   the Rust runner, not order-identical (Rust uses its own `rand` shuffle).
 * - getCurrent(): the source the runner's `get_next()` would *return* for the
 *   current state. For every order this is `sources[currentIndex]` (`undefined`
 *   once a sequence/shuffle cursor has run past the end with loop disabled).
 *   getCurrent is pure: it never calls the RNG, so a slide cannot flicker
 *   between renders.
 * - advance(): the index bookkeeping `get_next()` performs *after* returning a
 *   source. sequence/shuffle do `currentIndex += 1`, wrapping to 0 only when
 *   `loop` is true. random picks a fresh uniformly random `currentIndex` (so
 *   every advance yields a new state — matching the Rust runner's "sample each
 *   `get_next`" — and random never stops, issue #20).
 * - durationFor(): `source.duration ?? playback.defaultDuration ?? 5000`.
 *
 * Separation of concerns (doctrine 規律2): `Playlist` (definition) is never
 * mutated. The mutable bits live in `SequencerState`.
 */

import type { Order, Playlist, PlaylistSource } from "./playlistTypes";

/** Default per-slide duration in ms when neither source nor playback set one. */
export const DEFAULT_SLIDE_DURATION_MS = 5000;

/**
 * Runtime ordering state. This is the `~State` companion to the `Playlist`
 * definition: it holds the prepared (possibly shuffled) source list, the
 * playback order, the loop flag and the current cursor.
 */
export interface SequencerState {
  /** Prepared source list (shuffled once for `shuffle`, else original order). */
  readonly sources: ReadonlyArray<PlaylistSource>;
  /** Playback order (copied from the definition for convenience). */
  readonly order: Order;
  /** Loop flag (copied from the definition). */
  readonly loop: boolean;
  /** Cursor used by sequence/shuffle. Unused by random. */
  readonly currentIndex: number;
}

/**
 * Injectable RNG so tests are deterministic. Returns a float in [0, 1) just
 * like `Math.random`. The default uses `Math.random`.
 */
export type Rng = () => number;

const defaultRng: Rng = Math.random;

/** Fisher–Yates shuffle over a copy (does not mutate the input). */
function shuffled<T>(items: ReadonlyArray<T>, rng: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Build the initial sequencer state from a playlist definition.
 * Mirrors `PlaylistRunner::new` + `prepare`.
 *
 * @param playlist - Playlist definition (not mutated).
 * @param rng - Optional RNG used for the one-time shuffle.
 */
export function prepare(
  playlist: Playlist,
  rng: Rng = defaultRng
): SequencerState {
  // Only explicit sources are supported (generator is out of scope, matching
  // the runner's TODO).
  const explicit = playlist.sources ?? [];

  const order = playlist.playback.order;
  const sources =
    order === "shuffle" ? shuffled(explicit, rng) : explicit.slice();

  return {
    sources,
    order,
    // `loop` defaults to true on the Rust side; the loader normalises it, but
    // guard here too so a hand-built state is well-behaved.
    loop: playlist.playback.loop,
    currentIndex: 0,
  };
}

/**
 * The source the runner's `get_next()` would return for this state, *without*
 * advancing. Returns `undefined` when there is nothing to show (empty list, or
 * the sequence/shuffle cursor has run past the end with loop disabled).
 *
 * Pure: this never calls the RNG. For `random`, the next index is chosen in
 * `advance()` and stored in `currentIndex`, so all orders read
 * `sources[currentIndex]` here. Keeping the RNG out of render means a random
 * slide stays put between renders and changes only on advance.
 */
export function getCurrent(
  state: SequencerState
): PlaylistSource | undefined {
  if (state.sources.length === 0) {
    return undefined;
  }

  // All orders are cursor-based at read time. For sequence/shuffle the cursor
  // may run past the end (=> `undefined` = stop); for random it always points
  // at a valid in-range index chosen by prepare()/advance().
  return state.sources[state.currentIndex];
}

/**
 * Advance the cursor, returning the **next state** (always a new object when
 * there is something to show, so React re-renders and re-arms the timer).
 * Mirrors the index bookkeeping `get_next()` performs after returning a source.
 *
 * - sequence/shuffle: `currentIndex += 1`, wrapping to 0 only when `loop` is
 *   true. With loop disabled the index keeps climbing past the end so the next
 *   `getCurrent()` yields `undefined` (= stop).
 * - random: pick a fresh uniformly random `currentIndex`. This is where the
 *   RNG is consumed (not in `getCurrent`), so each advance yields a different
 *   slide and a brand-new state. Random never advances "past the end", so it
 *   never stops — matching the Rust runner and the documented behaviour, even
 *   with `loop: false` (issue #20).
 *
 * @param rng - Optional RNG used only for `random` order.
 */
export function advance(
  state: SequencerState,
  rng: Rng = defaultRng
): SequencerState {
  if (state.sources.length === 0) {
    return state;
  }

  if (state.order === "random") {
    // Re-sample every advance (mirrors the Rust runner sampling per get_next).
    // Always returns a new object so React never bails out of the update.
    const nextIndex = Math.floor(rng() * state.sources.length);
    return { ...state, currentIndex: nextIndex };
  }

  let nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.sources.length && state.loop) {
    nextIndex = 0;
  }

  return { ...state, currentIndex: nextIndex };
}

/**
 * Step the cursor backwards (UI affordance; the Rust runner has no `prev`, so
 * this is a frontend-only convenience). sequence/shuffle move one slot back,
 * wrapping to the last item when looping. random is left unchanged (its
 * "current" is sampled fresh each render anyway).
 */
export function retreat(state: SequencerState): SequencerState {
  if (state.sources.length === 0 || state.order === "random") {
    return state;
  }

  let prevIndex = state.currentIndex - 1;
  if (prevIndex < 0) {
    prevIndex = state.loop ? state.sources.length - 1 : 0;
  }

  return { ...state, currentIndex: prevIndex };
}

/**
 * Resolve the display duration (ms) for a source. Mirrors
 * `PlaylistRunner::get_duration`:
 * `source.duration ?? playback.defaultDuration ?? 5000`.
 */
export function durationFor(
  source: PlaylistSource,
  playback: Playlist["playback"]
): number {
  return (
    source.duration ?? playback.defaultDuration ?? DEFAULT_SLIDE_DURATION_MS
  );
}

/**
 * Whether the slideshow has more to show. Mirrors
 * `PlaylistRunner::should_continue`: empty → false; looping → always true;
 * otherwise true until every item has been shown once.
 */
export function shouldContinue(state: SequencerState): boolean {
  if (state.sources.length === 0) {
    return false;
  }
  if (state.loop) {
    return true;
  }
  return state.currentIndex < state.sources.length;
}
