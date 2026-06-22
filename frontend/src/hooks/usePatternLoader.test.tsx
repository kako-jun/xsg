/**
 * usePatternLoader — pattern 名から XSGPattern を読み込む runtime 状態フックのテスト。
 *
 * Issue #14 で `PatternDisplay` の読込 useEffect から切り出したフック。抽出が
 * 将来壊れないよう、状態遷移と safeInvoke への引数組み立てを固定する。
 * 守る挙動:
 *   - 初期状態は loading
 *   - 解決成功で ready になり pattern が safeInvoke の戻り値そのもの
 *   - safeInvoke は ("get_pattern", { patternId: resolvePatternId(pattern),
 *     params: parsePatternParams(location.search) }) で呼ばれる
 *   - reject 時は error 状態（message 設定）＋ console.error
 *   - pattern prop が変わると再読込される（loading→新 ready）
 *
 * 純粋ロジック（resolvePatternId / parsePatternParams）は patternId.test.ts が
 * 固定済みなので、ここでは「フックがそれらを正しく呼び結線しているか」だけを見る。
 *
 * safeInvoke は `../lib/tauriCompat` から動的 import されるため vi.mock で差し替える。
 * window.location.search はテストごとに設定し afterEach で元へ戻す。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePatternLoader } from "./usePatternLoader";
import type { XSGPattern } from "../lib/types";

// safeInvoke を mock 化（動的 import 先の module を丸ごと差し替える）。
const safeInvokeMock = vi.fn();
vi.mock("../lib/tauriCompat", () => ({
  safeInvoke: (...args: unknown[]) => safeInvokeMock(...args),
}));

// ---------------------------------------------------------------------------
// window.location.search の制御（テスト後に restore）。
// ---------------------------------------------------------------------------

const originalSearch = window.location.search;

/** location.search を上書きする（先頭 ? を含む形）。 */
function setSearch(search: string): void {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search },
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  safeInvokeMock.mockReset();
  setSearch("");
});

afterEach(() => {
  setSearch(originalSearch);
  vi.restoreAllMocks();
});

/** テスト用の最小 XSGPattern（nodes 有り）。 */
function samplePattern(): XSGPattern {
  return { canvas: { width: 100, height: 100 }, nodes: [] };
}

// ---------------------------------------------------------------------------
describe("usePatternLoader", () => {
  it("初期状態は loading", () => {
    // --- 仕様: 読込開始前（同期初期値）は status:loading ---
    // safeInvoke は永遠に解決しない Promise にして loading を観測する。
    safeInvokeMock.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => usePatternLoader("solid"));
    expect(result.current.status).toBe("loading");
  });

  it("解決成功で ready になり pattern が safeInvoke の戻り値になる", async () => {
    // --- 仕様: get_pattern の戻り値をそのまま { status:ready, pattern } に載せる ---
    const data = samplePattern();
    safeInvokeMock.mockResolvedValue(data);

    const { result } = renderHook(() => usePatternLoader("colorbar"));

    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("not ready");
    // 戻り値の同一参照がそのまま入る。
    expect(result.current.pattern).toBe(data);
  });

  it('safeInvoke を ("get_pattern", { patternId, params }) で呼ぶ', async () => {
    // --- 仕様: patternId=resolvePatternId(pattern)、params=parsePatternParams(search) ---
    // alias "colorbars" → "colorbar"。search は pattern 自身を除外し残りを渡す。
    setSearch("?pattern=colorbars&hue=red&level=50");
    safeInvokeMock.mockResolvedValue(samplePattern());

    const { result } = renderHook(() => usePatternLoader("colorbars"));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(safeInvokeMock).toHaveBeenCalledTimes(1);
    expect(safeInvokeMock).toHaveBeenCalledWith("get_pattern", {
      patternId: "colorbar", // resolvePatternId("colorbars")
      params: { hue: "red", level: "50" }, // pattern キーは除外
    });
  });

  it("未知の pattern 名は patternId が solid にフォールバックして呼ばれる", async () => {
    // --- 仕様: resolvePatternId は未知名を "solid" に落とす。その結線を確認 ---
    safeInvokeMock.mockResolvedValue(samplePattern());

    const { result } = renderHook(() => usePatternLoader("does-not-exist"));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    expect(safeInvokeMock).toHaveBeenCalledWith("get_pattern", {
      patternId: "solid",
      params: {},
    });
  });

  it("reject 時は error 状態（message 設定）＋ console.error を呼ぶ", async () => {
    // --- 仕様: 失敗は status:error に落とし、Error.message を message にする ---
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    safeInvokeMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => usePatternLoader("solid"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("not error");
    expect(result.current.message).toBe("boom");
    // 抽出元と同じログ前置き。
    expect(errorSpy).toHaveBeenCalledWith(
      "Failed to load pattern:",
      expect.any(Error)
    );
  });

  it("Error でない reject はフォールバック文言になる", async () => {
    // --- 仕様: err が Error でないとき message は "Failed to load pattern" ---
    vi.spyOn(console, "error").mockImplementation(() => {});
    safeInvokeMock.mockRejectedValue("just a string");

    const { result } = renderHook(() => usePatternLoader("solid"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    if (result.current.status !== "error") throw new Error("not error");
    expect(result.current.message).toBe("Failed to load pattern");
  });

  it("pattern prop が変わると再読込される（loading→新 ready）", async () => {
    // --- 仕様: effect 依存は [pattern]。pattern 変更で loading に戻り再 invoke する ---
    const first = samplePattern();
    const second: XSGPattern = { ...samplePattern(), extends: "x" };
    safeInvokeMock.mockResolvedValueOnce(first).mockResolvedValueOnce(second);

    const { result, rerender } = renderHook(
      ({ p }: { p: string }) => usePatternLoader(p),
      { initialProps: { p: "colorbar" } }
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") throw new Error("not ready (1)");
    expect(result.current.pattern).toBe(first);

    // pattern を切り替える → 再度 safeInvoke が呼ばれ ready が更新される。
    rerender({ p: "grayscale" });
    await waitFor(() => {
      expect(result.current.status).toBe("ready");
      if (result.current.status !== "ready") throw new Error("not ready (2)");
      expect(result.current.pattern).toBe(second);
    });

    expect(safeInvokeMock).toHaveBeenCalledTimes(2);
    // 2回目の patternId は grayscale に解決されている。
    expect(safeInvokeMock.mock.calls[1][0]).toBe("get_pattern");
    expect(
      (safeInvokeMock.mock.calls[1][1] as { patternId: string }).patternId
    ).toBe("grayscale");
  });
});
