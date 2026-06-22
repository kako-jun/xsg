use super::types::{ControlResult, NightModeStatus};
#[cfg(target_os = "linux")]
use std::process::Command;

/// Detect if night mode / blue light filter is enabled
pub fn detect_night_mode() -> NightModeStatus {
    #[cfg(target_os = "windows")]
    return detect_night_mode_windows();

    #[cfg(target_os = "linux")]
    return detect_night_mode_linux();

    #[cfg(target_os = "macos")]
    return detect_night_mode_macos();

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return NightModeStatus::not_supported("Night mode detection not supported on this platform");
}

/// Disable night mode / blue light filter
pub fn disable_night_mode() -> ControlResult {
    #[cfg(target_os = "windows")]
    return disable_night_mode_windows();

    #[cfg(target_os = "linux")]
    return disable_night_mode_linux();

    #[cfg(target_os = "macos")]
    return disable_night_mode_macos();

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return ControlResult::failure("Night mode control not supported on this platform");
}

// ============================================================================
// Windows Implementation
// ============================================================================

#[cfg(target_os = "windows")]
fn detect_night_mode_windows() -> NightModeStatus {
    use winreg::enums::*;
    use winreg::RegKey;

    // Registry path for Night Light settings
    let key_path = r"Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default$windows.data.bluelightreduction.bluelightreductionstate\windows.data.bluelightreduction.bluelightreductionstate";

    match RegKey::predef(HKEY_CURRENT_USER).open_subkey(key_path) {
        Ok(key) => {
            match key.get_raw_value("Data") {
                Ok(value) => {
                    // The "Data" value is binary; byte 18 or 23 indicates state
                    // This is a simplified check
                    let data = value.bytes;
                    let enabled =
                        data.len() > 23 && matches!(data[23], 0x15 | 0x13 | 0x10 | 0x01 | 0x02);

                    NightModeStatus {
                        supported: true,
                        enabled,
                        message: "OK".to_string(),
                    }
                }
                Err(_) => NightModeStatus {
                    supported: true,
                    enabled: false,
                    message: "Could not read Night Light data".to_string(),
                },
            }
        }
        Err(_) => NightModeStatus {
            supported: true,
            enabled: false,
            message: "Night Light registry key not found (likely disabled)".to_string(),
        },
    }
}

#[cfg(target_os = "windows")]
fn disable_night_mode_windows() -> ControlResult {
    // Note: Windows Night Light cannot be easily controlled via registry
    // It requires Windows.System.Display API (UWP/WinRT)
    ControlResult::failure(
        "Windows Night Light control requires manual action: Settings → Display → Night light → Turn off"
    )
}

// ============================================================================
// Linux Implementation
// ============================================================================

#[cfg(target_os = "linux")]
fn detect_night_mode_linux() -> NightModeStatus {
    // Check if redshift is running
    if let Ok(output) = Command::new("pgrep").args(["-x", "redshift"]).output() {
        if output.status.success() && !output.stdout.is_empty() {
            return NightModeStatus {
                supported: true,
                enabled: true,
                message: "Redshift is running".to_string(),
            };
        }
    }

    // Check if f.lux is running
    if let Ok(output) = Command::new("pgrep").args(["-x", "fluxgui"]).output() {
        if output.status.success() && !output.stdout.is_empty() {
            return NightModeStatus {
                supported: true,
                enabled: true,
                message: "f.lux is running".to_string(),
            };
        }
    }

    NightModeStatus {
        supported: true,
        enabled: false,
        message: "No night mode application detected".to_string(),
    }
}

#[cfg(target_os = "linux")]
fn disable_night_mode_linux() -> ControlResult {
    // Try to kill redshift
    if let Ok(output) = Command::new("pkill").args(["-x", "redshift"]).output() {
        if output.status.success() {
            return ControlResult::success("Redshift disabled");
        }
    }

    // Try to kill f.lux
    if let Ok(output) = Command::new("pkill").args(["-x", "fluxgui"]).output() {
        if output.status.success() {
            return ControlResult::success("f.lux disabled");
        }
    }

    ControlResult::failure("No night mode application found to disable")
}

// ============================================================================
// macOS Implementation
// ============================================================================

#[cfg(target_os = "macos")]
fn detect_night_mode_macos() -> NightModeStatus {
    // TODO: Implement using CoreBrightness (unofficial API)
    NightModeStatus {
        supported: true,
        enabled: false,
        message: "macOS Night Shift detection not yet implemented".to_string(),
    }
}

#[cfg(target_os = "macos")]
fn disable_night_mode_macos() -> ControlResult {
    // TODO: Implement using CoreBrightness (unofficial API) or AppleScript
    ControlResult::failure(
        "macOS Night Shift control not yet implemented. Disable manually in System Preferences.",
    )
}
