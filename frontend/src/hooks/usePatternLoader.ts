/**
 * usePatternLoader — `pattern` 名から `XSGPattern` を読み込む runtime 状態フック。
 *
 * `PatternDisplay` にあった読込 useEffect をそのまま切り出したもの（規律3: 責務分離）。
 * `pattern` が変わるたびに `loading` へ戻し、`resolvePatternId` / `parsePatternParams` で
 * リクエスト引数を組み立て、`safeInvoke("get_pattern", ...)` で取得して `ready`/`error` に
 * 落とす。`console.error` のエラーログも抽出元のまま。
 *
 * 規律2: 返す `PatternLoad` は「不変の定義 `XSGPattern`」と「読込の実行時状態
 * (loading/error)」を型で分けた値であり、`XSGPattern` を状態の入れ物に流用しない。
 */

import { useEffect, useState } from "react";
import { parsePatternParams, resolvePatternId } from "../lib/patternId";
import type { PatternLoad, XSGPattern } from "../lib/types";

export function usePatternLoader(pattern: string): PatternLoad {
  // Runtime load state (規律2): the loaded `XSGPattern` is an immutable
  // definition; loading/error live alongside it in this `PatternLoad` value
  // rather than overloading the definition type as a state container.
  const [load, setLoad] = useState<PatternLoad>({ status: "loading" });

  useEffect(() => {
    const loadPatternFile = async () => {
      setLoad({ status: "loading" });

      try {
        // Map common pattern names to pattern IDs
        const patternId = resolvePatternId(pattern);

        // Parse query parameters (excluding 'pattern' itself)
        const params = parsePatternParams(window.location.search);

        // Use safeInvoke for Tauri/web compatibility
        const { safeInvoke } = await import("../lib/tauriCompat");
        const data = (await safeInvoke("get_pattern", {
          patternId,
          params,
        })) as XSGPattern;

        setLoad({ status: "ready", pattern: data });
      } catch (err) {
        console.error("Failed to load pattern:", err);
        setLoad({
          status: "error",
          message:
            err instanceof Error ? err.message : "Failed to load pattern",
        });
      }
    };

    loadPatternFile();
  }, [pattern]);

  return load;
}
