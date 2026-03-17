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

import React, { useEffect, useState } from "react";
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
      const result = await invoke<{ success: boolean; message: string }>(
        "reset_gamma"
      );

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
      const result = await invoke<{ success: boolean; message: string }>(
        "restore_gamma"
      );

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
      const result = await invoke<{ success: boolean; message: string }>(
        "disable_night_mode"
      );

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

  const flatBtnBase: React.CSSProperties = {
    padding: "6px 14px",
    fontSize: "0.75rem",
    letterSpacing: "0.05em",
    border: "1px solid rgba(255,255,255,0.12)",
    backgroundColor: "transparent",
    color: "rgba(255,255,255,0.6)",
    cursor: "pointer",
    transition: "background-color 0.15s",
  };

  const flatBtnDisabled: React.CSSProperties = {
    ...flatBtnBase,
    color: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,255,255,0.06)",
    cursor: "not-allowed",
  };

  return (
    <div
      data-menu-content
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <div
        className="text-white max-w-3xl w-full max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: "#111",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4"
          style={{
            backgroundColor: "#111",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex justify-between items-center">
            <h2
              className="text-base font-medium tracking-widest uppercase"
              style={{
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.15em",
              }}
            >
              Calibration
            </h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-sm"
              style={{
                color: "rgba(255,255,255,0.3)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              ESC
            </button>
          </div>
        </div>

        {/* Action Message */}
        {actionMessage && (
          <div className="px-6 pt-4">
            <div
              className="px-4 py-3 text-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderLeft: "2px solid rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {actionMessage}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div
              className="text-center py-8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Loading...
            </div>
          ) : error ? (
            <div
              className="text-center py-8"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Error: {error}
              <br />
              <button
                onClick={() => setIsVisible(false)}
                className="mt-4 px-4 py-2 text-sm"
                style={flatBtnBase}
              >
                Close
              </button>
            </div>
          ) : status ? (
            <>
              {/* Platform Info */}
              <div
                className="px-4 py-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.03)",
                  borderLeft: "2px solid rgba(255,255,255,0.1)",
                }}
              >
                <div
                  className="text-xs mb-1 tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  System
                </div>
                <div
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.6)" }}
                >
                  {status.platform} &nbsp;·&nbsp; {status.gpu.vendor}
                </div>
              </div>

              {/* Gamma Correction */}
              <div
                className="px-4 py-4"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="text-xs mb-3 tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Gamma
                </div>
                {status.gamma.supported ? (
                  <>
                    <div className="flex items-center gap-4 mb-3">
                      <span
                        className="font-mono text-2xl"
                        style={{
                          color: status.gamma.is_default
                            ? "rgba(255,255,255,0.8)"
                            : "rgba(255,200,100,0.8)",
                        }}
                      >
                        {status.gamma.current_value?.toFixed(2) ?? "N/A"}
                      </span>
                      <span
                        className="text-xs"
                        style={{
                          color: status.gamma.is_default
                            ? "rgba(255,255,255,0.3)"
                            : "rgba(255,200,100,0.5)",
                        }}
                      >
                        {status.gamma.is_default ? "linear" : "modified"}
                      </span>
                    </div>
                    <div
                      className="text-xs mb-4"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Set to 1.0 (linear) for accurate patterns.
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleGammaReset}
                        disabled={actionLoading || status.gamma.is_default}
                        style={
                          actionLoading || status.gamma.is_default
                            ? flatBtnDisabled
                            : flatBtnBase
                        }
                        onMouseEnter={(e) => {
                          if (!actionLoading && !status.gamma.is_default)
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.07)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {actionLoading ? "Working..." : "Reset to 1.0"}
                      </button>
                      <button
                        onClick={handleGammaRestore}
                        disabled={actionLoading}
                        style={actionLoading ? flatBtnDisabled : flatBtnBase}
                        onMouseEnter={(e) => {
                          if (!actionLoading)
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.07)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {actionLoading ? "Working..." : "Restore Original"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Not supported on this platform
                  </div>
                )}
              </div>

              {/* Night Mode */}
              <div
                className="px-4 py-4"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="text-xs mb-3 tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Night Mode
                </div>
                {status.night_mode.supported ? (
                  <>
                    <div className="flex items-center gap-4 mb-3">
                      <span
                        className="text-sm"
                        style={{
                          color: status.night_mode.enabled
                            ? "rgba(255,200,100,0.8)"
                            : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {status.night_mode.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div
                      className="text-xs mb-4"
                      style={{ color: "rgba(255,255,255,0.3)" }}
                    >
                      Disable for accurate color display.&nbsp;
                      {status.platform === "windows" &&
                        "Settings > Display > Night light"}
                      {status.platform === "macos" &&
                        "System Preferences > Displays > Night Shift"}
                      {status.platform === "linux" &&
                        "Disable Redshift / f.lux"}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleNightModeDisable}
                        disabled={actionLoading || !status.night_mode.enabled}
                        style={
                          actionLoading || !status.night_mode.enabled
                            ? flatBtnDisabled
                            : flatBtnBase
                        }
                        onMouseEnter={(e) => {
                          if (!actionLoading && status.night_mode.enabled)
                            e.currentTarget.style.backgroundColor =
                              "rgba(255,255,255,0.07)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        {actionLoading ? "Working..." : "Disable Night Mode"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div
                    className="text-sm"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    Not supported on this platform
                  </div>
                )}
              </div>

              {/* HDR (Windows only) */}
              {status.hdr.supported && (
                <div
                  className="px-4 py-4"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <div
                    className="text-xs mb-3 tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.25)" }}
                  >
                    HDR
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <span
                      className="text-sm"
                      style={{
                        color: status.hdr.enabled
                          ? "rgba(255,200,100,0.8)"
                          : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {status.hdr.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: "rgba(255,255,255,0.3)" }}
                  >
                    {
                      "Disable for SDR test patterns. Settings > Display > Use HDR > Off"
                    }
                  </div>
                </div>
              )}

              {/* Additional Guidance */}
              <div
                className="px-4 py-4"
                style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
              >
                <div
                  className="text-xs mb-3 tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.25)" }}
                >
                  Manual Settings
                </div>
                <div
                  className="space-y-2 text-xs"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  <div>Brightness — 100%</div>
                  <div>Color Temperature — 6500K (D65)</div>
                  <div>Picture Mode — sRGB or Standard</div>
                  <div>Contrast — default</div>
                  <div>
                    GPU Color Settings — check {status.gpu.vendor} Control Panel
                    for LUT / color filters
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
