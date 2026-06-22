/**
 * useSlideshow — タイマー駆動フックのテスト（fake timers・決定論）。
 *
 * これは Rust golden（`src-tauri/tests/golden_e2e.rs` の runner 系）の
 * フロント鏡像のうち「時間で次へ送る」レイヤを担う。順序/duration/loop の
 * 意味論そのものは純粋シーケンサ（slideshowSequencer.test.ts）で検証済みなので、
 * ここではフックが
 *   - 各スライドの duration 経過で advance する（runner の get_duration → 次の get_next）
 *   - pause/play でタイマーを止める/再開する
 *   - loop=false の sequence で全件後に停止する（runner の should_continue=false 相当）
 *   - 個別 duration / defaultDuration を尊重する
 *   - next/prev が即時にカーソルを動かす
 * を主張する。見た目（SlideshowView の描画）は対象外＝別途ライブ確認。
 *
 * 非決定（shuffle/random）は持ち込まない。タイマーは vi.useFakeTimers() で
 * 完全に決定論化し、advanceTimersByTime で時間を手動で進める。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useSlideshow } from "./useSlideshow";
import type { Order, Playlist, PlaylistSource } from "../lib/playlistTypes";

// ---------------------------------------------------------------------------
// ヘルパ（sequencer テストと同じ流儀で Playlist を組む）
// ---------------------------------------------------------------------------

/** pattern source を1件作る（path と任意の個別 duration）。 */
function patternSource(path: string, duration?: number): PlaylistSource {
  return duration === undefined
    ? { type: "pattern", path }
    : { type: "pattern", path, duration };
}

/** useSlideshow に渡す Playlist を直接構築する。 */
function makePlaylist(
  order: Order,
  loop: boolean,
  defaultDuration: number | undefined,
  sources: PlaylistSource[]
): Playlist {
  return {
    playback:
      defaultDuration === undefined
        ? { order, loop }
        : { order, loop, defaultDuration },
    sources,
  };
}

/** current の path を取り出す（検証用）。 */
function currentPath(s: PlaylistSource | undefined): string | undefined {
  if (s === undefined) return undefined;
  if (s.type === "pattern") return s.path;
  throw new Error(`テストは pattern source のみ使う: ${JSON.stringify(s)}`);
}

// fake timers をテストごとに張り替える（リークさせない）。
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 自動送り — duration 経過で次のスライドへ
// ---------------------------------------------------------------------------

describe("自動送り（タイマー）", () => {
  it("各スライドの個別 duration 経過で次へ送られる", () => {
    // --- 仕様: 再生中、現在スライドの duration(ms) 経過で advance する ---
    // a=1000ms, b=2000ms, c=3000ms。runner の get_next→get_duration→次の get_next に対応。
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a", 1000),
      patternSource("b", 2000),
      patternSource("c", 3000),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));

    // 初期は autoPlay=true で先頭 a を表示・再生中。
    expect(currentPath(result.current.current)).toBe("a");
    expect(result.current.isPlaying).toBe(true);

    // a の 1000ms 経過 → b へ。
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentPath(result.current.current)).toBe("b");

    // b は 2000ms。1999ms ではまだ送られない（境界の手前）。
    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(currentPath(result.current.current)).toBe("b");

    // 残り 1ms で 2000ms 到達 → c へ。
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(currentPath(result.current.current)).toBe("c");
  });

  it("duration 未指定スライドは defaultDuration を尊重する", () => {
    // --- 仕様: 個別 duration が無いスライドは playback.defaultDuration(ms) で送られる ---
    const playlist = makePlaylist("sequence", true, 2500, [
      patternSource("a"), // 個別なし → defaultDuration=2500
      patternSource("b"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(currentPath(result.current.current)).toBe("a");

    // defaultDuration 未満では送られない。
    act(() => {
      vi.advanceTimersByTime(2499);
    });
    expect(currentPath(result.current.current)).toBe("a");

    // 2500ms 到達で b へ。
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(currentPath(result.current.current)).toBe("b");
  });

  it("loop:true は末尾の次で先頭へ wrap して送り続ける", () => {
    // --- 仕様: loop=true は末尾消化後に先頭へ wrap し、タイマーで回り続ける ---
    const playlist = makePlaylist("sequence", true, 1000, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(currentPath(result.current.current)).toBe("a");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentPath(result.current.current)).toBe("b");

    // b の次（末尾の次）で先頭 a へ wrap。
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentPath(result.current.current)).toBe("a");
    // wrap 後も再生継続。
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.isStopped).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// pause / play — タイマーの停止と再開
// ---------------------------------------------------------------------------

describe("pause / play", () => {
  it("pause でタイマーが止まり、時間が経っても送られない", () => {
    // --- 仕様: pause() 後は isPlaying=false になりタイマーが解除され、自動送りが止まる ---
    const playlist = makePlaylist("sequence", true, 1000, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(currentPath(result.current.current)).toBe("a");

    act(() => {
      result.current.pause();
    });
    expect(result.current.isPlaying).toBe(false);

    // pause 中は何ms 経っても a のまま。
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(currentPath(result.current.current)).toBe("a");
  });

  it("play で再開し、新しい duration からタイマーが再武装される", () => {
    // --- 仕様: pause→play でタイマーが再武装され、現在スライドの duration 経過で再び送られる ---
    const playlist = makePlaylist("sequence", true, 1000, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));

    act(() => {
      result.current.pause();
    });
    act(() => {
      vi.advanceTimersByTime(5000); // pause 中は無効
    });
    expect(currentPath(result.current.current)).toBe("a");

    // 再開すると a の 1000ms から再び計測される。
    act(() => {
      result.current.play();
    });
    expect(result.current.isPlaying).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentPath(result.current.current)).toBe("b");
  });

  it("toggle は再生状態を反転する", () => {
    // --- 仕様: toggle() は isPlaying を反転する（再生↔一時停止のトグル）---
    const playlist = makePlaylist("sequence", true, 1000, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isPlaying).toBe(true);
  });

  it("autoPlay:false は再生せず、最初のスライドで止まったまま", () => {
    // --- 仕様: autoPlay=false で初期化すると isPlaying=false でタイマーは動かない ---
    const playlist = makePlaylist("sequence", true, 1000, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const { result } = renderHook(() =>
      useSlideshow(playlist, { autoPlay: false })
    );
    expect(result.current.isPlaying).toBe(false);
    expect(currentPath(result.current.current)).toBe("a");

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    // 自動送りしないので a のまま。
    expect(currentPath(result.current.current)).toBe("a");
  });
});

// ---------------------------------------------------------------------------
// 停止 — loop:false の sequence で全件後に止まる（runner.should_continue=false 相当）
// ---------------------------------------------------------------------------

describe("loop:false の停止", () => {
  it("全件消化後に current が undefined になり isStopped=true で止まる", () => {
    // --- 仕様: loop=false の sequence は全件タイマーで送ったあと、
    //          現在ソースが undefined（=停止シグナル）になり isStopped=true になる ---
    // Rust golden の「全件後 get_next()=None / should_continue()=false」のフロント対応。
    const playlist = makePlaylist("sequence", false, 1000, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(currentPath(result.current.current)).toBe("a");
    expect(result.current.isStopped).toBe(false);

    // a → b
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentPath(result.current.current)).toBe("b");
    expect(result.current.isStopped).toBe(false);

    // b の duration 経過で末尾を超え、current=undefined・停止。
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.current).toBeUndefined();
    expect(result.current.isStopped).toBe(true);
  });

  it("停止後はさらに時間が経っても何も起きない（タイマー解除済み）", () => {
    // --- 仕様: 停止後は current=undefined のままタイマーが再武装されない ---
    const playlist = makePlaylist("sequence", false, 1000, [
      patternSource("a"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    // 1件だけ → a の duration 経過で末尾超過＝停止。
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.current).toBeUndefined();
    expect(result.current.isStopped).toBe(true);

    // さらに時間を進めてもクラッシュせず停止のまま。
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.current).toBeUndefined();
    expect(result.current.isStopped).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 手動ナビゲーション — next / prev は即時にカーソルを動かす
// ---------------------------------------------------------------------------

describe("手動ナビゲーション", () => {
  it("next は即時に次のスライドへ進む", () => {
    // --- 仕様: next() は advance を即時に呼び、タイマーを待たず次へ送る ---
    const playlist = makePlaylist("sequence", true, 5000, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(currentPath(result.current.current)).toBe("a");

    // タイマー(5000ms)を待たずに next で即 b へ。
    act(() => {
      result.current.next();
    });
    expect(currentPath(result.current.current)).toBe("b");
    expect(result.current.index).toBe(1);
  });

  it("prev は即時に前のスライドへ戻る", () => {
    // --- 仕様: prev() は retreat を即時に呼び、1つ前のスライドへ戻す ---
    const playlist = makePlaylist("sequence", true, 5000, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));

    act(() => {
      result.current.next(); // a→b
      result.current.next(); // b→c
    });
    expect(currentPath(result.current.current)).toBe("c");

    act(() => {
      result.current.prev(); // c→b
    });
    expect(currentPath(result.current.current)).toBe("b");
    expect(result.current.index).toBe(1);
  });

  it("next 後はその新スライドの duration からタイマーが再計測される", () => {
    // --- 仕様: next() でカーソルが動くとタイマーが再武装され、新スライドの duration で送られる ---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a", 5000),
      patternSource("b", 1000),
      patternSource("c", 5000),
    ]);
    const { result } = renderHook(() => useSlideshow(playlist));

    // a の途中(2000ms)で next → b へ。残りタイマーは破棄される。
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(currentPath(result.current.current)).toBe("a");
    act(() => {
      result.current.next();
    });
    expect(currentPath(result.current.current)).toBe("b");

    // b は 1000ms。a の残り(3000ms)ではなく b の 1000ms で c へ。
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(currentPath(result.current.current)).toBe("c");
  });
});

// ---------------------------------------------------------------------------
// 空 / null playlist — 安全に停止扱い
// ---------------------------------------------------------------------------

describe("空・null playlist", () => {
  it("null playlist は current=undefined・isStopped=true", () => {
    // --- 仕様: playlist が null なら何も表示せず停止扱い ---
    const { result } = renderHook(() => useSlideshow(null));
    expect(result.current.current).toBeUndefined();
    expect(result.current.isStopped).toBe(true);
    // タイマーを進めてもクラッシュしない。
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.current).toBeUndefined();
  });

  it("空 sources は current=undefined・isStopped=true", () => {
    // --- 仕様: sources が空なら何も表示せず停止扱い（runner と同じ）---
    const playlist = makePlaylist("sequence", true, 1000, []);
    const { result } = renderHook(() => useSlideshow(playlist));
    expect(result.current.current).toBeUndefined();
    expect(result.current.isStopped).toBe(true);
  });
});
