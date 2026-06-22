/**
 * slideshowSequencer — exhaustive ordering suite (pure functions, deterministic).
 *
 * これは Rust の golden（`src-tauri/tests/golden_e2e.rs` の runner 系）の
 * フロント鏡像。Rust の `PlaylistRunner` が `get_next()` で「返す」と「index 前進」を
 * 同時に行うのに対し、TS 側は `getCurrent()`（返す）と `advance()`（前進）に分離している。
 * したがって Rust の `get_next()` 1回 = TS の `getCurrent()` → `advance()` の対に対応する。
 *
 * 非決定（shuffle/random）は `Rng = () => number` を注入して決定論化する。
 * Rust 流儀に倣い、shuffle/random は原則として順序でなく集合（メンバーシップ）で主張し、
 * seeded rng を使うときだけ具体値も確認する（Math.random は順序 assert に持ち込まない）。
 */

import { describe, expect, it } from "vitest";
import {
  advance,
  durationFor,
  getCurrent,
  prepare,
  retreat,
  shouldContinue,
  DEFAULT_SLIDE_DURATION_MS,
  type Rng,
  type SequencerState,
} from "./slideshowSequencer";
import type { Order, Playlist, PlaylistSource } from "./playlistTypes";

// ---------------------------------------------------------------------------
// テスト用ヘルパ
// ---------------------------------------------------------------------------

/** pattern source を1件作る（path と任意の個別 duration）。Rust の pattern_source 相当。 */
function patternSource(path: string, duration?: number): PlaylistSource {
  return duration === undefined
    ? { type: "pattern", path }
    : { type: "pattern", path, duration };
}

/** runner に渡す Playlist を直接構築する。Rust の make_playlist 相当。 */
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

/** pattern source の path を取り出す（検証用）。Rust の source_path 相当。 */
function sourcePath(s: PlaylistSource | undefined): string {
  if (s && s.type === "pattern") return s.path;
  throw new Error(`テストは pattern source のみ使う: ${JSON.stringify(s)}`);
}

/**
 * 決定論 RNG: 与えた float 列を順に返し、尽きたら 0 を返す。
 * Fisher–Yates の各ステップで `j = floor(rng() * (i+1))` を踏むので、
 * 返す値を設計すれば shuffle の結果を完全に固定できる。
 */
function seqRng(values: number[]): Rng {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

// ---------------------------------------------------------------------------
// prepare — 並べ替え・不変性
// ---------------------------------------------------------------------------

describe("prepare", () => {
  it("shuffle は seeded rng で特定順に並べ替える", () => {
    // --- 仕様: order=shuffle は prepare() で1回だけ Fisher–Yates する ---
    // shuffled() は i=len-1..1 で j=floor(rng()*(i+1)) を引く。len=4 のとき:
    //   i=3: rng=0 → j=floor(0*4)=0 → swap(3,0)  [d,b,c,a]
    //   i=2: rng=0 → j=floor(0*3)=0 → swap(2,0)  [c,b,d,a]
    //   i=1: rng=0 → j=floor(0*2)=0 → swap(1,0)  [b,c,d,a]
    // よって rng が常に 0 を返すなら [a,b,c,d] → [b,c,d,a] に固定される。
    const sources = [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
      patternSource("d"),
    ];
    const playlist = makePlaylist("shuffle", false, undefined, sources);
    const state = prepare(playlist, seqRng([0, 0, 0]));
    expect(state.sources.map((s) => sourcePath(s))).toEqual([
      "b",
      "c",
      "d",
      "a",
    ]);
  });

  it("sequence は順序を維持する（事前シャッフルしない）", () => {
    // --- 仕様: order=sequence は投入順をそのまま保持する ---
    const sources = [patternSource("a"), patternSource("b"), patternSource("c")];
    const playlist = makePlaylist("sequence", true, undefined, sources);
    // rng が呼ばれても結果が変わらないことを示すため、攪乱用の値を渡しておく。
    const state = prepare(playlist, seqRng([0.9, 0.1, 0.5]));
    expect(state.sources.map((s) => sourcePath(s))).toEqual(["a", "b", "c"]);
  });

  it("random は順序を維持する（random は事前シャッフルしない）", () => {
    // --- 仕様: order=random は prepare 時にシャッフルせず、毎回サンプリングする ---
    const sources = [patternSource("a"), patternSource("b"), patternSource("c")];
    const playlist = makePlaylist("random", true, undefined, sources);
    const state = prepare(playlist, seqRng([0.9, 0.1, 0.5]));
    expect(state.sources.map((s) => sourcePath(s))).toEqual(["a", "b", "c"]);
  });

  it("Playlist 定義を変更しない（不変性 / 規律2）", () => {
    // --- 仕様: prepare() は定義(Playlist)を mutate しない（shuffle でも元配列は不変）---
    const sources = [patternSource("a"), patternSource("b"), patternSource("c")];
    const playlist = makePlaylist("shuffle", false, undefined, sources);
    const before = JSON.parse(JSON.stringify(playlist));
    prepare(playlist, seqRng([0.7, 0.7, 0.7]));
    expect(playlist).toEqual(before);
    // 元 sources 配列の参照内容も並べ替わっていないこと。
    expect(playlist.sources!.map((s) => sourcePath(s))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("初期 currentIndex は 0", () => {
    // --- 仕様: prepare 直後のカーソルは先頭(0) ---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a"),
    ]);
    expect(prepare(playlist).currentIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sequence — 投入順・loop wrap・非ループ停止
//   Rust: runner_sequence_order_is_deterministic_and_loops
//        runner_inproc_should_continue_stops_after_all_items_when_no_loop
// ---------------------------------------------------------------------------

describe("sequence", () => {
  it("getCurrent→advance を繰り返すと投入順で出る（決定論）", () => {
    // --- 仕様: Sequence は投入順をそのまま返す（Rust と同じく順序まで固定検証）---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    let s = prepare(playlist);
    expect(sourcePath(getCurrent(s))).toBe("a");
    s = advance(s);
    expect(sourcePath(getCurrent(s))).toBe("b");
    s = advance(s);
    expect(sourcePath(getCurrent(s))).toBe("c");
  });

  it("loop:true は末尾の次で先頭へ wrap する", () => {
    // --- 仕様: loop=true は末尾の次で先頭(0)へ wrap する ---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    let s = prepare(playlist);
    s = advance(advance(advance(s))); // a→b→c を消化し、c の次へ
    // wrap して先頭 a に戻る。
    expect(sourcePath(getCurrent(s))).toBe("a");
    s = advance(s);
    expect(sourcePath(getCurrent(s))).toBe("b");
  });

  it("loop:false は全件消化後 getCurrent が undefined（=停止）", () => {
    // --- 仕様: loop=false は全件消化後カーソルが末尾を超え、getCurrent が undefined を返す ---
    // Rust の「全件消化後の get_next() は None」に対応（末尾超過の境界）。
    const playlist = makePlaylist("sequence", false, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    let s = prepare(playlist);
    expect(sourcePath(getCurrent(s))).toBe("a");
    s = advance(s);
    expect(sourcePath(getCurrent(s))).toBe("b");
    s = advance(s); // index=2 == len、wrap しない
    expect(getCurrent(s)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// shuffle — メンバーシップ保存（順序は seeded のみ固定）
//   Rust: runner_inproc_shuffle_preserves_membership_not_order
// ---------------------------------------------------------------------------

describe("shuffle", () => {
  it("advance で全件辿ると集合が入力と一致する（メンバーシップ保存）", () => {
    // --- 仕様: Shuffle は順序を変えるが集合（メンバーシップ）は保存する ---
    // Rust 流儀: 順序でなく集合・件数で判定する。
    const inputPaths = ["a", "b", "c", "d"];
    const playlist = makePlaylist(
      "shuffle",
      false,
      undefined,
      inputPaths.map((p) => patternSource(p))
    );
    // seeded rng（攪乱あり）でシャッフルしても集合は変わらないことを示す。
    let s = prepare(playlist, seqRng([0.3, 0.6, 0.1]));
    const seen = new Set<string>();
    for (let i = 0; i < inputPaths.length; i++) {
      seen.add(sourcePath(getCurrent(s)));
      s = advance(s);
    }
    expect(seen).toEqual(new Set(inputPaths));
  });

  it("seeded rng では順序も具体的に固定される（決定論の確認）", () => {
    // --- 仕様: shuffle は1回限りの並べ替えで、同じ rng なら順序も再現する ---
    // rng が常に 0 → [a,b,c,d] が [b,c,d,a] になる（prepare のケースと同じ計算）。
    const playlist = makePlaylist("shuffle", false, undefined, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
      patternSource("d"),
    ]);
    let s = prepare(playlist, seqRng([0, 0, 0]));
    const order: string[] = [];
    for (let i = 0; i < 4; i++) {
      order.push(sourcePath(getCurrent(s)));
      s = advance(s);
    }
    expect(order).toEqual(["b", "c", "d", "a"]);
  });
});

// ---------------------------------------------------------------------------
// random — 入力メンバーを返す・advance は状態不変（#20）
//   Rust: runner_inproc_random_returns_only_input_members
// ---------------------------------------------------------------------------

describe("random", () => {
  it("getCurrent は毎回入力集合のメンバーを返す", () => {
    // --- 仕様: Random は毎回 0..len から乱択する。返る要素は必ず入力集合のメンバー ---
    const inputPaths = ["a", "b", "c"];
    const playlist = makePlaylist(
      "random",
      true,
      undefined,
      inputPaths.map((p) => patternSource(p))
    );
    const s = prepare(playlist);
    const input = new Set(inputPaths);
    // 様々な rng 値で 30 回引いて、すべて入力メンバーであることを確認。
    const rng = seqRng([0.0, 0.34, 0.67, 0.99, 0.5, 0.1, 0.9, 0.2, 0.8, 0.45]);
    for (let i = 0; i < 30; i++) {
      const got = sourcePath(getCurrent(s, rng));
      expect(input.has(got)).toBe(true);
    }
  });

  it("seeded rng で getCurrent の具体値が決まる", () => {
    // --- 仕様: index = floor(rng() * len)。rng を固定すれば返る source も決まる ---
    const playlist = makePlaylist("random", true, undefined, [
      patternSource("a"), // index 0
      patternSource("b"), // index 1
      patternSource("c"), // index 2
    ]);
    const s = prepare(playlist);
    // floor(0.0*3)=0→a, floor(0.5*3)=1→b, floor(0.99*3)=2→c
    expect(sourcePath(getCurrent(s, seqRng([0.0])))).toBe("a");
    expect(sourcePath(getCurrent(s, seqRng([0.5])))).toBe("b");
    expect(sourcePath(getCurrent(s, seqRng([0.99])))).toBe("c");
  });

  it("advance は状態を変えない（index 不変＝止まらない / #20）", () => {
    // --- 仕様: Random は advance でカーソルを動かさない（既知仕様 #20: 永遠に止まらない）---
    const playlist = makePlaylist("random", false, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const s0 = prepare(playlist);
    const s1 = advance(s0);
    // currentIndex が 0 のまま（状態オブジェクトの index 不変）。
    expect(s1.currentIndex).toBe(s0.currentIndex);
    expect(s1.currentIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// retreat — UI 専用の後退（Rust runner には無い frontend 限定機能）
// ---------------------------------------------------------------------------

describe("retreat", () => {
  it("sequence は1つ前へ戻る", () => {
    // --- 仕様: retreat は sequence/shuffle のカーソルを1つ戻す ---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    let s = prepare(playlist);
    s = advance(advance(s)); // index=2 (c)
    expect(sourcePath(getCurrent(s))).toBe("c");
    s = retreat(s);
    expect(sourcePath(getCurrent(s))).toBe("b");
  });

  it("loop:true は先頭で末尾へ wrap する", () => {
    // --- 仕様: loop=true のとき先頭(0)から retreat すると末尾へ wrap する ---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a"),
      patternSource("b"),
      patternSource("c"),
    ]);
    const s0 = prepare(playlist); // index=0
    const s1 = retreat(s0);
    expect(sourcePath(getCurrent(s1))).toBe("c"); // 末尾へ wrap
  });

  it("loop:false は先頭で 0 に留まる", () => {
    // --- 仕様: loop=false のとき先頭から retreat しても index は 0 に留まる（負にしない）---
    const playlist = makePlaylist("sequence", false, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const s0 = prepare(playlist);
    const s1 = retreat(s0);
    expect(s1.currentIndex).toBe(0);
  });

  it("random は状態を変えない", () => {
    // --- 仕様: random は retreat しても状態不変（current は毎回サンプリングされる）---
    const playlist = makePlaylist("random", true, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    const s0 = prepare(playlist);
    expect(retreat(s0)).toEqual(s0);
  });
});

// ---------------------------------------------------------------------------
// durationFor — source.duration > defaultDuration > 5000
//   Rust: runner_inproc_get_duration_priority_source_then_default_then_fallback
//        runner_inproc_get_duration_falls_back_to_5000_when_nothing_set
// ---------------------------------------------------------------------------

describe("durationFor", () => {
  it("source 個別 duration が最優先", () => {
    // --- 仕様: source.duration があればそれを最優先で使う ---
    const playback: Playlist["playback"] = {
      order: "sequence",
      loop: false,
      defaultDuration: 7000,
    };
    expect(durationFor(patternSource("s1", 2000), playback)).toBe(2000);
  });

  it("個別が無ければ playback.defaultDuration を使う", () => {
    // --- 仕様: source.duration が無ければ defaultDuration にフォールバック ---
    const playback: Playlist["playback"] = {
      order: "sequence",
      loop: false,
      defaultDuration: 7000,
    };
    expect(durationFor(patternSource("s2"), playback)).toBe(7000);
  });

  it("個別も default も無ければ既定値 5000ms", () => {
    // --- 仕様: source も default も無いとき既定値 5000ms に落ちる ---
    const playback: Playlist["playback"] = { order: "sequence", loop: false };
    expect(durationFor(patternSource("only"), playback)).toBe(
      DEFAULT_SLIDE_DURATION_MS
    );
    expect(DEFAULT_SLIDE_DURATION_MS).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// shouldContinue — 空→false、loop→true、sequence/shuffle は全件後 false
//   Rust: should_continue 系（loop=false で全件後停止）
// ---------------------------------------------------------------------------

describe("shouldContinue", () => {
  it("空リストは false", () => {
    // --- 仕様: sources が空なら継続しない ---
    const playlist = makePlaylist("sequence", true, undefined, []);
    expect(shouldContinue(prepare(playlist))).toBe(false);
  });

  it("loop:true は全件消化後も常に true", () => {
    // --- 仕様: loop=true は常に継続（カーソルが進んでも true のまま）---
    const playlist = makePlaylist("sequence", true, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    let s = prepare(playlist);
    expect(shouldContinue(s)).toBe(true);
    s = advance(advance(s)); // 全件消化（loop なので index は wrap して 0）
    expect(shouldContinue(s)).toBe(true);
  });

  it("sequence(loop:false) は全件消化後に false", () => {
    // --- 仕様: loop=false は全件消化後に停止する（Rust の回帰ガード #17 と同義）---
    const playlist = makePlaylist("sequence", false, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    let s = prepare(playlist);
    expect(shouldContinue(s)).toBe(true); // 再生前は継続可
    s = advance(s); // index -> 1
    expect(shouldContinue(s)).toBe(true); // 1件目消化後もまだ継続可
    s = advance(s); // index -> 2 (== len)
    expect(shouldContinue(s)).toBe(false); // 全件後は停止
  });

  it("shuffle(loop:false) も全件消化後に false", () => {
    // --- 仕様: shuffle も sequence と同じカーソル制御なので全件後 false ---
    const playlist = makePlaylist("shuffle", false, undefined, [
      patternSource("a"),
      patternSource("b"),
    ]);
    let s = prepare(playlist, seqRng([0, 0]));
    s = advance(advance(s)); // index -> 2 (== len)
    expect(shouldContinue(s)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// エッジケース: 空リストでの各関数の安全性
// ---------------------------------------------------------------------------

describe("空リストの安全性", () => {
  const emptyState = (order: Order): SequencerState =>
    prepare(makePlaylist(order, true, undefined, []));

  it("getCurrent は undefined", () => {
    // --- 仕様: 空リストでは何も表示しない ---
    expect(getCurrent(emptyState("sequence"))).toBeUndefined();
    expect(getCurrent(emptyState("random"))).toBeUndefined();
  });

  it("advance / retreat は状態を変えない", () => {
    // --- 仕様: 空リストで advance/retreat してもクラッシュせず状態不変 ---
    const s = emptyState("sequence");
    expect(advance(s)).toEqual(s);
    expect(retreat(s)).toEqual(s);
  });
});
