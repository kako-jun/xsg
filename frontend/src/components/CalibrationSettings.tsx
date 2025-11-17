/**
 * Display Calibration Settings Component
 *
 * Phase 1: Read-only status display
 * - Shows gamma correction status
 * - Shows night mode status
 * - Shows HDR status (Windows only)
 * - Shows GPU vendor
 * - Provides guidance for manual adjustments
 *
 * Phase 2 (future): Control buttons
 * - Reset gamma to 1.0
 * - Disable night mode
 * - Restore original values
 */

import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface GammaStatus {
  supported: boolean;
  current_value: number | null;
  saved_value: number | null;
  is_default: boolean;
  message: string;
}

interface NightModeStatus {
  supported: boolean;
  enabled: boolean;
  message: string;
}

interface HDRStatus {
  supported: boolean;
  enabled: boolean;
  message: string;
}

interface GPUStatus {
  vendor: string;
  message: string;
}

interface CalibrationStatus {
  platform: string;
  gamma: GammaStatus;
  night_mode: NightModeStatus;
  hdr: HDRStatus;
  gpu: GPUStatus;
}

export default function CalibrationSettings() {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<CalibrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Keyboard shortcut (C key for Calibration)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "c" || e.key === "C") {
        setIsVisible((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Load calibration status when visible
  useEffect(() => {
    if (!isVisible) return;

    const loadStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await invoke<CalibrationStatus>("get_calibration_status");
        setStatus(data);
      } catch (err) {
        console.error("Failed to load calibration status:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [isVisible]);

  // Reload status after control actions
  const reloadStatus = async () => {
    try {
      const data = await invoke<CalibrationStatus>("get_calibration_status");
      setStatus(data);
    } catch (err) {
      console.error("Failed to reload status:", err);
    }
  };

  // Button handlers
  const handleGammaReset = async () => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const result = await invoke<{ success: boolean; message: string }>("reset_gamma");

      if (result.success) {
        setActionMessage(`✓ ${result.message}`);
        await reloadStatus();
      } else {
        setActionMessage(`✗ ${result.message}`);
      }
    } catch (err) {
      setActionMessage(
        `✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleGammaRestore = async () => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const result = await invoke<{ success: boolean; message: string }>("restore_gamma");

      if (result.success) {
        setActionMessage(`✓ ${result.message}`);
        await reloadStatus();
      } else {
        setActionMessage(`✗ ${result.message}`);
      }
    } catch (err) {
      setActionMessage(
        `✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleNightModeDisable = async () => {
    setActionLoading(true);
    setActionMessage(null);

    try {
      const result = await invoke<{ success: boolean; message: string }>("disable_night_mode");

      if (result.success) {
        setActionMessage(`✓ ${result.message}`);
        await reloadStatus();
      } else {
        setActionMessage(`ℹ ${result.message}`);
      }
    } catch (err) {
      setActionMessage(
        `✗ Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Display Calibration</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Press &apos;C&apos; to toggle • ESC to close • Phase 2: Control
            Buttons Active
          </p>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className="bg-blue-900 border-l-4 border-blue-500 px-4 py-3 mx-6 mt-4">
            <p className="text-sm">{actionMessage}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Loading calibration status...
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">
              Error: {error}
              <br />
              <button
                onClick={() => setIsVisible(false)}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Close
              </button>
            </div>
          ) : status ? (
            <>
              {/* Platform Info */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">
                  System Information
                </h3>
                <div className="text-lg">
                  Platform: <span className="font-mono">{status.platform}</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  GPU: {status.gpu.vendor} • {status.gpu.message}
                </div>
              </div>

              {/* Gamma Correction */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      ⚙️ Gamma Correction
                    </h3>
                    {status.gamma.supported ? (
                      <>
                        <div className="space-y-1">
                          <div>
                            Current Value:{" "}
                            <span
                              className={`font-mono text-lg ${
                                status.gamma.is_default
                                  ? "text-green-400"
                                  : "text-yellow-400"
                              }`}
                            >
                              {status.gamma.current_value?.toFixed(2) ?? "N/A"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Status:{" "}
                            {status.gamma.is_default ? (
                              <span className="text-green-400">
                                ✓ Default (1.0)
                              </span>
                            ) : (
                              <span className="text-yellow-400">
                                ⚠ Modified
                              </span>
                            )}
                          </div>
                          {status.gamma.message && (
                            <div className="text-xs text-gray-500">
                              {status.gamma.message}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">
                        Not supported on this platform
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 bg-gray-700 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">Recommendation:</div>
                  <div className="text-gray-300 mb-3">
                    For accurate test patterns, gamma should be set to{" "}
                    <span className="font-mono">1.0</span> (linear).
                  </div>
                  {status.gamma.supported && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleGammaReset}
                        disabled={actionLoading || status.gamma.is_default}
                        className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                          actionLoading || status.gamma.is_default
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {actionLoading ? "Working..." : "Reset to 1.0"}
                      </button>
                      <button
                        onClick={handleGammaRestore}
                        disabled={actionLoading}
                        className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                          actionLoading
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-gray-600 hover:bg-gray-500 text-white"
                        }`}
                      >
                        {actionLoading ? "Working..." : "Restore Original"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Night Mode / Blue Light Filter */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      🌙 Night Mode / Blue Light Filter
                    </h3>
                    {status.night_mode.supported ? (
                      <>
                        <div className="space-y-1">
                          <div>
                            Status:{" "}
                            <span
                              className={`font-semibold ${
                                status.night_mode.enabled
                                  ? "text-yellow-400"
                                  : "text-green-400"
                              }`}
                            >
                              {status.night_mode.enabled
                                ? "⚠ Enabled"
                                : "✓ Disabled"}
                            </span>
                          </div>
                          {status.night_mode.message && (
                            <div className="text-xs text-gray-500">
                              {status.night_mode.message}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-400">
                        Not supported on this platform
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 bg-gray-700 rounded p-3 text-sm">
                  <div className="font-semibold mb-1">Recommendation:</div>
                  <div className="text-gray-300 mb-3">
                    Night mode should be disabled for accurate color display.
                    <br />
                    <span className="text-gray-400 text-xs">
                      {status.platform === "Windows" &&
                        "Settings → Display → Night light"}
                      {status.platform === "Darwin" &&
                        "System Preferences → Displays → Night Shift"}
                      {status.platform === "Linux" && "Disable Redshift/f.lux"}
                    </span>
                  </div>
                  {status.night_mode.supported && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleNightModeDisable}
                        disabled={actionLoading || !status.night_mode.enabled}
                        className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                          actionLoading || !status.night_mode.enabled
                            ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        {actionLoading ? "Working..." : "Disable Night Mode"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* HDR (Windows only) */}
              {status.hdr.supported && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">
                        🎨 HDR (High Dynamic Range)
                      </h3>
                      <div className="space-y-1">
                        <div>
                          Status:{" "}
                          <span
                            className={`font-semibold ${
                              status.hdr.enabled
                                ? "text-yellow-400"
                                : "text-green-400"
                            }`}
                          >
                            {status.hdr.enabled ? "⚠ Enabled" : "✓ Disabled"}
                          </span>
                        </div>
                        {status.hdr.message && (
                          <div className="text-xs text-gray-500">
                            {status.hdr.message}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 bg-gray-700 rounded p-3 text-sm">
                    <div className="font-semibold mb-1">Recommendation:</div>
                    <div className="text-gray-300">
                      HDR should be disabled for SDR test patterns.
                      <br />
                      <span className="text-gray-400 text-xs">
                        Settings → Display → Use HDR → Off
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Guidance (Read-only) */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">
                  ℹ️ Additional Settings (Manual Configuration Required)
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <div>
                      <span className="font-semibold">Display Brightness:</span>{" "}
                      Set to 100% for consistent results
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <div>
                      <span className="font-semibold">Color Temperature:</span>{" "}
                      Set to 6500K (D65) if available
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <div>
                      <span className="font-semibold">Picture Mode:</span> Use
                      sRGB or Standard mode if available
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <div>
                      <span className="font-semibold">Contrast:</span> Set to
                      default/standard value
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-400 mt-1">•</span>
                    <div>
                      <span className="font-semibold">GPU Color Settings:</span>{" "}
                      Check {status.gpu.vendor} Control Panel for any LUT or
                      color filters
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
