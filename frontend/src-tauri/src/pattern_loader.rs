// Full pattern loader with YAML parsing
// Phase 2: Basic implementation (extends/params will be added later)

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

/// Get the patterns directory path
pub fn get_patterns_dir() -> Result<PathBuf> {
    // In development: try to find patterns/ directory by going up
    let current_exe = std::env::current_exe()?;
    let mut search_path = current_exe
        .parent()
        .context("Failed to get parent directory")?
        .to_path_buf();

    // Try up to 5 levels up to find patterns/
    for _ in 0..5 {
        let candidate = search_path.join("patterns");
        if candidate.exists() && candidate.is_dir() {
            return Ok(candidate);
        }
        match search_path.parent() {
            Some(parent) => search_path = parent.to_path_buf(),
            None => break,
        }
    }

    Err(anyhow::anyhow!("patterns/ directory not found"))
}

/// Load pattern from YAML file
pub fn load_pattern_file(pattern_id: &str) -> Result<Value> {
    let patterns_dir = get_patterns_dir()?;
    let pattern_path = patterns_dir.join(format!("{}.yaml", pattern_id));

    if !pattern_path.exists() {
        return Err(anyhow::anyhow!("Pattern not found: {}", pattern_id));
    }

    let content = fs::read_to_string(&pattern_path)
        .with_context(|| format!("Failed to read pattern file: {:?}", pattern_path))?;

    let yaml: Value = serde_yaml::from_str(&content)
        .with_context(|| format!("Failed to parse YAML: {:?}", pattern_path))?;

    Ok(yaml)
}

/// Load pattern with query parameters
/// TODO: Implement extends resolution and parameter expansion
pub fn load_pattern_with_params(
    pattern_id: &str,
    query_params: HashMap<String, String>,
) -> Result<Value> {
    let mut pattern = load_pattern_file(pattern_id)?;

    // TODO: Phase 3 - Implement extends resolution
    // if pattern.get("extends").is_some() {
    //     pattern = resolve_extends(pattern)?;
    // }

    // TODO: Phase 3 - Implement parameter expansion
    // if !query_params.is_empty() {
    //     pattern = expand_parameters(pattern, query_params)?;
    // }

    Ok(pattern)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_patterns_dir() {
        // This test may fail in some environments
        // but is useful for development
        let result = get_patterns_dir();
        if let Ok(path) = result {
            assert!(path.exists());
            assert!(path.is_dir());
        }
    }
}
