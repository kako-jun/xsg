/**
 * useFullscreen — マウント時フルスクリーン要求フックのテスト。
 *
 * Issue #14 で `PatternDisplay` から切り出した副作用フック。抽出が将来壊れない
 * よう「いつ requestFullscreen を呼ぶか／reject を握りつぶすか」の契約を固定する。
 * 守る挙動:
 *   - `ref.current` が要素を指すとき documentElement.requestFullscreen を1回だけ呼ぶ
 *   - `ref.current` が null のときは呼ばない（存在判定にだけ ref を使う）
 *   - requestFullscreen が reject しても throw せず console.warn するだけ
 *   - マウント中に多重発火しない（呼び出しは1回）
 *
 * jsdom には requestFullscreen が無いので、document.documentElement に mock を
 * 差し込み、各テスト後に restore する（リークさせない）。
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useRef, type RefObject } from "react";
import { useFullscreen } from "./useFullscreen";

// ---------------------------------------------------------------------------
// ヘルパ — requestFullscreen を mock し、テスト後に元へ戻す。
// ---------------------------------------------------------------------------

/**
 * document.documentElement.requestFullscreen を差し替える。
 * impl: Promise<void> を返すので mockResolvedValue(undefined) / mockRejectedValue。
 * 返り値の restore() を afterEach で必ず呼ぶ。
 */
function mockRequestFullscreen(impl: () => Promise<void>): {
  fn: ReturnType<typeof vi.fn>;
  restore: () => void;
} {
  const el = document.documentElement as unknown as {
    requestFullscreen?: () => Promise<void>;
  };
  const original = el.requestFullscreen;
  const fn = vi.fn(impl);
  el.requestFullscreen = fn;
  return {
    fn,
    restore: () => {
      el.requestFullscreen = original;
    },
  };
}

/** 後始末用に積んだ restore たちを afterEach でまとめて実行する。 */
const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
});

/** 要素を指す ref を返す小フックでフックを駆動する（ref.current = 実 div）。 */
function renderWithElementRef() {
  return renderHook(() => {
    const ref = useRef<HTMLDivElement | null>(null);
    // 初回レンダー時点で current を実要素に固定（マウント effect で参照される）。
    if (ref.current === null) {
      ref.current = document.createElement("div");
    }
    useFullscreen(ref);
    return ref;
  });
}

/** current=null の ref でフックを駆動する。 */
function renderWithNullRef() {
  const nullRef: RefObject<HTMLElement | null> = { current: null };
  return renderHook(() => {
    useFullscreen(nullRef);
  });
}

// ---------------------------------------------------------------------------
describe("useFullscreen", () => {
  it("ref.current が要素を指すとき requestFullscreen を1回呼ぶ", async () => {
    // --- 仕様: マウント時 ref に要素があれば documentElement にフルスクリーン要求 ---
    const { fn, restore } = mockRequestFullscreen(() =>
      Promise.resolve(undefined)
    );
    cleanups.push(restore);

    renderWithElementRef();

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
  });

  it("ref.current が null のときは requestFullscreen を呼ばない", async () => {
    // --- 仕様: ref は存在判定にだけ使う。要素が無ければ要求しない ---
    const { fn, restore } = mockRequestFullscreen(() =>
      Promise.resolve(undefined)
    );
    cleanups.push(restore);

    renderWithNullRef();

    // effect は同期的に走るので、待っても呼ばれていないことを確認する。
    await Promise.resolve();
    expect(fn).not.toHaveBeenCalled();
  });

  it("requestFullscreen が reject しても throw せず console.warn する", async () => {
    // --- 仕様: 失敗は握りつぶし console.warn のみ（呼び出し側に例外を伝播しない）---
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    cleanups.push(() => warnSpy.mockRestore());
    const { fn, restore } = mockRequestFullscreen(() =>
      Promise.reject(new Error("denied"))
    );
    cleanups.push(restore);

    // renderHook 自体が throw しない（reject は内部で catch される）。
    expect(() => renderWithElementRef()).not.toThrow();

    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(warnSpy).toHaveBeenCalledTimes(1));
    // 第1引数は抽出元と同じ警告メッセージ。
    expect(warnSpy.mock.calls[0][0]).toBe("Fullscreen request failed:");
  });

  it("マウント中に多重発火しない（rerender しても増えない）", async () => {
    // --- 仕様: effect の依存は [ref] のみ。同じ ref で再描画しても再要求しない ---
    const { fn, restore } = mockRequestFullscreen(() =>
      Promise.resolve(undefined)
    );
    cleanups.push(restore);

    const { rerender } = renderWithElementRef();
    await waitFor(() => expect(fn).toHaveBeenCalledTimes(1));

    // 同一 ref のまま複数回再描画 → effect は再実行されない。
    rerender();
    rerender();
    await Promise.resolve();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
