mod patterns;
mod pattern_loader;
mod pattern_expander;
mod displays;
mod calibration;
mod playlist;

use displays::{print_display_list, select_displays, DisplayInfo};
use patterns::{load_patterns, PatternsResponse};
use pattern_loader::load_pattern_with_params;
use calibration::{CalibrationStatus, ControlResult};
use playlist::{Playlist, PlaylistRunner};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

/// Tauri command: Get all available patterns
#[tauri::command]
fn get_patterns() -> Result<PatternsResponse, String> {
    match load_patterns() {
        Ok(patterns) => Ok(PatternsResponse { patterns }),
        Err(e) => Err(format!("Failed to load patterns: {}", e)),
    }
}

/// Tauri command: Get specific pattern with parameters
#[tauri::command]
fn get_pattern(pattern_id: String, params: HashMap<String, String>) -> Result<Value, String> {
    match load_pattern_with_params(&pattern_id, params) {
        Ok(pattern) => Ok(pattern),
        Err(e) => Err(format!("Failed to load pattern '{}': {}", pattern_id, e)),
    }
}

/// Tauri command: Get calibration status
#[tauri::command]
fn get_calibration_status() -> CalibrationStatus {
    calibration::get_calibration_status()
}

/// Tauri command: Set gamma correction
#[tauri::command]
fn set_gamma(gamma: f32) -> ControlResult {
    calibration::set_gamma(gamma)
}

/// Tauri command: Reset gamma to 1.0
#[tauri::command]
fn reset_gamma() -> ControlResult {
    calibration::reset_gamma()
}

/// Tauri command: Restore gamma to original value
#[tauri::command]
fn restore_gamma() -> ControlResult {
    calibration::restore_gamma()
}

/// Tauri command: Disable night mode
#[tauri::command]
fn disable_night_mode() -> ControlResult {
    calibration::disable_night_mode()
}

/// Tauri command: Load playlist from file
#[tauri::command]
fn load_playlist(path: String) -> Result<Playlist, String> {
    let playlist_path = PathBuf::from(path);

    if playlist_path.extension().and_then(|s| s.to_str()) == Some("json") {
        playlist::load_playlist_json(&playlist_path)
            .map_err(|e| format!("Failed to load playlist: {}", e))
    } else {
        playlist::load_playlist(&playlist_path)
            .map_err(|e| format!("Failed to load playlist: {}", e))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(pattern: String, display_spec: String, list_displays: bool) {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(move |app, args, _cwd| {
            // This callback is triggered when a second instance is launched
            log::info!("Single instance: Another instance attempted to start with args: {:?}", args);

            // If args contain --pattern, switch to that pattern
            if let Some(pattern_arg_idx) = args.iter().position(|arg| arg == "--pattern") {
                if let Some(new_pattern) = args.get(pattern_arg_idx + 1) {
                    log::info!("Switching to pattern: {}", new_pattern);

                    // Switch pattern on all display windows by navigating to new URL
                    for i in 0..8 {
                        let window_label = format!("display-{}", i);
                        if let Some(window) = app.get_webview_window(&window_label) {
                            let url = if cfg!(debug_assertions) {
                                format!("http://localhost:3000/?pattern={}", new_pattern)
                            } else {
                                format!("tauri://localhost/?pattern={}", new_pattern)
                            };
                            let js = format!(
                                "window.location.href = '{}';",
                                url.replace('\'', "\\'")
                            );
                            let _ = window.eval(&js);
                        } else {
                            break;
                        }
                    }
                }
            }

            // Bring existing windows to front
            if let Some(window) = app.get_webview_window("display-0") {
                let _ = window.set_focus();
            }
        }))
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Get available monitors
            let monitors = app.available_monitors()?;
            let primary_monitor = app.primary_monitor()?.expect("No primary monitor found");

            // Convert monitors to DisplayInfo
            let all_displays: Vec<DisplayInfo> = monitors
                .iter()
                .enumerate()
                .map(|(i, m)| {
                    let is_primary = m.name() == primary_monitor.name();
                    DisplayInfo::from_monitor(m, i, is_primary)
                })
                .collect();

            // If --list-displays, print and exit
            if list_displays {
                print_display_list(&all_displays);
                std::process::exit(0);
            }

            // Select displays based on specification
            let selected_displays = select_displays(&display_spec, &all_displays);

            if selected_displays.is_empty() {
                eprintln!("[ERROR] No displays selected with spec: {}", display_spec);
                std::process::exit(1);
            }

            // Build URL with pattern parameter
            let url = if cfg!(debug_assertions) {
                format!("http://localhost:3000/?pattern={}", pattern)
            } else {
                format!("tauri://localhost/?pattern={}", pattern)
            };

            // Get the default window (created by tauri.conf.json)
            // We'll close it and create new ones for each display
            if let Some(main_window) = app.get_webview_window("main") {
                main_window.close()?;
            }

            // Create a window for each selected display
            for (i, display) in selected_displays.iter().enumerate() {
                let window_label = format!("display-{}", i);

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
        })
        .invoke_handler(tauri::generate_handler![
            get_patterns,
            get_pattern,
            get_calibration_status,
            set_gamma,
            reset_gamma,
            restore_gamma,
            disable_night_mode,
            load_playlist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
