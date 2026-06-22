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

// =====================================================================
// (3) playlist runner — order / loop / duration
// =====================================================================
//
// 注: 当初は load_playlist(YAML) でフィクスチャを読み runner に渡す設計だったが、
// 調査の結果 `load_playlist` / `load_playlist_json` は **既存バグで全 playlist の
// デシリアライズに失敗する**（PlaylistSource が `#[serde(tag = "type")]` の内部タグ
// enum でありながら、各 variant 構造体も `#[serde(rename = "type")] type_` を再宣言
// しており、タグ消費後に inner struct の `type` が「missing field」になる。リポ同梱の
// playlists/*.yaml すら読めない）。これはプロダクションコードのバグなので**このテストでは
// 直さず**、runner の芯（order/loop/duration）を守るため Playlist を Rust で直接構築する。
// デシリアライズ経路自体は下の deserialize_bug テストで回帰ガードとして固定する。

/// pattern source を1件作る（path と任意の個別 duration）。
fn pattern_source(path: &str, duration: Option<f32>) -> PlaylistSource {
    PlaylistSource::Pattern(PatternSource {
        type_: "pattern".to_string(),
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
    // loop=true: 末尾の次で先頭へ wrap し延々続く。
    let playlist = make_playlist(
        Order::Sequence,
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

    // --- 仕様: Sequence は投入順をそのまま返す（決定論なので順序まで固定検証）---
    assert_eq!(source_path(runner.get_next().unwrap()), "a.yaml");
    assert_eq!(source_path(runner.get_next().unwrap()), "b.yaml");
    assert_eq!(source_path(runner.get_next().unwrap()), "c.yaml");
    // --- 仕様: loop_playback=true は末尾の次で先頭へ wrap する ---
    assert_eq!(source_path(runner.get_next().unwrap()), "a.yaml");
    assert_eq!(source_path(runner.get_next().unwrap()), "b.yaml");
}

#[test]
fn runner_should_continue_stops_after_all_items_when_no_loop() {
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
}

#[test]
fn runner_shuffle_preserves_membership_not_order() {
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
fn runner_random_returns_only_input_members() {
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
fn runner_get_duration_priority_source_then_default_then_fallback() {
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
fn runner_get_duration_falls_back_to_5000_when_nothing_set() {
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
// (3b) playlist デシリアライズ経路の回帰ガード（既存バグの固定）
// =====================================================================

#[test]
fn load_playlist_currently_fails_on_internally_tagged_source_bug() {
    // ★既存バグの回帰ガード★
    // PlaylistSource は内部タグ enum (#[serde(tag = "type")]) なのに、各 variant 構造体も
    // `#[serde(rename = "type")] type_` を持つ。タグが消費された後 inner struct の `type` が
    // 「missing field」になり、**全ての playlist がデシリアライズできない**。
    // リポ同梱の playlists/*.yaml すら読めない。これはプロダクションのバグなのでテストでは
    // 直さず、現状の挙動（失敗する）を固定して将来の修正を検知できるようにする。
    // models.rs の variant struct から `type_` フィールドを除く（or untagged 化する）と
    // この assert は反転するので、修正時にここを更新するシグナルになる。
    let root = workspace("plbug");
    let yaml = "playback:\n  order: sequence\n  loop_playback: true\nsources:\n  - type: pattern\n    path: \"a.yaml\"\n";
    let path = root.join("pl.yaml");
    std::fs::write(&path, yaml).unwrap();

    let result = load_playlist(&path);
    assert!(
        result.is_err(),
        "回帰ガード: 内部タグ/フィールド衝突バグが残る限り load_playlist は失敗するはず。\
         成功したならバグが直っている → このテストを正常系に書き換えること"
    );
    let msg = result.unwrap_err().to_string();
    assert!(
        msg.contains("missing field `type`"),
        "想定どおりの失敗理由（type フィールド衝突）であること。実際: {msg}"
    );

    let _ = std::fs::remove_dir_all(&root);
}
