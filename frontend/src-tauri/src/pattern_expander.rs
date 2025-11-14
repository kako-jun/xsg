use anyhow::{Context, Result};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Pattern expander for handling template inheritance (extends) and parameter expansion
pub struct PatternExpander {
    patterns_dir: PathBuf,
}

impl PatternExpander {
    /// Create a new PatternExpander with the specified patterns directory
    pub fn new(patterns_dir: PathBuf) -> Self {
        Self { patterns_dir }
    }

    /// Expand a pattern with parameter substitution
    ///
    /// # Arguments
    /// * `pattern` - Pattern data with {{paramName}} variables
    /// * `user_params` - User-provided parameter values (from URL query or API)
    pub fn expand(&self, pattern: &mut Value, user_params: &HashMap<String, String>) -> Result<()> {
        // Resolve parameter values
        let params = self.resolve_params(pattern, user_params)?;

        // Expand {{paramName}} in all string values
        self.expand_object(pattern, &params);

        Ok(())
    }

    /// Resolve template inheritance (extends)
    ///
    /// # Arguments
    /// * `pattern` - Pattern that may have extends property
    pub fn resolve_extends(&self, pattern: &mut Value) -> Result<()> {
        // Check if pattern has extends property
        if !pattern.is_object() {
            return Ok(());
        }

        let extends_path = pattern
            .get("extends")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if extends_path.is_none() {
            return Ok(());
        }

        let extends_path = extends_path.unwrap();

        // Load base pattern
        let mut base_pattern = self.load_pattern_file(&extends_path)?;

        // Recursively resolve base pattern's extends
        self.resolve_extends(&mut base_pattern)?;

        // Merge base and child patterns
        self.merge_patterns(&mut base_pattern, pattern);

        // Replace current pattern with merged result
        *pattern = base_pattern;

        Ok(())
    }

    /// Resolve parameter values (default + user overrides)
    fn resolve_params(
        &self,
        pattern: &Value,
        user_params: &HashMap<String, String>,
    ) -> Result<HashMap<String, Value>> {
        let mut resolved = HashMap::new();

        // Get param definitions from pattern
        if let Some(params_obj) = pattern.get("params").and_then(|v| v.as_object()) {
            for (key, param_def) in params_obj {
                if let Some(user_value) = user_params.get(key) {
                    // User provided value - coerce to correct type
                    let param_type = param_def
                        .get("type")
                        .and_then(|v| v.as_str())
                        .unwrap_or("string");
                    resolved.insert(key.clone(), self.coerce_type(user_value, param_type)?);
                } else if let Some(default_value) = param_def.get("default") {
                    // Default value
                    resolved.insert(key.clone(), default_value.clone());
                }
            }
        }

        Ok(resolved)
    }

    /// Coerce value to the specified type
    fn coerce_type(&self, value: &str, param_type: &str) -> Result<Value> {
        match param_type {
            "number" => {
                // Try to parse as integer first, then float
                if let Ok(int_val) = value.parse::<i64>() {
                    Ok(Value::Number(int_val.into()))
                } else if let Ok(float_val) = value.parse::<f64>() {
                    Ok(Value::Number(
                        serde_json::Number::from_f64(float_val)
                            .context("Invalid float value")?,
                    ))
                } else {
                    Err(anyhow::anyhow!("Cannot parse '{}' as number", value))
                }
            }
            "boolean" => {
                let bool_val = value.to_lowercase() == "true";
                Ok(Value::Bool(bool_val))
            }
            "string" | "color" => Ok(Value::String(value.to_string())),
            _ => Ok(Value::String(value.to_string())),
        }
    }

    /// Recursively expand {{paramName}} in all string values
    fn expand_object(&self, obj: &mut Value, params: &HashMap<String, Value>) {
        match obj {
            Value::String(s) => {
                *obj = self.expand_string(s, params);
            }
            Value::Object(map) => {
                for (_, value) in map.iter_mut() {
                    self.expand_object(value, params);
                }
            }
            Value::Array(arr) => {
                for item in arr.iter_mut() {
                    self.expand_object(item, params);
                }
            }
            _ => {}
        }
    }

    /// Expand {{paramName}} in a single string
    fn expand_string(&self, s: &str, params: &HashMap<String, Value>) -> Value {
        // Check if the entire string is a single variable reference
        if let Some(var_name) = self.extract_single_var(s) {
            if let Some(value) = params.get(var_name) {
                return value.clone();
            }
            return Value::String(s.to_string());
        }

        // Replace all {{paramName}} occurrences
        let mut result = s.to_string();
        for (key, value) in params {
            let placeholder = format!("{{{{{}}}}}", key);
            if result.contains(&placeholder) {
                let replacement = match value {
                    Value::String(s) => s.clone(),
                    Value::Number(n) => n.to_string(),
                    Value::Bool(b) => b.to_string(),
                    _ => value.to_string(),
                };
                result = result.replace(&placeholder, &replacement);
            }
        }

        Value::String(result)
    }

    /// Extract variable name if string is a single {{varName}} reference
    fn extract_single_var<'a>(&self, s: &'a str) -> Option<&'a str> {
        if s.starts_with("{{") && s.ends_with("}}") && s.matches("{{").count() == 1 {
            Some(&s[2..s.len() - 2])
        } else {
            None
        }
    }

    /// Merge base and child patterns
    fn merge_patterns(&self, base: &mut Value, child: &Value) {
        if !base.is_object() || !child.is_object() {
            return;
        }

        let base_obj = base.as_object_mut().unwrap();
        let child_obj = child.as_object().unwrap();

        // Merge params: individual property merging (child overrides base)
        if let Some(child_params) = child_obj.get("params") {
            if let Some(child_params_obj) = child_params.as_object() {
                if let Some(base_params) = base_obj.get_mut("params") {
                    if let Some(base_params_obj) = base_params.as_object_mut() {
                        // Merge each parameter
                        for (key, child_param) in child_params_obj {
                            if let Some(base_param) = base_params_obj.get_mut(key) {
                                // Merge child param properties with base param
                                self.merge_param_properties(base_param, child_param);
                            } else {
                                // New param from child
                                base_params_obj.insert(key.clone(), child_param.clone());
                            }
                        }
                    }
                } else {
                    // No base params, use child params
                    base_obj.insert("params".to_string(), child_params.clone());
                }
            }
        }

        // Canvas: child overrides base
        if let Some(child_canvas) = child_obj.get("canvas") {
            base_obj.insert("canvas".to_string(), child_canvas.clone());
        }

        // Nodes: child overrides base
        if let Some(child_nodes) = child_obj.get("nodes") {
            base_obj.insert("nodes".to_string(), child_nodes.clone());
        }

        // Name and category: child overrides base
        if let Some(child_name) = child_obj.get("name") {
            base_obj.insert("name".to_string(), child_name.clone());
        }
        if let Some(child_category) = child_obj.get("category") {
            base_obj.insert("category".to_string(), child_category.clone());
        }

        // Remove extends from merged pattern
        base_obj.remove("extends");
    }

    /// Merge child param properties with base param
    fn merge_param_properties(&self, base_param: &mut Value, child_param: &Value) {
        if !base_param.is_object() || !child_param.is_object() {
            return;
        }

        let base_param_obj = base_param.as_object_mut().unwrap();
        let child_param_obj = child_param.as_object().unwrap();

        // Child properties override base properties
        for (key, value) in child_param_obj {
            base_param_obj.insert(key.clone(), value.clone());
        }
    }

    /// Load a pattern file by path
    fn load_pattern_file(&self, path: &str) -> Result<Value> {
        // Normalize path
        let file_path = if path.starts_with('/') {
            PathBuf::from(&path[1..])
        } else {
            self.patterns_dir.join(path)
        };

        // Read YAML
        let content = fs::read_to_string(&file_path)
            .with_context(|| format!("Failed to read pattern file: {}", file_path.display()))?;

        let yaml: Value = serde_yaml::from_str(&content)
            .with_context(|| format!("Failed to parse YAML: {}", file_path.display()))?;

        Ok(yaml)
    }
}

/// Get the patterns directory path
pub fn get_patterns_dir() -> Result<PathBuf> {
    // In development: use project_root/patterns
    // In production: use exe_dir/patterns or resources/patterns

    if cfg!(debug_assertions) {
        // Development mode
        let current_dir = std::env::current_dir()?;

        // Try to find project root by looking for patterns directory
        let mut search_dir = current_dir.clone();
        loop {
            let patterns_dir = search_dir.join("patterns");
            if patterns_dir.exists() && patterns_dir.is_dir() {
                return Ok(patterns_dir);
            }

            if !search_dir.pop() {
                break;
            }
        }

        // Fallback: use current_dir/patterns
        Ok(current_dir.join("patterns"))
    } else {
        // Production mode
        let exe_path = std::env::current_exe()?;
        let exe_dir = exe_path.parent().context("Cannot get exe directory")?;
        Ok(exe_dir.join("patterns"))
    }
}
