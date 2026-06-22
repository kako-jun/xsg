//! ウィンドウ生成・setup・URL ビルダーを集約するモジュール。
//!
//! `lib.rs` は Tauri command 定義と `run()` のプラグイン/ハンドラ配線に専念し、
//! 「どのモニタにどんな URL のウィンドウを立てるか」という window のライフサイクルは
//! ここに寄せる（単一責務）。display の**選択**ロジック自体は `displays.rs`
//! （`select_displays` / `print_display_list` / `DisplayInfo`）のままで、ここはそれを
//! 呼び出して app にウィンドウを生成する側に徹する。

use crate::displays::{print_display_list, select_displays, DisplayInfo};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// パターン名から表示用 URL を組み立てる単一ヘルパ。
///
/// dev（`debug_assertions`）では Vite dev サーバー、prod では `tauri://localhost` を指す。
/// この分岐とクエリ整形は lib.rs の2箇所（second-instance のパターン切替・初回 setup）に
/// 重複していたものをここへ集約したもの。挙動は元と完全一致させる。
pub(crate) fn pattern_url(pattern: &str) -> String {
    if cfg!(debug_assertions) {
        format!("http://localhost:3000/?pattern={pattern}")
    } else {
        format!("tauri://localhost/?pattern={pattern}")
    }
}

/// app の利用可能モニタを列挙して `DisplayInfo` のベクタに変換する。
///
/// primary 判定は `primary_monitor()` の name 一致で行う（元の setup ロジックそのまま）。
fn collect_displays(app: &tauri::App) -> tauri::Result<Vec<DisplayInfo>> {
    let monitors = app.available_monitors()?;
    let primary_monitor = app.primary_monitor()?.expect("No primary monitor found");

    Ok(monitors
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let is_primary = m.name() == primary_monitor.name();
            DisplayInfo::from_monitor(m, i, is_primary)
        })
        .collect())
}

/// setup フェーズ本体: モニタ列挙 → DisplayInfo 変換 → list_displays 分岐 →
/// select_displays → 空チェック → main window close → ウィンドウ生成ループ。
///
/// `--list-displays` 指定時は一覧を print して `exit(0)`、選択が空なら `exit(1)`。
/// `std::process::exit` の挙動・ログ出力・エラー伝播は lib.rs にあった元実装のまま。
pub(crate) fn setup_windows(
    app: &mut tauri::App,
    pattern: &str,
    display_spec: &str,
    list_displays: bool,
) -> tauri::Result<()> {
    // Get available monitors and convert to DisplayInfo
    let all_displays = collect_displays(app)?;

    // If --list-displays, print and exit
    if list_displays {
        print_display_list(&all_displays);
        std::process::exit(0);
    }

    // Select displays based on specification
    let selected_displays = select_displays(display_spec, &all_displays);

    if selected_displays.is_empty() {
        eprintln!("[ERROR] No displays selected with spec: {display_spec}");
        std::process::exit(1);
    }

    // Build URL with pattern parameter
    let url = pattern_url(pattern);

    // Get the default window (created by tauri.conf.json)
    // We'll close it and create new ones for each display
    if let Some(main_window) = app.get_webview_window("main") {
        main_window.close()?;
    }

    // Create a window for each selected display
    for (i, display) in selected_displays.iter().enumerate() {
        let window_label = format!("display-{i}");

        WebviewWindowBuilder::new(
            app,
            &window_label,
            WebviewUrl::External(url.parse().unwrap()),
        )
        .position(display.x as f64, display.y as f64)
        .inner_size(display.width as f64, display.height as f64)
        .resizable(false)
        .fullscreen(false) // We manually set size to display size
        .decorations(false)
        .build()?;

        log::info!(
            "Created window {} on display {} ({}x{} at {},{})",
            window_label,
            display.name,
            display.width,
            display.height,
            display.x,
            display.y
        );
    }

    Ok(())
}

/// single-instance プラグインのコールバック本体。
///
/// 2つ目のインスタンスが起動したときに呼ばれる。`--pattern <name>` があればその
/// パターンへ全 display ウィンドウを切り替え、最後に既存ウィンドウを前面に出す。
pub(crate) fn handle_second_instance<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    args: Vec<String>,
) {
    // This callback is triggered when a second instance is launched
    log::info!("Single instance: Another instance attempted to start with args: {args:?}");

    // If args contain --pattern, switch to that pattern
    if let Some(pattern_arg_idx) = args.iter().position(|arg| arg == "--pattern") {
        if let Some(new_pattern) = args.get(pattern_arg_idx + 1) {
            log::info!("Switching to pattern: {new_pattern}");
            switch_pattern(app, new_pattern);
        }
    }

    // Bring existing windows to front
    if let Some(window) = app.get_webview_window("display-0") {
        let _ = window.set_focus();
    }
}

/// 全 display ウィンドウ（最大8枚）を新パターンの URL へ `location.href` 書換で遷移させる。
///
/// `display-{i}` を 0 から走査し、存在しないラベルに当たった時点で break する
/// （元実装と同じ早期終了）。URL は `pattern_url` で組み立て、シングルクォートを
/// エスケープしてから `window.eval` で実行する。
fn switch_pattern<R: tauri::Runtime>(app: &tauri::AppHandle<R>, new_pattern: &str) {
    // Switch pattern on all display windows by navigating to new URL
    for i in 0..8 {
        let window_label = format!("display-{i}");
        if let Some(window) = app.get_webview_window(&window_label) {
            let url = pattern_url(new_pattern);
            let js = format!("window.location.href = '{}';", url.replace('\'', "\\'"));
            let _ = window.eval(&js);
        } else {
            break;
        }
    }
}
