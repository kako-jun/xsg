/*!
Display Calibration Support

Phase 1: Read-only status reporting
- Gamma: Detect current gamma values (Windows/Linux/macOS)
- Night Mode: Detect if enabled (Windows/Linux/macOS)
- HDR: Detect if enabled (Windows only)
- GPU: Detect GPU vendor

Phase 2: Control functions
- Gamma: Set, reset, restore
- Night Mode: Disable
*/

pub mod gamma;
pub mod gpu;
pub mod hdr;
pub mod night_mode;
pub mod types;

pub use types::*;

/// Get complete calibration status
pub fn get_calibration_status() -> CalibrationStatus {
    let platform = std::env::consts::OS.to_string();

    CalibrationStatus {
        platform,
        gamma: gamma::detect_gamma(),
        night_mode: night_mode::detect_night_mode(),
        hdr: hdr::detect_hdr(),
        gpu: gpu::detect_gpu(),
    }
}

/// Set gamma correction to specified value
pub fn set_gamma(gamma: f32) -> ControlResult {
    gamma::set_gamma(gamma)
}

/// Reset gamma to 1.0 (linear)
pub fn reset_gamma() -> ControlResult {
    gamma::reset_gamma()
}

/// Restore gamma to saved value
pub fn restore_gamma() -> ControlResult {
    gamma::restore_gamma()
}

/// Disable night mode / blue light filter
pub fn disable_night_mode() -> ControlResult {
    night_mode::disable_night_mode()
}
