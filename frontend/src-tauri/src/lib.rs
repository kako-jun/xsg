mod calibration;
mod displays;
pub mod pattern_expander;
mod pattern_loader;
pub mod patterns;
pub mod playlist;
mod window_manager;

use calibration::{CalibrationStatus, ControlResult};
use pattern_loader::load_pattern_with_params;
use patterns::{load_patterns, PatternsResponse};
use playlist::Playlist;
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;

/// Tauri command: Get all available patterns
#[tauri::command]
fn get_patterns() -> Result<PatternsResponse, String> {
    match load_patterns() {
        Ok(patterns) => Ok(PatternsResponse { patterns }),
        Err(e) => Err(format!("Failed to load patterns: {e}")),
    }
}

/// Tauri command: Get specific pattern with parameters
#[tauri::command]
fn get_pattern(pattern_id: String, params: HashMap<String, String>) -> Result<Value, String> {
    match load_pattern_with_params(&pattern_id, params) {
        Ok(pattern) => Ok(pattern),
        Err(e) => Err(format!("Failed to load pattern '{pattern_id}': {e}")),
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
            .map_err(|e| format!("Failed to load playlist: {e}"))
    } else {
        playlist::load_playlist(&playlist_path).map_err(|e| format!("Failed to load playlist: {e}"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(pattern: String, display_spec: String, list_displays: bool) {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(
            move |app, args, _cwd| {
                window_manager::handle_second_instance(app, args);
            },
        ))
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            window_manager::setup_windows(app, &pattern, &display_spec, list_displays)?;

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
