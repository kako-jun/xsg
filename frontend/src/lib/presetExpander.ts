/**
 * Preset / Background ノード展開ユーティリティ
 *
 * `colorbar.yaml` のような基底パターンは rect 等のプリミティブで本体を描く。
 * 一方 `colorbar-simple.yaml` は `type: background, preset: colorbar` という
 * 「参照ノード」だけを持ち、本体は基底パターンの nodes を借りる。この
 * preset/background → nodes 展開はレンダラー（`NodeRenderer`）にも `get_pattern`
 * （Rust / web fallback）にも存在しないため、未対応ノードとして黒落ちしていた
 * （Issue #23）。
 *
 * 規律3（二重実装を作らない）に従い、展開ロジックは TS のこの 1 箇所だけに置く。
 * Rust 側に同等実装は足さない。`getPattern` を引数で受け取る純粋寄りの関数にし、
 * Tauri/web どちらのローダ（`safeInvoke("get_pattern", ...)`）でも再利用できるよう
 * にしてある（呼び元が `tauriCompat.loadResolvedPattern` で結線する）。
 *
 * 規律2（定義と状態の分離）: 入力 `XSGPattern` は不変の定義として扱い、状態の
 * 入れ物に流用しない。展開結果は `{ ...pattern, nodes }` で新しいオブジェクトを
 * 組み立てて返し、入力を破壊的に変更しない。
 */

import type { PatternNode, PresetNode, XSGPattern } from "./types";

/**
 * preset 自己参照・相互参照による無限ループを防ぐ再帰深度の上限。
 */
const MAX_DEPTH = 16;

/**
 * preset/background ノードを参照先パターンの nodes に in-place 展開する。
 *
 * `pattern.nodes` を順に走査し、新しい nodes 配列を組む:
 *   - `type === "background" | "preset"` のとき、`node.preset`（参照先 id）の
 *     パターンを `getPattern` で取得し、再帰展開した上で、その nodes を **同じ位置**
 *     に差し込む（z 順保持。background が先頭なら背面に来る）。
 *   - それ以外のノードはそのまま残す。
 *
 * 展開する子ノードの `id` は**ホスト（preset/background）ノードの id で名前空間化**
 * する（`${hostId}/${childId}`、ホストに id が無ければ `preset-${index}/${childId}`）。
 * これにより、同じ preset を複数回参照しても、また preset 内 id が兄弟ノード id と
 * 衝突しても、展開後の id が一意になり、描画側（`PatternCanvas`/`SlideshowView` の
 * `key={node.id}`）の React duplicate key を防ぐ。再帰展開ではこの prefix が積み上がり
 * 深い階層でも一意性が保たれる。id 以外（type/座標/fill/z 順 等）は一切変えない。
 *
 * ユーザのクエリ params（`?pattern=...&size=...`）は**base パターンにのみ**適用され、
 * preset 参照の子へは伝播しない。子 preset は YAML 記述の `node.params` のみで
 * 解決される（preset params は作者固定）。
 *
 * 黒落ちでクラッシュさせないため、参照不能（preset 欠落・取得失敗・深度超過）な
 * 展開ノードは `console.warn` して **drop** し、他ノードの描画は継続する。
 *
 * @param pattern  展開対象パターン（不変。破壊しない）
 * @param getPattern  参照先 id と params から `XSGPattern` を解決する取得関数
 *                    （extends/params 解決済みのものを返す前提。Tauri は Rust、
 *                    web は fetch で解決される）
 * @param depth  再帰深度（暴走ガード用。呼び元は省略してよい）
 * @returns 展開後の新しい `XSGPattern`（他フィールドは保持）
 */
export async function expandPresets(
  pattern: XSGPattern,
  getPattern: (
    id: string,
    params: Record<string, string>
  ) => Promise<XSGPattern>,
  depth = 0
): Promise<XSGPattern> {
  const nodes = pattern.nodes;
  // nodes が未定義/空ならそのまま返す（展開する余地がない）。
  if (!nodes || nodes.length === 0) {
    return pattern;
  }

  const expandedNodes: PatternNode[] = [];

  let index = -1;
  for (const node of nodes) {
    index += 1;
    if (node.type === "background" || node.type === "preset") {
      const presetNode = node as PresetNode;
      const presetId = presetNode.preset;

      // 参照先 id が無いノードは描けないので drop（黒落ち防止）。
      if (!presetId) {
        console.warn(
          `[expandPresets] node '${node.id}' (type=${node.type}) has no 'preset' reference; dropping`
        );
        continue;
      }

      // 深度上限を超えたら展開を打ち切り、この preset ノードを drop する
      // （自己参照・相互参照での無限ループ防止）。
      if (depth >= MAX_DEPTH) {
        console.warn(
          `[expandPresets] max depth (${MAX_DEPTH}) exceeded while expanding preset '${presetId}' (node '${node.id}'); dropping to avoid infinite recursion`
        );
        continue;
      }

      // preset 固有パラメータを文字列化する（get_pattern の user_params は
      // 文字列前提のため）。
      const params = stringifyParams(presetNode.params);

      // 展開ノード id の名前空間 prefix。ホストノード id があればそれを使い、
      // 無ければインデックスで一意化する。これで同 preset の複数参照でも、
      // また preset 内 id が兄弟 id と衝突しても、展開後 id が一意になる。
      const namespacePrefix = node.id ?? `preset-${index}`;

      try {
        const presetPattern = await getPattern(presetId, params);
        // nested preset 対応: 取得したパターン自身が preset/background を
        // 持つ場合に備えて再帰展開する。
        const expanded = await expandPresets(
          presetPattern,
          getPattern,
          depth + 1
        );
        // 展開 nodes をこの位置に差し込む（z 順保持＝in-place 展開）。
        // 各子ノードの id をホストノード id で名前空間化して一意化する
        // （type/座標/fill 等の中身は不変、id だけ prefix を付加）。
        for (const child of expanded.nodes ?? []) {
          expandedNodes.push({
            ...child,
            id: `${namespacePrefix}/${child.id}`,
          });
        }
      } catch (err) {
        // 取得失敗（fetch 404・コマンド未対応など）は握り、このノードだけ
        // drop して他ノードの描画は継続する。
        console.warn(
          `[expandPresets] failed to resolve preset '${presetId}' (node '${node.id}'); dropping`,
          err
        );
      }
    } else {
      // preset 以外のノードはそのまま保持する。
      expandedNodes.push(node);
    }
  }

  return { ...pattern, nodes: expandedNodes };
}

/**
 * preset の `params`（`Record<string, unknown>` | undefined）を get_pattern の
 * user_params 形式（`Record<string, string>`）へ変換する。値は `String()` で
 * 文字列化する。
 */
function stringifyParams(
  params: Record<string, unknown> | undefined
): Record<string, string> {
  if (!params) {
    return {};
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    out[key] = String(value);
  }
  return out;
}
