use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::Monitor;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub index: usize,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
    pub name: String,
}

impl DisplayInfo {
    pub fn from_monitor(monitor: &Monitor, index: usize, is_primary: bool) -> Self {
        let position = monitor.position();
        let size = monitor.size();

        Self {
            index,
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            is_primary,
            name: monitor
                .name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| format!("Display {}", index + 1)),
        }
    }
}

/// Group displays by position (X or Y coordinate)
pub fn group_displays_by_position(
    displays: &[DisplayInfo],
    axis: &str,
) -> Vec<Vec<DisplayInfo>> {
    let mut groups: HashMap<i32, Vec<DisplayInfo>> = HashMap::new();

    for display in displays {
        let coord = if axis == "x" { display.x } else { display.y };
        groups.entry(coord).or_insert_with(Vec::new).push(display.clone());
    }

    // Sort groups by coordinate
    let mut sorted_groups: Vec<_> = groups.into_iter().collect();
    sorted_groups.sort_by_key(|(coord, _)| *coord);

    sorted_groups.into_iter().map(|(_, group)| group).collect()
}

/// Select displays based on specification string
///
/// Supported formats:
/// - "all": all displays
/// - "primary": primary display only
/// - "left", "left-2", "left-3": left-to-right groups
/// - "right", "right-2": right-to-left groups
/// - "top", "top-2": top-to-bottom groups
/// - "bottom", "bottom-2": bottom-to-top groups
/// - Multiple specs separated by comma: "left,right"
pub fn select_displays(display_spec: &str, all_displays: &[DisplayInfo]) -> Vec<DisplayInfo> {
    if display_spec.is_empty() || display_spec == "all" {
        return all_displays.to_vec();
    }

    let mut selected = Vec::new();
    let specs: Vec<&str> = display_spec.split(',').map(|s| s.trim()).collect();

    for spec in specs {
        if spec == "primary" {
            selected.extend(all_displays.iter().filter(|d| d.is_primary).cloned());
        } else if spec.starts_with("left") {
            // Group by X coordinate (same X = same vertical column)
            let groups = group_displays_by_position(all_displays, "x");
            let index = extract_index(spec).unwrap_or(1);
            if index > 0 && index <= groups.len() {
                selected.extend(groups[index - 1].clone());
            }
        } else if spec.starts_with("right") {
            let groups = group_displays_by_position(all_displays, "x");
            let index = extract_index(spec).unwrap_or(1);
            // Right means from the end
            if index > 0 && index <= groups.len() {
                selected.extend(groups[groups.len() - index].clone());
            }
        } else if spec.starts_with("top") {
            // Group by Y coordinate (same Y = same horizontal row)
            let groups = group_displays_by_position(all_displays, "y");
            let index = extract_index(spec).unwrap_or(1);
            if index > 0 && index <= groups.len() {
                selected.extend(groups[index - 1].clone());
            }
        } else if spec.starts_with("bottom") {
            let groups = group_displays_by_position(all_displays, "y");
            let index = extract_index(spec).unwrap_or(1);
            // Bottom means from the end
            if index > 0 && index <= groups.len() {
                selected.extend(groups[groups.len() - index].clone());
            }
        }
    }

    // Remove duplicates while preserving order
    let mut seen = std::collections::HashSet::new();
    selected.retain(|d| {
        let key = (d.x, d.y, d.width, d.height);
        seen.insert(key)
    });

    selected
}

/// Extract index from spec like "left-2" -> Some(2), "left" -> None
fn extract_index(spec: &str) -> Option<usize> {
    if let Some(dash_pos) = spec.find('-') {
        spec[dash_pos + 1..].parse().ok()
    } else {
        None
    }
}

/// Print display list to console
pub fn print_display_list(displays: &[DisplayInfo]) {
    println!("[INFO] Available displays:");
    println!();

    for (i, d) in displays.iter().enumerate() {
        let primary_marker = if d.is_primary { " (Primary)" } else { "" };
        println!(
            "  Display {}: {}x{} at ({}, {}){}",
            i + 1,
            d.width,
            d.height,
            d.x,
            d.y,
            primary_marker
        );
    }

    println!();
    println!("Position-based groups:");

    // Show left-right groups
    let left_groups = group_displays_by_position(displays, "x");
    println!("  Left-to-right: {} groups", left_groups.len());
    for (i, group) in left_groups.iter().enumerate() {
        let displays_str = group
            .iter()
            .map(|d| format!("{}x{}", d.width, d.height))
            .collect::<Vec<_>>()
            .join(", ");
        println!("    left-{}: {}", i + 1, displays_str);
    }

    // Show top-bottom groups
    let top_groups = group_displays_by_position(displays, "y");
    println!("  Top-to-bottom: {} groups", top_groups.len());
    for (i, group) in top_groups.iter().enumerate() {
        let displays_str = group
            .iter()
            .map(|d| format!("{}x{}", d.width, d.height))
            .collect::<Vec<_>>()
            .join(", ");
        println!("    top-{}: {}", i + 1, displays_str);
    }

    println!();
}
