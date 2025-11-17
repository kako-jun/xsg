use super::types::GPUStatus;
use std::process::Command;

/// Detect GPU vendor
pub fn detect_gpu() -> GPUStatus {
    #[cfg(target_os = "windows")]
    return detect_gpu_windows();

    #[cfg(target_os = "linux")]
    return detect_gpu_linux();

    #[cfg(target_os = "macos")]
    return detect_gpu_macos();

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    return GPUStatus::unknown("GPU detection not supported on this platform");
}

#[cfg(target_os = "windows")]
fn detect_gpu_windows() -> GPUStatus {
    match Command::new("wmic")
        .args(&["path", "win32_VideoController", "get", "name"])
        .output()
    {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();

            if stdout.contains("nvidia") || stdout.contains("geforce") || stdout.contains("quadro") {
                GPUStatus {
                    vendor: "NVIDIA".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("amd") || stdout.contains("radeon") {
                GPUStatus {
                    vendor: "AMD".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("intel") {
                GPUStatus {
                    vendor: "Intel".to_string(),
                    message: "OK".to_string(),
                }
            } else {
                GPUStatus {
                    vendor: "unknown".to_string(),
                    message: format!("Detected: {}", stdout.trim()),
                }
            }
        }
        Ok(_) => GPUStatus::unknown("WMIC command failed"),
        Err(e) => GPUStatus::unknown(format!("Error: {}", e)),
    }
}

#[cfg(target_os = "linux")]
fn detect_gpu_linux() -> GPUStatus {
    match Command::new("lspci").output() {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();

            if stdout.contains("nvidia") || stdout.contains("geforce") {
                GPUStatus {
                    vendor: "NVIDIA".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("amd") || stdout.contains("radeon") {
                GPUStatus {
                    vendor: "AMD".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("intel") {
                GPUStatus {
                    vendor: "Intel".to_string(),
                    message: "OK".to_string(),
                }
            } else {
                GPUStatus::unknown("GPU not found in lspci")
            }
        }
        Ok(_) => GPUStatus::unknown("lspci command failed"),
        Err(_) => GPUStatus::unknown("lspci not found"),
    }
}

#[cfg(target_os = "macos")]
fn detect_gpu_macos() -> GPUStatus {
    match Command::new("system_profiler")
        .arg("SPDisplaysDataType")
        .output()
    {
        Ok(output) if output.status.success() => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();

            if stdout.contains("nvidia") || stdout.contains("geforce") {
                GPUStatus {
                    vendor: "NVIDIA".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("amd") || stdout.contains("radeon") {
                GPUStatus {
                    vendor: "AMD".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("intel") {
                GPUStatus {
                    vendor: "Intel".to_string(),
                    message: "OK".to_string(),
                }
            } else if stdout.contains("apple") || stdout.contains("m1") || stdout.contains("m2") || stdout.contains("m3") {
                GPUStatus {
                    vendor: "Apple".to_string(),
                    message: "OK".to_string(),
                }
            } else {
                GPUStatus::unknown("GPU not found")
            }
        }
        Ok(_) => GPUStatus::unknown("system_profiler failed"),
        Err(e) => GPUStatus::unknown(format!("Error: {}", e)),
    }
}
