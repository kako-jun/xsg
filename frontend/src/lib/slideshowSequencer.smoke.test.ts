/**
 * Smoke test — confirms the vitest harness runs and the pure sequencer's
 * sequence-order path behaves. The exhaustive ordering suite (random/shuffle,
 * loop boundaries, durations, RNG injection) is written by a follow-up agent;
 * this only proves the infrastructure is green.
 */

import { describe, expect, it } from "vitest";
import {
  advance,
  durationFor,
  getCurrent,
  prepare,
} from "./slideshowSequencer";
import type { Playlist } from "./playlistTypes";

const playlist: Playlist = {
  playback: { order: "sequence", loop: true, defaultDuration: 4000 },
  sources: [
    { type: "pattern", path: "@/patterns/a.yaml", duration: 1000 },
    { type: "pattern", path: "@/patterns/b.yaml" },
  ],
};

describe("slideshowSequencer (smoke)", () => {
  it("walks sequence order and wraps when looping", () => {
    const s0 = prepare(playlist);
    const first = getCurrent(s0);
    expect(first).toEqual(playlist.sources![0]);

    const s1 = advance(s0);
    expect(getCurrent(s1)).toEqual(playlist.sources![1]);

    // loop:true wraps back to the start.
    const s2 = advance(s1);
    expect(getCurrent(s2)).toEqual(playlist.sources![0]);
  });

  it("resolves duration via source -> defaultDuration -> 5000", () => {
    expect(durationFor(playlist.sources![0], playlist.playback)).toBe(1000);
    // second source has no duration -> falls back to defaultDuration.
    expect(durationFor(playlist.sources![1], playlist.playback)).toBe(4000);
  });
});
