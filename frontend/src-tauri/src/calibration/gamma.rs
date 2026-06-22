use super::types::{ControlResult, GammaStatus};
#[cfg(target_os = "linux")]
use std::process::Command;
use std::sync::Mutex;

// Global storage for saved gamma ramps (for restoration)
static SAVED_GAMMA: Mutex<Option<SavedGamma>> = Mutex::new(None);

#[derive(Clone)]
enum SavedGamma {
    #[cfg(target_os = "windows")]
    Windows(Vec<u16>),
    #[cfg(target_os = "linux")]
    Linux(f32),
    #[cfg(target_os = "macos")]
    MacOS(f32),
}

/// Detect current gamma settings
pub fn detect_gamma() -> GammaStatus {
    #[cfg(target_os = "windows")]
    return detect_gamma_windows();

    #[cfg(target_os = "linux")]
    return detect_gamma_linux();

    #[cfg(target_os = "macos")]
    return detect_gamma_macos();

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return GammaStatus::not_supported("Gamma detection not supported on this platform");
}

/// Set gamma correction to specified value
pub fn set_gamma(gamma: f32) -> ControlResult {
    #[cfg(target_os = "windows")]
    return set_gamma_windows(gamma);

    #[cfg(target_os = "linux")]
    return set_gamma_linux(gamma);

    #[cfg(target_os = "macos")]
    return set_gamma_macos(gamma);

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return ControlResult::failure("Gamma control not supported on this platform");
}

/// Reset gamma to 1.0 (linear)
pub fn reset_gamma() -> ControlResult {
    set_gamma(1.0)
}

/// Restore gamma to saved value
pub fn restore_gamma() -> ControlResult {
    let saved = SAVED_GAMMA.lock().unwrap();

    if saved.is_none() {
        return ControlResult::failure("No saved gamma to restore");
    }

    drop(saved); // Release lock

    #[cfg(target_os = "windows")]
    return restore_gamma_windows();

    #[cfg(target_os = "linux")]
    {
        let saved = SAVED_GAMMA.lock().unwrap();
        if let Some(SavedGamma::Linux(gamma)) = *saved {
            drop(saved);
            return set_gamma(gamma);
        }
        ControlResult::failure("No saved gamma to restore")
    }

    #[cfg(target_os = "macos")]
    {
        let saved = SAVED_GAMMA.lock().unwrap();
        if let Some(SavedGamma::MacOS(gamma)) = *saved {
            drop(saved);
            return set_gamma(gamma);
        }
        return ControlResult::failure("No saved gamma to restore");
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return ControlResult::failure("Gamma restore not supported on this platform");
}

// ============================================================================
// Windows Implementation
// ============================================================================

#[cfg(target_os = "windows")]
fn detect_gamma_windows() -> GammaStatus {
    use std::ptr::null_mut;
    use winapi::um::wingdi::GetDeviceGammaRamp;
    use winapi::um::winuser::{GetDC, ReleaseDC};

    unsafe {
        let hdc = GetDC(null_mut());
        if hdc.is_null() {
            return GammaStatus::error("Could not get device context");
        }

        // GetDeviceGammaRamp returns RGB ramps (256 values each, 16-bit)
        let mut ramp: [u16; 768] = [0; 768]; // 256 * 3 channels

        let result = GetDeviceGammaRamp(hdc, ramp.as_mut_ptr() as *mut _);
        ReleaseDC(null_mut(), hdc);

        if result != 0 {
            // Estimate gamma from the middle value (index 128)
            // For linear gamma=1.0: ramp[128] ≈ 32768 (128/255 * 65535)
            // For gamma=2.2: ramp[128] ≈ 14189 ((128/255)^(1/2.2) * 65535)
            let middle_val = ramp[128]; // Red channel

            if middle_val > 0 {
                let input_linear: f32 = 128.0 / 255.0;
                let output_linear = middle_val as f32 / 65535.0;

                if output_linear > 0.0 {
                    let gamma = output_linear.ln() / input_linear.ln();
                    let is_default = (gamma - 1.0).abs() < 0.05;

                    return GammaStatus {
                        supported: true,
                        current_value: Some(gamma),
                        saved_value: None,
                        is_default,
                        message: "OK".to_string(),
                    };
                }
            }

            GammaStatus {
                supported: true,
                current_value: Some(1.0),
                saved_value: None,
                is_default: true,
                message: "OK (assumed default)".to_string(),
            }
        } else {
            GammaStatus::error("GetDeviceGammaRamp failed")
        }
    }
}

#[cfg(target_os = "windows")]
fn set_gamma_windows(gamma: f32) -> ControlResult {
    use std::ptr::null_mut;
    use winapi::um::wingdi::{GetDeviceGammaRamp, SetDeviceGammaRamp};
    use winapi::um::winuser::{GetDC, ReleaseDC};

    unsafe {
        let hdc = GetDC(null_mut());
        if hdc.is_null() {
            return ControlResult::failure("Could not get device context");
        }

        // Save current gamma ramp before changing (if not already saved)
        {
            let mut saved = SAVED_GAMMA.lock().unwrap();
            if saved.is_none() {
                let mut current_ramp: [u16; 768] = [0; 768];
                if GetDeviceGammaRamp(hdc, current_ramp.as_mut_ptr() as *mut _) != 0 {
                    *saved = Some(SavedGamma::Windows(current_ramp.to_vec()));
                }
            }
        }

        // Create new gamma ramp
        // Formula: output = input^(1/gamma)
        let mut ramp: [u16; 768] = [0; 768];

        for i in 0..256 {
            // Calculate gamma-corrected value
            let linear = i as f32 / 255.0;
            let corrected = linear.powf(1.0 / gamma);
            let value = (corrected * 65535.0) as u16;

            // Set all three channels (R, G, B) to same value
            ramp[i] = value; // Red
            ramp[256 + i] = value; // Green
            ramp[512 + i] = value; // Blue
        }

        // Apply gamma ramp
        let result = SetDeviceGammaRamp(hdc, ramp.as_mut_ptr() as *mut _);
        ReleaseDC(null_mut(), hdc);

        if result != 0 {
            ControlResult::success(format!("Gamma set to {:.2}", gamma))
        } else {
            ControlResult::failure("SetDeviceGammaRamp failed")
        }
    }
}

#[cfg(target_os = "windows")]
fn restore_gamma_windows() -> ControlResult {
    use std::ptr::null_mut;
    use winapi::um::wingdi::SetDeviceGammaRamp;
    use winapi::um::winuser::{GetDC, ReleaseDC};

    let saved = SAVED_GAMMA.lock().unwrap();

    if let Some(SavedGamma::Windows(ref ramp_vec)) = *saved {
        let mut ramp_vec = ramp_vec.clone();
        drop(saved); // Release lock before calling API

        unsafe {
            let hdc = GetDC(null_mut());
            if hdc.is_null() {
                return ControlResult::failure("Could not get device context");
            }

            let result = SetDeviceGammaRamp(hdc, ramp_vec.as_mut_ptr() as *mut _);
            ReleaseDC(null_mut(), hdc);

            if result != 0 {
                ControlResult::success("Gamma restored to original value")
            } else {
                ControlResult::failure("SetDeviceGammaRamp failed")
            }
        }
    } else {
        ControlResult::failure("No saved gamma ramp")
    }
}

// ============================================================================
// Linux Implementation
// ============================================================================

#[cfg(target_os = "linux")]
fn detect_gamma_linux() -> GammaStatus {
    match Command::new("xrandr").arg("--verbose").output() {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout);

            // Parse xrandr output for "Gamma:" line
            for line in stdout.lines() {
                let line = line.trim();
                if line.starts_with("Gamma:") {
                    // Format: "Gamma:  1.0:1.0:1.0"
                    let parts: Vec<&str> = line.split(':').collect();
                    if parts.len() >= 2 {
                        let gamma_str = parts[1].trim();
                        let gamma_parts: Vec<&str> = gamma_str.split(':').collect();
                        if let Some(gamma_str) = gamma_parts.first() {
                            if let Ok(gamma_val) = gamma_str.parse::<f32>() {
                                let is_default = (gamma_val - 1.0).abs() < 0.05;

                                return GammaStatus {
                                    supported: true,
                                    current_value: Some(gamma_val),
                                    saved_value: None,
                                    is_default,
                                    message: "OK".to_string(),
                                };
                            }
                        }
                    }
                }
            }

            GammaStatus {
                supported: true,
                current_value: Some(1.0),
                saved_value: None,
                is_default: true,
                message: "OK (no gamma info found, assuming default)".to_string(),
            }
        }
        Ok(_) => GammaStatus::error("xrandr failed"),
        Err(_) => GammaStatus::not_supported("xrandr not found"),
    }
}

#[cfg(target_os = "linux")]
fn set_gamma_linux(gamma: f32) -> ControlResult {
    // Get primary display name
    let output = match Command::new("xrandr").arg("--current").output() {
        Ok(o) if o.status.success() => o,
        _ => return ControlResult::failure("xrandr query failed"),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);

    // Find primary display
    let display_name = stdout
        .lines()
        .find(|line| line.contains(" connected primary") || line.contains(" connected"))
        .and_then(|line| line.split_whitespace().next());

    let display_name = match display_name {
        Some(name) => name,
        None => return ControlResult::failure("No display found"),
    };

    // Save current gamma (if not saved)
    {
        let mut saved = SAVED_GAMMA.lock().unwrap();
        if saved.is_none() {
            let current = detect_gamma_linux();
            if let Some(current_value) = current.current_value {
                *saved = Some(SavedGamma::Linux(current_value));
            }
        }
    }

    // Set gamma
    let gamma_str = format!("{gamma:.2}:{gamma:.2}:{gamma:.2}");
    let result = Command::new("xrandr")
        .args(["--output", display_name, "--gamma", &gamma_str])
        .output();

    match result {
        Ok(output) if output.status.success() => {
            ControlResult::success(format!("Gamma set to {gamma:.2} on {display_name}"))
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            ControlResult::failure(format!("xrandr failed: {stderr}"))
        }
        Err(e) => ControlResult::failure(format!("Error: {e}")),
    }
}

// ============================================================================
// macOS Implementation (CoreGraphics)
// ============================================================================

#[cfg(target_os = "macos")]
fn detect_gamma_macos() -> GammaStatus {
    use core_graphics::display::CGDisplay;

    extern "C" {
        fn CGGetDisplayTransferByFormula(
            display: u32,
            red_min: *mut f32,
            red_max: *mut f32,
            red_gamma: *mut f32,
            green_min: *mut f32,
            green_max: *mut f32,
            green_gamma: *mut f32,
            blue_min: *mut f32,
            blue_max: *mut f32,
            blue_gamma: *mut f32,
        ) -> i32;
    }

    let display_id = CGDisplay::main().id;
    let mut red_min: f32 = 0.0;
    let mut red_max: f32 = 0.0;
    let mut red_gamma: f32 = 0.0;
    let mut green_min: f32 = 0.0;
    let mut green_max: f32 = 0.0;
    let mut green_gamma: f32 = 0.0;
    let mut blue_min: f32 = 0.0;
    let mut blue_max: f32 = 0.0;
    let mut blue_gamma: f32 = 0.0;

    let result = unsafe {
        CGGetDisplayTransferByFormula(
            display_id,
            &mut red_min,
            &mut red_max,
            &mut red_gamma,
            &mut green_min,
            &mut green_max,
            &mut green_gamma,
            &mut blue_min,
            &mut blue_max,
            &mut blue_gamma,
        )
    };

    if result == 0 {
        // Use average of RGB gamma values
        let avg_gamma = (red_gamma + green_gamma + blue_gamma) / 3.0;
        let is_default = (avg_gamma - 1.0).abs() < 0.05;

        GammaStatus {
            supported: true,
            current_value: Some(avg_gamma),
            saved_value: None,
            is_default,
            message: "OK".to_string(),
        }
    } else {
        GammaStatus::error("CGGetDisplayTransferByFormula failed")
    }
}

#[cfg(target_os = "macos")]
fn set_gamma_macos(gamma: f32) -> ControlResult {
    use core_graphics::display::CGDisplay;

    // Save current gamma before changing (if not already saved)
    {
        let mut saved = SAVED_GAMMA.lock().unwrap();
        if saved.is_none() {
            let current = detect_gamma_macos();
            if let Some(current_value) = current.current_value {
                *saved = Some(SavedGamma::MacOS(current_value));
            }
        }
    }

    // CGSetDisplayTransferByFormula
    extern "C" {
        fn CGSetDisplayTransferByFormula(
            display: u32,
            red_min: f32,
            red_max: f32,
            red_gamma: f32,
            green_min: f32,
            green_max: f32,
            green_gamma: f32,
            blue_min: f32,
            blue_max: f32,
            blue_gamma: f32,
        ) -> i32;
    }

    let display_id = CGDisplay::main().id;

    // Set gamma using the formula: output = min + (max - min) * pow(input, gamma)
    // For standard gamma correction: min=0.0, max=1.0, gamma=<value>
    let result = unsafe {
        CGSetDisplayTransferByFormula(
            display_id, 0.0, 1.0, gamma, // Red
            0.0, 1.0, gamma, // Green
            0.0, 1.0, gamma, // Blue
        )
    };

    if result == 0 {
        ControlResult::success(format!("Gamma set to {:.2}", gamma))
    } else {
        ControlResult::failure("CGSetDisplayTransferByFormula failed")
    }
}
