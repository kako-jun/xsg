/*!
Playlist Module

Manages playlist playback with orthogonal design:
- Data source (sources vs generator)
- Playback order (sequence vs random vs shuffle)
- Loop mode (true vs false)
*/

pub mod models;
pub mod runner;

pub use models::*;
pub use runner::PlaylistRunner;

use anyhow::Result;
use std::fs;
use std::path::Path;

/// Load playlist from YAML file
pub fn load_playlist(path: &Path) -> Result<Playlist> {
    let content = fs::read_to_string(path)?;
    let playlist: Playlist = serde_yaml::from_str(&content)?;
    Ok(playlist)
}

/// Load playlist from JSON file
pub fn load_playlist_json(path: &Path) -> Result<Playlist> {
    let content = fs::read_to_string(path)?;
    let playlist: Playlist = serde_json::from_str(&content)?;
    Ok(playlist)
}
