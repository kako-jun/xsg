use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Playback order
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Order {
    Sequence,
    Random,
    Shuffle,
}

/// Playback configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playback {
    pub order: Order,
    #[serde(default = "default_loop")]
    pub loop_playback: bool,
    #[serde(rename = "defaultDuration")]
    pub default_duration: Option<f32>,
}

fn default_loop() -> bool {
    true
}

/// Pattern source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternSource {
    pub path: String,
    pub duration: Option<f32>,
}

/// URL source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UrlSource {
    pub url: String,
    pub readonly: Option<bool>,
    pub duration: Option<f32>,
}

/// Image source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageSource {
    pub src: String,
    pub fit: Option<String>,
    pub tile: Option<bool>,
    #[serde(rename = "tileSize")]
    pub tile_size: Option<f32>,
    pub duration: Option<f32>,
}

/// Inline source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InlineSource {
    pub pattern: HashMap<String, serde_json::Value>,
    pub duration: Option<f32>,
}

/// Playlist source (union type)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum PlaylistSource {
    #[serde(rename = "pattern")]
    Pattern(PatternSource),
    #[serde(rename = "url")]
    Url(UrlSource),
    #[serde(rename = "image")]
    Image(ImageSource),
    #[serde(rename = "inline")]
    Inline(InlineSource),
}

/// Pattern generator constraints
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Constraints {
    pub presets: Option<Vec<String>>,
    pub layers: Option<LayerConstraints>,
    pub colors: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayerConstraints {
    pub min: Option<f32>,
    pub max: Option<f32>,
}

/// Pattern generator configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Generator {
    #[serde(default)]
    pub enabled: bool,
    pub count: Option<f32>,
    pub duration: Option<f32>,
    pub constraints: Option<Constraints>,
}

/// Playlist definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Playlist {
    pub playback: Playback,
    pub sources: Option<Vec<PlaylistSource>>,
    pub generator: Option<Generator>,
}
