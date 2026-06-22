// Pattern loader for XSG
// Minimal implementation for Phase 1

use anyhow::{Context, Result};
use glob::glob;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Pattern metadata (extracted from YAML)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatternInfo {
    pub id: String,
    pub name: String,
    pub category: String,
}

/// Response for get_patterns API
#[derive(Debug, Serialize)]
pub struct PatternsResponse {
    pub patterns: Vec<PatternInfo>,
}

/// Get the patterns directory path
fn get_patterns_dir() -> Result<PathBuf> {
    // In development: ../../../patterns (from frontend/src-tauri/src/)
    // In production: Will need adjustment for bundled app
    let current_exe = std::env::current_exe()?;
    let mut patterns_dir = current_exe
        .parent()
        .context("Failed to get parent directory")?
        .to_path_buf();

    // Try to find patterns/ directory
    // Development: go up to project root
    for _ in 0..5 {
        let candidate = patterns_dir.join("patterns");
        if candidate.exists() {
            return Ok(candidate);
        }
        patterns_dir = patterns_dir
            .parent()
            .context("Failed to find patterns directory")?
            .to_path_buf();
    }

    Err(anyhow::anyhow!("patterns/ directory not found"))
}

/// Load all patterns from YAML files
pub fn load_patterns() -> Result<Vec<PatternInfo>> {
    let dir = get_patterns_dir()?;
    load_patterns_from(&dir)
}

/// Load all patterns from YAML files in the given directory
pub fn load_patterns_from(dir: &Path) -> Result<Vec<PatternInfo>> {
    let pattern = format!("{}/*.yaml", dir.display());

    let mut patterns = Vec::new();

    for entry in glob(&pattern).context("Failed to read glob pattern")? {
        match entry {
            Ok(path) => {
                if let Ok(info) = load_pattern_info(&path) {
                    patterns.push(info);
                }
            }
            Err(e) => {
                log::warn!("Failed to process glob entry: {}", e);
            }
        }
    }

    // Sort by id for consistent ordering
    patterns.sort_by(|a, b| a.id.cmp(&b.id));

    Ok(patterns)
}

/// Load pattern metadata from a single YAML file
fn load_pattern_info(path: &Path) -> Result<PatternInfo> {
    let content = fs::read_to_string(path)
        .with_context(|| format!("Failed to read pattern file: {:?}", path))?;

    let yaml: HashMap<String, serde_yaml::Value> = serde_yaml::from_str(&content)
        .with_context(|| format!("Failed to parse YAML: {:?}", path))?;

    let pattern_id = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Extract name and category from YAML
    let name = if let Some(name_str) = yaml.get("name").and_then(|v| v.as_str()) {
        name_str.to_string()
    } else {
        // Default: convert pattern-id to Title Case
        pattern_id
            .replace("-", " ")
            .split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                }
            })
            .collect::<Vec<_>>()
            .join(" ")
    };

    let category = yaml
        .get("category")
        .and_then(|v| v.as_str())
        .unwrap_or("Other")
        .to_string();

    Ok(PatternInfo {
        id: pattern_id,
        name,
        category,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pattern_info_creation() {
        let info = PatternInfo {
            id: "test".to_string(),
            name: "Test Pattern".to_string(),
            category: "Test".to_string(),
        };
        assert_eq!(info.id, "test");
        assert_eq!(info.name, "Test Pattern");
        assert_eq!(info.category, "Test");
    }
}
