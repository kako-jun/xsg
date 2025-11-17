use super::types::HDRStatus;

/// Detect if HDR is enabled (Windows only)
pub fn detect_hdr() -> HDRStatus {
    #[cfg(target_os = "windows")]
    return detect_hdr_windows();

    #[cfg(not(target_os = "windows"))]
    return HDRStatus::not_supported("HDR detection only available on Windows");
}

#[cfg(target_os = "windows")]
fn detect_hdr_windows() -> HDRStatus {
    // Note: Proper HDR detection requires Windows.Graphics.Display API (WinRT)
    // This is a simplified implementation using registry

    use winreg::enums::*;
    use winreg::RegKey;

    let _hkcu = match RegKey::predef(HKEY_CURRENT_USER).open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Video\\Display") {
        Ok(key) => key,
        Err(_) => {
            return HDRStatus {
                supported: true,
                enabled: false,
                message: "HDR registry key not found (likely not available)".to_string(),
            }
        }
    };

    // In reality, HDR state is complex and may require WinRT APIs
    // For now, we return a basic status
    HDRStatus {
        supported: true,
        enabled: false,
        message: "HDR detection is basic (check Windows Settings)".to_string(),
    }
}
