mod patterns;
mod pattern_loader;

use patterns::{load_patterns, PatternsResponse};
use pattern_loader::load_pattern_with_params;
use serde_json::Value;
use std::collections::HashMap;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      get_patterns,
      get_pattern,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
