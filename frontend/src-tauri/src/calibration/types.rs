use serde::{Deserialize, Serialize};

/// Gamma correction status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GammaStatus {
    pub supported: bool,
    pub current_value: Option<f32>,
    pub saved_value: Option<f32>,
    pub is_default: bool,
    pub message: String,
}

impl GammaStatus {
    // Used by the non-macOS gamma paths (linux xrandr / unsupported-platform fallback);
    // dead on the macOS build only.
    #[allow(dead_code)]
    pub fn not_supported(message: impl Into<String>) -> Self {
        Self {
            supported: false,
            current_value: None,
            saved_value: None,
            is_default: true,
            message: message.into(),
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            supported: true,
            current_value: None,
            saved_value: None,
            is_default: true,
            message: message.into(),
        }
    }
}

/// Night mode / blue light filter status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NightModeStatus {
    pub supported: bool,
    pub enabled: bool,
    pub message: String,
}

impl NightModeStatus {
    // Used by the non-Linux/Windows/macOS cfg fallback in night_mode.rs;
    // dead on this platform's build only.
    #[allow(dead_code)]
    pub fn not_supported(message: impl Into<String>) -> Self {
        Self {
            supported: false,
            enabled: false,
            message: message.into(),
        }
    }

    // Symmetric status constructor (mirrors GammaStatus::error); reserved for
    // platform-specific error paths.
    #[allow(dead_code)]
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            supported: true,
            enabled: false,
            message: message.into(),
        }
    }
}

/// HDR status (Windows only)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HDRStatus {
    pub supported: bool,
    pub enabled: bool,
    pub message: String,
}

impl HDRStatus {
    pub fn not_supported(message: impl Into<String>) -> Self {
        Self {
            supported: false,
            enabled: false,
            message: message.into(),
        }
    }

    // Symmetric status constructor (mirrors GammaStatus::error); reserved for
    // platform-specific error paths.
    #[allow(dead_code)]
    pub fn error(message: impl Into<String>) -> Self {
        Self {
            supported: true,
            enabled: false,
            message: message.into(),
        }
    }
}

/// GPU vendor detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GPUStatus {
    pub vendor: String,
    pub message: String,
}

impl GPUStatus {
    pub fn unknown(message: impl Into<String>) -> Self {
        Self {
            vendor: "unknown".to_string(),
            message: message.into(),
        }
    }
}

/// Complete calibration status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CalibrationStatus {
    pub platform: String,
    pub gamma: GammaStatus,
    pub night_mode: NightModeStatus,
    pub hdr: HDRStatus,
    pub gpu: GPUStatus,
}

/// Result of a control operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ControlResult {
    pub success: bool,
    pub message: String,
}

impl ControlResult {
    pub fn success(message: impl Into<String>) -> Self {
        Self {
            success: true,
            message: message.into(),
        }
    }

    pub fn failure(message: impl Into<String>) -> Self {
        Self {
            success: false,
            message: message.into(),
        }
    }
}
