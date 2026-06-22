// Full pattern loader with YAML parsing
// Phase 3: Integrated with pattern_expander for extends and parameter expansion

use crate::pattern_expander::{get_patterns_dir, PatternExpander};
use anyhow::{Context, Result};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;

/// Load pattern from YAML file
pub fn load_pattern_file(pattern_id: &str) -> Result<Value> {
    let patterns_dir = get_patterns_dir()?;
    let pattern_path = patterns_dir.join(format!("{pattern_id}.yaml"));

    if !pattern_path.exists() {
        return Err(anyhow::anyhow!("Pattern not found: {pattern_id}"));
    }

    let content = fs::read_to_string(&pattern_path)
        .with_context(|| format!("Failed to read pattern file: {pattern_path:?}"))?;

    let yaml: Value = serde_yaml::from_str(&content)
        .with_context(|| format!("Failed to parse YAML: {pattern_path:?}"))?;

    Ok(yaml)
}

/// Load pattern with query parameters, resolving extends and expanding parameters
pub fn load_pattern_with_params(
    pattern_id: &str,
    query_params: HashMap<String, String>,
) -> Result<Value> {
    let mut pattern = load_pattern_file(pattern_id)?;

    // Get patterns directory
    let patterns_dir = get_patterns_dir()?;

    // Create pattern expander
    let expander = PatternExpander::new(patterns_dir);

    // 1. Resolve extends (template inheritance)
    expander.resolve_extends(&mut pattern)?;

    // 2. Expand parameters ({{paramName}} substitution)
    expander.expand(&mut pattern, &query_params)?;

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
