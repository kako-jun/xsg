//! バックエンドの芯を守る golden e2e。
//!
//! デスクトップ(Tauri)アプリなので Web e2e は組めないが、フィクスチャの木を temp_dir に
//! 生成し、公開 API（`app_lib::patterns` / `app_lib::pattern_expander` / `app_lib::playlist`）を
//! 外から一気通貫で叩けば、人手なしで芯の回帰を防げる。
//!
//! 検証する芯は3つ:
//!   (1) patterns scan        — YAML 木 → `PatternInfo` 抽出（id ソート・name/category 規則・拡張子フィルタ）
//!   (2) pattern_expander     — extends 継承マージ + `{{param}}` 展開（default / user_params 上書き）
//!   (3) playlist runner      — order(Sequence/Shuffle/Random) の挙動・loop・duration フォールバック
//!
//! 判定の原則: 決定論なものは順序まで固定検証し、`thread_rng` 由来で非決定なもの
//! （Shuffle/Random）は**順序で assert せず集合・件数・メンバーシップ**で見る。

use std::collections::{BTreeSet, HashMap};
use std::path::{Path, PathBuf};

use app_lib::pattern_expander::PatternExpander;
use app_lib::patterns::{load_patterns_from, PatternInfo};
use app_lib::playlist::{
    load_playlist, Order, PatternSource, Playback, Playlist, PlaylistRunner, PlaylistSource,
};

/// テスト専用のユニークな作業ディレクトリ（プロセス id + タグで並列衝突を避ける）。
/// 先頭で remove_dir_all して作り直し、各テスト末尾で掃除する。
fn workspace(tag: &str) -> PathBuf {
    let base = std::env::temp_dir().join(format!("xsg_e2e_{tag}_{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&base);
    std::fs::create_dir_all(&base).unwrap();
    base
}

/// root 配下に相対パスでファイルを書く（親ディレクトリも作る）。
fn write_file(root: &Path, rel: &str, contents: &str) {
    let path = root.join(rel);
    std::fs::create_dir_all(path.parent().unwrap()).unwrap();
    std::fs::write(path, contents).unwrap();
}

// =====================================================================
// (1) patterns scan — load_patterns_from(&Path) -> Vec<PatternInfo>
// =====================================================================

#[test]
fn scan_extracts_sorted_patterns_with_name_and_category_rules() {
    let root = workspace("scan");

    // name/category を持つパターン（明示値が採用される）。
    write_file(
        &root,
        "checker.yaml",
        "name: \"Checkerboard\"\ncategory: \"Geometric\"\n",
    );
    // name 無し → id を Title Case（ハイフン区切りを単語化）に変換する規則。
    // category 無し → "Other"。
    write_file(&root, "arib-colorbar.yaml", "canvas:\n  width: 1920\n");
    // id が辞書順で先頭に来るパターン（ソート検証用）。
    write_file(
        &root,
        "alpha.yaml",
        "name: \"Alpha One\"\ncategory: \"Test\"\n",
    );
    // *.yaml 以外は拾わない（拡張子フィルタ）。
    write_file(&root, "notes.txt", "name: \"Should Be Ignored\"\n");
    write_file(&root, "config.json", "{\"name\": \"nope\"}");

    let patterns = load_patterns_from(&root).expect("scan は成功するはず");

    // --- 仕様: glob は *.yaml だけを拾う。.txt/.json は対象外 ---
    let ids: Vec<&str> = patterns.iter().map(|p| p.id.as_str()).collect();
    assert_eq!(
        ids,
        vec!["alpha", "arib-colorbar", "checker"],
        "*.yaml だけが id 昇順で並ぶこと（.txt/.json は除外）"
    );

    // --- 仕様: id は file_stem。ソートは id 昇順で決定論 ---
    let by_id: HashMap<&str, &PatternInfo> = patterns.iter().map(|p| (p.id.as_str(), p)).collect();

    // name/category を持つものは YAML 値がそのまま採用される。
    assert_eq!(by_id["checker"].name, "Checkerboard");
    assert_eq!(by_id["checker"].category, "Geometric");
    assert_eq!(by_id["alpha"].name, "Alpha One");
    assert_eq!(by_id["alpha"].category, "Test");

    // --- 仕様: name 無しは id をハイフン→空白で割り Title Case 化 ---
    // "arib-colorbar" → "Arib Colorbar"
    assert_eq!(by_id["arib-colorbar"].name, "Arib Colorbar");
    // --- 仕様: category 無しは "Other" ---
    assert_eq!(by_id["arib-colorbar"].category, "Other");

    let _ = std::fs::remove_dir_all(&root);
}

// =====================================================================
// (2) pattern_expander — extends 継承 + param 展開（主役）
// =====================================================================

/// temp の YAML を serde_yaml で読んで `serde_json::Value` を得る
/// （resolve_extends / expand が要求する Value 形）。
fn load_value(root: &Path, rel: &str) -> serde_json::Value {
    let content = std::fs::read_to_string(root.join(rel)).expect("YAML 読み込み");
    serde_yaml::from_str(&content).expect("YAML パース")
}

#[test]
fn expander_merges_extends_and_substitutes_params() {
    let root = workspace("expander");

    // base パターン: canvas / params(color1,color2) / nodes を持つ。
    // params.color1 は default を持つ（→ default が効くことの検証用）。
    write_file(
        &root,
        "base.yaml",
        r##"
name: "Base Pattern"
category: "BaseCat"
canvas:
  width: 1920
  height: 1080
params:
  color1:
    type: color
    default: "#000000"
  color2:
    type: color
    default: "#FFFFFF"
nodes:
  - id: rect-a
    type: rect
    fill: "{{color1}}"
  - id: rect-b
    type: rect
    fill: "{{color2}}"
"##,
    );

    // 子パターン: base を extends し、name/category と nodes を上書き。
    // params.color1 は default だけ差し替え（プロパティ単位マージの検証）。
    write_file(
        &root,
        "child.yaml",
        r##"
extends: base.yaml
name: "Child Pattern"
category: "ChildCat"
params:
  color1:
    default: "#112233"
nodes:
  - id: only-child
    type: rect
    fill: "{{color1}}"
"##,
    );

    let expander = PatternExpander::new(root.clone());

    // resolve_extends: 子 Value に base をマージする。
    let mut pattern = load_value(&root, "child.yaml");
    expander
        .resolve_extends(&mut pattern)
        .expect("resolve_extends は成功するはず");

    // --- 仕様: child が name/category/nodes を上書きする ---
    assert_eq!(pattern["name"], serde_json::json!("Child Pattern"));
    assert_eq!(pattern["category"], serde_json::json!("ChildCat"));
    // nodes は child 側で丸ごと差し替わる（base の rect-a/rect-b は消え only-child だけ）。
    let nodes = pattern["nodes"].as_array().expect("nodes は配列");
    assert_eq!(nodes.len(), 1, "nodes は child が上書きするので1件");
    assert_eq!(nodes[0]["id"], serde_json::json!("only-child"));

    // --- 仕様: canvas は child に無いので base から継承される ---
    assert_eq!(pattern["canvas"]["width"], serde_json::json!(1920));
    assert_eq!(pattern["canvas"]["height"], serde_json::json!(1080));

    // --- 仕様: params はプロパティ単位マージ。
    // color1 は child の default(#112233) で上書き、type は base から残る。
    // color2 は child に無いので base のまま（default #FFFFFF）。
    assert_eq!(
        pattern["params"]["color1"]["default"],
        serde_json::json!("#112233"),
        "child の default が base を上書き"
    );
    assert_eq!(
        pattern["params"]["color1"]["type"],
        serde_json::json!("color"),
        "child が触らない type は base から残る"
    );
    assert_eq!(
        pattern["params"]["color2"]["default"],
        serde_json::json!("#FFFFFF"),
        "child に無い param は base のまま"
    );

    // --- 仕様: マージ後 extends キーは除去される ---
    assert!(
        pattern.get("extends").is_none(),
        "マージ後 extends は消える"
    );

    // expand(default のみ): user_params 空なら各 param の default が {{...}} に入る。
    let mut defaulted = pattern.clone();
    let empty: HashMap<String, String> = HashMap::new();
    expander
        .expand(&mut defaulted, &empty)
        .expect("expand(default) は成功するはず");
    // only-child.fill は {{color1}} → color1 の default(#112233)。
    assert_eq!(
        defaulted["nodes"][0]["fill"],
        serde_json::json!("#112233"),
        "user_params 無しなら default が {{param}} を埋める"
    );

    // expand(user 上書き): color1 を user 値にすると default を上書きする。
    let mut overridden = pattern.clone();
    let mut user = HashMap::new();
    user.insert("color1".to_string(), "#ABCDEF".to_string());
    expander
        .expand(&mut overridden, &user)
        .expect("expand(user) は成功するはず");
    assert_eq!(
        overridden["nodes"][0]["fill"],
        serde_json::json!("#ABCDEF"),
        "user_params が default を上書きして {{param}} を埋める"
    );

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn expander_substitutes_multiple_params_and_passes_through_unknown() {
    // expand のもう2経路を守る:
    //   (1) 1文字列内に複数 {{param}} がある場合、全部置換される（replace ループ経路）。
    //       文字列が「単一 {{var}}」でないと extract_single_var が None を返し、
    //       params を総なめして各 placeholder を replace で埋める。
    //   (2) user_params にも default にも無い {{unknown}} はそのまま文字列に残る。
    //       文字列が丸ごと {{unknown}} なら extract_single_var が Some("unknown") を返すが、
    //       params に無いので元の文字列をそのまま String で返す（素通し）。
    let root = workspace("expander_multi");

    // params: r/g/b は number 型で default を持つ。色文字列内に3つ展開する。
    // unknownNode.value は丸ごと {{unknown}}（params に定義されない）→ 素通し検証。
    write_file(
        &root,
        "multi.yaml",
        r##"
name: "Multi Sub"
category: "Test"
params:
  r:
    type: number
    default: 255
  g:
    type: number
    default: 128
  b:
    type: number
    default: 0
nodes:
  - id: rgb-node
    type: rect
    fill: "rgb({{r}},{{g}},{{b}})"
  - id: unknown-node
    type: rect
    fill: "{{unknown}}"
"##,
    );

    let expander = PatternExpander::new(root.clone());
    let pattern = load_value(&root, "multi.yaml");

    // --- 仕様(1): user_params 空なら default(r=255,g=128,b=0) が1文字列内の3 placeholder を全置換 ---
    let mut defaulted = pattern.clone();
    let empty: HashMap<String, String> = HashMap::new();
    expander
        .expand(&mut defaulted, &empty)
        .expect("expand(default) は成功するはず");
    assert_eq!(
        defaulted["nodes"][0]["fill"],
        serde_json::json!("rgb(255,128,0)"),
        "1文字列内の複数 {{param}} が全部 default で置換される"
    );

    // --- 仕様(2): {{unknown}} は params に無いのでそのまま残る（素通し）---
    assert_eq!(
        defaulted["nodes"][1]["fill"],
        serde_json::json!("{{unknown}}"),
        "未定義 param の {{unknown}} は置換されず文字列に残る"
    );

    // --- 仕様(1の補強): user_params で一部を上書きしても残りは default、複数置換は維持 ---
    let mut overridden = pattern.clone();
    let mut user = HashMap::new();
    user.insert("g".to_string(), "64".to_string());
    expander
        .expand(&mut overridden, &user)
        .expect("expand(user) は成功するはず");
    assert_eq!(
        overridden["nodes"][0]["fill"],
        serde_json::json!("rgb(255,64,0)"),
        "user 上書き(g=64)と default(r,b)が混在しても複数置換される"
    );
    // 未定義 param は user_params で触れていないのでやはり素通し。
    assert_eq!(
        overridden["nodes"][1]["fill"],
        serde_json::json!("{{unknown}}"),
        "user_params 指定後も未定義 {{unknown}} は素通し"
    );

    let _ = std::fs::remove_dir_all(&root);
}

// =====================================================================
// (3) playlist runner — order / loop / duration
// =====================================================================
//
// #16 の type タグ衝突バグ修正後は `load_playlist(YAML)` が機能するので、Sequence 系の
// golden は **temp dir に同梱書式の playlist YAML を書き、`load_playlist` で読んで runner に
// 渡す本物の e2e**（YAML → デシリアライズ → PlaylistRunner → 順序検証の一気通貫）に格上げした。
// 非決定（Shuffle/Random）系は順序 assert を持ち込まないため、引き続き Rust 直接構築で集合・件数を見る。

/// pattern source を1件作る（path と任意の個別 duration）。
/// 非決定系テスト（Shuffle/Random）用の直接構築ヘルパ。
fn pattern_source(path: &str, duration: Option<f32>) -> PlaylistSource {
    PlaylistSource::Pattern(PatternSource {
        path: path.to_string(),
        duration,
    })
}

/// runner に渡す Playlist を Rust で直接構築する（デシリアライズを介さない）。
fn make_playlist(
    order: Order,
    loop_playback: bool,
    default_duration: Option<f32>,
    sources: Vec<PlaylistSource>,
) -> Playlist {
    Playlist {
        playback: Playback {
            order,
            loop_playback,
            default_duration,
        },
        sources: Some(sources),
        generator: None,
    }
}

/// PlaylistSource::Pattern の path を取り出す（検証用ヘルパ）。
fn source_path(s: &PlaylistSource) -> String {
    match s {
        PlaylistSource::Pattern(p) => p.path.clone(),
        other => panic!("テストは pattern source のみ使う: {other:?}"),
    }
}

#[test]
fn runner_sequence_order_is_deterministic_and_loops() {
    // ★本物の e2e★ 同梱 playlists/*.yaml と同じ書式のフィクスチャを temp dir に書き、
    // load_playlist(YAML) → デシリアライズ → PlaylistRunner → 順序検証を一気通貫で踏む。
    // （#16 の type タグ衝突を直したので load_playlist が実際に機能することを芯で守る。）
    let root = workspace("seq");
    // playback: {order, loop, defaultDuration} / sources: [{type: pattern, path, duration}]
    let yaml = "\
playback:
  order: sequence
  loop: true
  defaultDuration: 3000
sources:
  - type: pattern
    path: \"a.yaml\"
    duration: 3000
  - type: pattern
    path: \"b.yaml\"
    duration: 3000
  - type: pattern
    path: \"c.yaml\"
    duration: 3000
";
    let path = root.join("sequence.yaml");
    std::fs::write(&path, yaml).unwrap();

    // --- 仕様: 同梱書式の YAML が load_playlist でデシリアライズできる（#16 修正の芯）---
    let playlist = load_playlist(&path).expect("load_playlist は成功するはず（#16 修正後）");

    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // --- 仕様: Sequence は投入順をそのまま返す（決定論なので順序まで固定検証）---
    assert_eq!(source_path(runner.get_next().unwrap()), "a.yaml");
    assert_eq!(source_path(runner.get_next().unwrap()), "b.yaml");
    assert_eq!(source_path(runner.get_next().unwrap()), "c.yaml");
    // --- 仕様: loop_playback=true は末尾の次で先頭へ wrap する ---
    assert_eq!(source_path(runner.get_next().unwrap()), "a.yaml");
    assert_eq!(source_path(runner.get_next().unwrap()), "b.yaml");

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn runner_inproc_should_continue_stops_after_all_items_when_no_loop() {
    // loop=false: 全件再生後に停止する。
    let playlist = make_playlist(
        Order::Sequence,
        false,
        None,
        vec![
            pattern_source("a.yaml", None),
            pattern_source("b.yaml", None),
        ],
    );

    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // --- 仕様: 開始時は継続可（current_index=0 < len）---
    assert!(runner.should_continue(), "再生前は継続可能");
    runner.get_next(); // index -> 1
    assert!(runner.should_continue(), "1件目消化後もまだ継続可能");
    runner.get_next(); // index -> 2 (== len)
                       // --- 仕様: loop=false で全件消化後は should_continue が false ---
    assert!(!runner.should_continue(), "loop=false なら全件後に停止する");

    // --- 仕様: 非ループ Sequence で全件を消化したあと get_next() を呼ぶと None を返す ---
    // current_index(==len) を wrap しないので sources.get(index) が None になる。
    // これが「再生終了」の正規シグナル。should_continue() の false と二重に芯を守る。
    assert!(
        runner.get_next().is_none(),
        "loop=false で全件消化後の get_next() は None を返す（末尾超過の境界）"
    );
}

#[test]
fn load_playlist_honors_loop_false_and_stops_after_all_items() {
    // ★#17 回帰ガード★ loop:false の YAML が無視されず反映されること。
    // 旧: Playback.loop_playback に `#[serde(rename = "loop")]` が無く、YAML の `loop:` キーが
    //     黙って捨てられて常に default(true) になっていた。そのため loop:false が効かず、
    //     全件消化後も should_continue() が（loop=true 扱いで）true を返し続けた。
    // 新: `#[serde(rename = "loop")]` を付けたので wire 名 `loop` が loop_playback に届く。
    // この assert は **load_playlist 経由（YAML → デシリアライズ）** で踏むので、rename が
    // 再び外れたら loop_playback が default(true) に戻り、全件消化後の should_continue() が
    // false にならず（true のまま）この assert が射抜く。Rust 直接構築の
    // runner_should_continue_stops_after_all_items_when_no_loop はデシリアライズを介さないため、
    // rename 漏れは検出できない。ここで YAML 駆動の門番を立てる。
    let root = workspace("loopfalse");
    // playback: {order, loop: false, defaultDuration} / sources 複数。
    let yaml = "\
playback:
  order: sequence
  loop: false
  defaultDuration: 3000
sources:
  - type: pattern
    path: \"a.yaml\"
    duration: 3000
  - type: pattern
    path: \"b.yaml\"
    duration: 3000
  - type: pattern
    path: \"c.yaml\"
    duration: 3000
";
    let path = root.join("no-loop.yaml");
    std::fs::write(&path, yaml).unwrap();

    let playlist = load_playlist(&path).expect("load_playlist は成功するはず");
    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // --- 仕様: loop:false の YAML が反映され、全 source を get_next() で消化したあと停止する ---
    assert!(runner.should_continue(), "再生前は継続可能");
    runner.get_next(); // a.yaml (index -> 1)
    runner.get_next(); // b.yaml (index -> 2)
    runner.get_next(); // c.yaml (index -> 3 == len)
                       // rename が外れて loop_playback=default(true) になると、should_continue() は
                       // 「loop 有効なら常に継続」枝で true を返してしまう。loop:false が効いている証拠として false を要求。
    assert!(
        !runner.should_continue(),
        "loop:false の YAML が無視されず反映されること（#17 回帰ガード）: 全件消化後は停止する"
    );

    let _ = std::fs::remove_dir_all(&root);
}

#[test]
fn runner_inproc_shuffle_preserves_membership_not_order() {
    let playlist = make_playlist(
        Order::Shuffle,
        false,
        None,
        vec![
            pattern_source("a.yaml", None),
            pattern_source("b.yaml", None),
            pattern_source("c.yaml", None),
            pattern_source("d.yaml", None),
        ],
    );

    let mut runner = PlaylistRunner::new(playlist);
    // --- 仕様: Shuffle は prepare() で1回シャッフルし、以後は順次返す ---
    runner.prepare();

    // total 件ぶん get_next() を集めると集合は入力と一致する
    // （順序は thread_rng で非決定なので集合・件数でだけ判定）。
    let mut seen: BTreeSet<String> = BTreeSet::new();
    for _ in 0..4 {
        seen.insert(source_path(runner.get_next().unwrap()));
    }
    let input: BTreeSet<String> = ["a.yaml", "b.yaml", "c.yaml", "d.yaml"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    assert_eq!(
        seen, input,
        "Shuffle は順序を変えるが集合（メンバーシップ）は保存する"
    );
}

#[test]
fn runner_inproc_random_returns_only_input_members() {
    let playlist = make_playlist(
        Order::Random,
        true,
        None,
        vec![
            pattern_source("a.yaml", None),
            pattern_source("b.yaml", None),
            pattern_source("c.yaml", None),
        ],
    );

    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // --- 仕様: Random は毎回 0..len から乱択する。
    // 全網羅も順序も保証されないので、返る各要素が入力集合のメンバーであることだけ検証。
    let input: BTreeSet<String> = ["a.yaml", "b.yaml", "c.yaml"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    for _ in 0..30 {
        let got = source_path(runner.get_next().unwrap());
        assert!(
            input.contains(&got),
            "Random が入力に無い要素 {got} を返した"
        );
    }
}

#[test]
fn runner_random_with_loop_false_is_infinite() {
    // ★#20 の仕様ガード★ Order::Random は loop:false でも停止しない＝本質的に無限再生。
    // 理由: get_next() は毎回 0..len から乱択するだけで current_index を進めない。
    // 「全件出した」という終端の概念が無いので、loop フラグは Random には無意味。
    // 対比: Sequence/Shuffle は loop:false なら全件再生後に should_continue()=false で
    //   停止する（runner_inproc_should_continue_stops_after_all_items_when_no_loop /
    //   load_playlist_honors_loop_false_and_stops_after_all_items が証人）。
    //   Random だけはここで loop:false でも永遠に true を返すことを固定し、両者を対にする。
    let playlist = make_playlist(
        Order::Random,
        false, // loop:false でも Random は停止しない（#20: random = infinite）
        None,
        vec![
            pattern_source("a.yaml", None),
            pattern_source("b.yaml", None),
            pattern_source("c.yaml", None),
        ],
    );

    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // 件数(3)を大きく超えて get_next() を呼んでも should_continue() は常に true。
    // 非決定方針（コメント先頭13行/321行）に従い順序は assert せず、
    // (1) 無限継続（should_continue が毎回 true）と
    // (2) メンバーシップ（返る各要素が入力集合に属する）だけを見る。
    let input: BTreeSet<String> = ["a.yaml", "b.yaml", "c.yaml"]
        .iter()
        .map(|s| s.to_string())
        .collect();
    for i in 0..20 {
        assert!(
            runner.should_continue(),
            "Random+loop:false は {i} 回再生後も停止しない（#20: random = infinite）"
        );
        let got = source_path(runner.get_next().unwrap());
        assert!(
            input.contains(&got),
            "Random が入力に無い要素 {got} を返した"
        );
    }
    // 件数を超えて消化したあとも継続可能であることを最終確認（loop:false 無視の証拠）。
    assert!(
        runner.should_continue(),
        "Random は終端の概念が無く loop:false を無視するので永続的に継続可能（#20）"
    );
}

#[test]
fn runner_inproc_get_duration_priority_source_then_default_then_fallback() {
    // s1: source 個別 duration=2000、s2: 個別 duration 無し。
    // defaultDuration=7000 を指定 → s2 はこれを使う。
    let playlist = make_playlist(
        Order::Sequence,
        false,
        Some(7000.0),
        vec![
            pattern_source("s1.yaml", Some(2000.0)),
            pattern_source("s2.yaml", None),
        ],
    );

    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // get_next() は &PlaylistSource を返し runner を可変借用するので、
    // get_duration(&self) を呼ぶ前に clone して借用を解放する。
    // --- 仕様: source 個別 duration が最優先 ---
    let s1 = runner.get_next().unwrap().clone();
    assert_eq!(source_path(&s1), "s1.yaml");
    assert_eq!(runner.get_duration(&s1), 2000, "個別 duration が最優先");

    // --- 仕様: 個別が無ければ playback.default_duration を使う ---
    let s2 = runner.get_next().unwrap().clone();
    assert_eq!(source_path(&s2), "s2.yaml");
    assert_eq!(
        runner.get_duration(&s2),
        7000,
        "個別が無ければ defaultDuration"
    );
}

#[test]
fn runner_inproc_get_duration_falls_back_to_5000_when_nothing_set() {
    // 個別 duration も defaultDuration も無い → 実装既定の 5000ms に落ちる。
    let playlist = make_playlist(
        Order::Sequence,
        false,
        None,
        vec![pattern_source("only.yaml", None)],
    );

    let mut runner = PlaylistRunner::new(playlist);
    runner.prepare();

    // get_next() の可変借用を clone で解放してから get_duration を呼ぶ。
    let s = runner.get_next().unwrap().clone();
    // --- 仕様: 個別 None かつ default None のとき unwrap_or(5000.0) のフォールバック ---
    assert_eq!(
        runner.get_duration(&s),
        5000,
        "個別も default も無ければ既定値 5000ms"
    );
}

// =====================================================================
// (3b) playlist デシリアライズ経路の正常系（#16 修正の回帰ガード）
// =====================================================================

#[test]
fn load_playlist_deserializes_all_source_types() {
    // ★#16 修正の回帰ガード（反転後）★
    // 旧: 内部タグ enum (#[serde(tag = "type")]) と各 variant の `#[serde(rename = "type")] type_`
    //     が衝突し、タグ消費後 inner struct の `type` が「missing field」になって全 playlist の
    //     デシリアライズが失敗していた。
    // 新: variant struct から type_ を除いたので、url/pattern/image/inline の各 type が
    //     正しい PlaylistSource variant にデシリアライズされる。同梱書式の混在 YAML を読んで
    //     各 type → 期待 variant のマッピングと中身を固定する。type_ を再宣言で復活させると
    //     再び失敗するので、この正常系が #16 の回帰を射抜く。
    let root = workspace("plall");
    // 同梱 digital-signage.yaml と同じ書式（4 type すべてを1本に混在）。
    let yaml = "\
playback:
  order: sequence
  loop: true
  defaultDuration: 10000
sources:
  - type: url
    url: \"https://example.com/dashboard\"
    readonly: true
    duration: 30000
  - type: pattern
    path: \"@/patterns/colorbar-simple.yaml\"
    duration: 5000
  - type: image
    src: \"@/images/announcement.png\"
    fit: contain
    duration: 15000
  - type: inline
    pattern:
      canvas:
        width: 1920
        height: 1080
    duration: 10000
";
    let path = root.join("all-types.yaml");
    std::fs::write(&path, yaml).unwrap();

    // --- 仕様: #16 修正後は混在 playlist がエラーなくデシリアライズできる ---
    let playlist = load_playlist(&path).expect("load_playlist は成功するはず（#16 修正後）");
    let sources = playlist.sources.expect("sources を持つ");
    assert_eq!(sources.len(), 4, "4 件の source がすべて読める");

    // --- 仕様: 各 type が正しい variant にデシリアライズされ、中身も保持される ---
    match &sources[0] {
        PlaylistSource::Url(u) => {
            assert_eq!(u.url, "https://example.com/dashboard");
            assert_eq!(u.readonly, Some(true));
            assert_eq!(u.duration, Some(30000.0));
        }
        other => panic!("sources[0] は Url のはず: {other:?}"),
    }
    match &sources[1] {
        PlaylistSource::Pattern(p) => {
            assert_eq!(p.path, "@/patterns/colorbar-simple.yaml");
            assert_eq!(p.duration, Some(5000.0));
        }
        other => panic!("sources[1] は Pattern のはず: {other:?}"),
    }
    match &sources[2] {
        PlaylistSource::Image(i) => {
            assert_eq!(i.src, "@/images/announcement.png");
            assert_eq!(i.fit.as_deref(), Some("contain"));
            assert_eq!(i.duration, Some(15000.0));
        }
        other => panic!("sources[2] は Image のはず: {other:?}"),
    }
    match &sources[3] {
        PlaylistSource::Inline(inl) => {
            assert!(
                inl.pattern.contains_key("canvas"),
                "inline は pattern を持つ"
            );
            assert_eq!(inl.duration, Some(10000.0));
        }
        other => panic!("sources[3] は Inline のはず: {other:?}"),
    }

    let _ = std::fs::remove_dir_all(&root);
}
