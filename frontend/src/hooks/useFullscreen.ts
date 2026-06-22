/**
 * useFullscreen — マウント時に1度だけフルスクリーンを要求する副作用フック。
 *
 * `PatternDisplay` の「マウント時に `document.documentElement.requestFullscreen()`
 * を試み、失敗は `console.warn` する」副作用をそのまま切り出したもの（規律3: 責務分離）。
 * 渡された `ref` の要素が存在し、かつ `requestFullscreen` が使えるときだけ要求する。
 * 挙動は抽出元と一致（要求は documentElement に対して行い、ref は存在判定にのみ使う）。
 */

import { useEffect, type RefObject } from "react";

export function useFullscreen(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    // Request fullscreen on mount
    const requestFullscreen = async () => {
      if (ref.current && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
        }
      }
    };

    requestFullscreen();
  }, [ref]);
}
