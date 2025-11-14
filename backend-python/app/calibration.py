"""
Display Calibration Support

Phase 1: Read-only status reporting
- Gamma: Detect current gamma values (Windows/Linux/macOS)
- Night Mode: Detect if enabled (Windows/Linux/macOS)
- HDR: Detect if enabled (Windows only)
- GPU: Detect GPU vendor

Phase 2 (future): Control gamma and night mode
"""

import platform
import subprocess
import sys
from typing import Dict, Any, Optional
from dataclasses import dataclass, asdict


@dataclass
class GammaStatus:
    """Gamma correction status"""
    supported: bool
    current_value: Optional[float] = None
    saved_value: Optional[float] = None
    is_default: bool = True
    message: str = ""


@dataclass
class NightModeStatus:
    """Night mode / blue light filter status"""
    supported: bool
    enabled: bool = False
    message: str = ""


@dataclass
class HDRStatus:
    """HDR status (Windows only)"""
    supported: bool
    enabled: bool = False
    message: str = ""


@dataclass
class GPUStatus:
    """GPU vendor detection"""
    vendor: str = "unknown"
    message: str = ""


@dataclass
class CalibrationStatus:
    """Complete calibration status"""
    platform: str
    gamma: GammaStatus
    night_mode: NightModeStatus
    hdr: HDRStatus
    gpu: GPUStatus

    def to_dict(self) -> Dict[str, Any]:
        return {
            "platform": self.platform,
            "gamma": asdict(self.gamma),
            "night_mode": asdict(self.night_mode),
            "hdr": asdict(self.hdr),
            "gpu": asdict(self.gpu),
        }


def detect_gamma() -> GammaStatus:
    """
    Detect current gamma settings

    Returns:
        GammaStatus with current gamma value
    """
    system = platform.system()

    if system == "Windows":
        return _detect_gamma_windows()
    elif system == "Linux":
        return _detect_gamma_linux()
    elif system == "Darwin":
        return _detect_gamma_macos()
    else:
        return GammaStatus(
            supported=False,
            message=f"Gamma detection not supported on {system}"
        )


def _detect_gamma_windows() -> GammaStatus:
    """Detect gamma on Windows using ctypes"""
    try:
        import ctypes
        import ctypes.wintypes

        # Get DC for the primary display
        gdi32 = ctypes.windll.gdi32
        user32 = ctypes.windll.user32

        hdc = user32.GetDC(0)
        if not hdc:
            return GammaStatus(
                supported=True,
                message="Could not get device context"
            )

        # GetDeviceGammaRamp returns RGB ramps (256 values each, 16-bit)
        # We'll approximate gamma from the middle value
        ramp = (ctypes.wintypes.WORD * 256 * 3)()

        if gdi32.GetDeviceGammaRamp(hdc, ctypes.byref(ramp)):
            user32.ReleaseDC(0, hdc)

            # Estimate gamma from the middle value (index 128)
            # For linear gamma=1.0: ramp[128] ≈ 32768 (128/255 * 65535)
            # For gamma=2.2: ramp[128] ≈ 14189 ((128/255)^(1/2.2) * 65535)
            middle_val = ramp[128]  # Red channel

            # Approximate gamma calculation
            # gamma ≈ log(output) / log(input)
            # input = 128/255 ≈ 0.502, output = middle_val/65535
            if middle_val > 0:
                import math
                input_linear = 128.0 / 255.0
                output_linear = middle_val / 65535.0

                if output_linear > 0:
                    gamma = math.log(output_linear) / math.log(input_linear)
                    is_default = abs(gamma - 1.0) < 0.05

                    return GammaStatus(
                        supported=True,
                        current_value=round(gamma, 2),
                        is_default=is_default,
                        message="OK"
                    )

            return GammaStatus(
                supported=True,
                current_value=1.0,
                is_default=True,
                message="OK (assumed default)"
            )
        else:
            user32.ReleaseDC(0, hdc)
            return GammaStatus(
                supported=True,
                message="GetDeviceGammaRamp failed"
            )

    except Exception as e:
        return GammaStatus(
            supported=True,
            message=f"Error: {str(e)}"
        )


def _detect_gamma_linux() -> GammaStatus:
    """Detect gamma on Linux using xrandr"""
    try:
        result = subprocess.run(
            ["xrandr", "--verbose"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            # Parse xrandr output for "Gamma:" line
            for line in result.stdout.splitlines():
                line = line.strip()
                if line.startswith("Gamma:"):
                    # Format: "Gamma:  1.0:1.0:1.0"
                    parts = line.split(":")
                    if len(parts) >= 2:
                        gamma_str = parts[1].strip()
                        gamma_parts = gamma_str.split(":")
                        if len(gamma_parts) >= 1:
                            gamma_val = float(gamma_parts[0])
                            is_default = abs(gamma_val - 1.0) < 0.05

                            return GammaStatus(
                                supported=True,
                                current_value=gamma_val,
                                is_default=is_default,
                                message="OK"
                            )

            return GammaStatus(
                supported=True,
                current_value=1.0,
                is_default=True,
                message="OK (no gamma info found, assuming default)"
            )
        else:
            return GammaStatus(
                supported=True,
                message=f"xrandr failed: {result.stderr}"
            )

    except FileNotFoundError:
        return GammaStatus(
            supported=False,
            message="xrandr not found"
        )
    except Exception as e:
        return GammaStatus(
            supported=True,
            message=f"Error: {str(e)}"
        )


def _detect_gamma_macos() -> GammaStatus:
    """Detect gamma on macOS (placeholder)"""
    # TODO: Implement using CoreGraphics
    return GammaStatus(
        supported=True,
        current_value=None,
        message="macOS gamma detection not yet implemented"
    )


def detect_night_mode() -> NightModeStatus:
    """Detect if night mode / blue light filter is enabled"""
    system = platform.system()

    if system == "Windows":
        return _detect_night_mode_windows()
    elif system == "Linux":
        return _detect_night_mode_linux()
    elif system == "Darwin":
        return _detect_night_mode_macos()
    else:
        return NightModeStatus(
            supported=False,
            message=f"Night mode detection not supported on {system}"
        )


def _detect_night_mode_windows() -> NightModeStatus:
    """Detect Windows Night Light"""
    try:
        import winreg

        # Registry path for Night Light settings
        key_path = r"Software\Microsoft\Windows\CurrentVersion\CloudStore\Store\DefaultAccount\Current\default$windows.data.bluelightreduction.bluelightreductionstate\windows.data.bluelightreduction.bluelightreductionstate"

        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
            value, _ = winreg.QueryValueEx(key, "Data")
            winreg.CloseKey(key)

            # The "Data" value is binary; byte 18 or 23 indicates state
            # This is a simplified check
            enabled = len(value) > 23 and value[23] in (0x15, 0x13, 0x10, 0x01, 0x02)

            return NightModeStatus(
                supported=True,
                enabled=enabled,
                message="OK"
            )
        except FileNotFoundError:
            return NightModeStatus(
                supported=True,
                enabled=False,
                message="Night Light registry key not found (likely disabled)"
            )

    except ImportError:
        return NightModeStatus(
            supported=False,
            message="winreg module not available"
        )
    except Exception as e:
        return NightModeStatus(
            supported=True,
            message=f"Error: {str(e)}"
        )


def _detect_night_mode_linux() -> NightModeStatus:
    """Detect Linux night mode (Redshift/f.lux)"""
    try:
        # Check if redshift is running
        result = subprocess.run(
            ["pgrep", "-x", "redshift"],
            capture_output=True,
            timeout=2
        )

        if result.returncode == 0:
            return NightModeStatus(
                supported=True,
                enabled=True,
                message="Redshift is running"
            )

        # Check if f.lux is running
        result = subprocess.run(
            ["pgrep", "-x", "fluxgui"],
            capture_output=True,
            timeout=2
        )

        if result.returncode == 0:
            return NightModeStatus(
                supported=True,
                enabled=True,
                message="f.lux is running"
            )

        return NightModeStatus(
            supported=True,
            enabled=False,
            message="No night mode application detected"
        )

    except Exception as e:
        return NightModeStatus(
            supported=True,
            message=f"Error: {str(e)}"
        )


def _detect_night_mode_macos() -> NightModeStatus:
    """Detect macOS Night Shift (placeholder)"""
    # TODO: Implement using CoreBrightness (unofficial API)
    return NightModeStatus(
        supported=True,
        enabled=False,
        message="macOS Night Shift detection not yet implemented"
    )


def detect_hdr() -> HDRStatus:
    """Detect if HDR is enabled (Windows only)"""
    system = platform.system()

    if system == "Windows":
        return _detect_hdr_windows()
    else:
        return HDRStatus(
            supported=False,
            message=f"HDR detection only available on Windows (current: {system})"
        )


def _detect_hdr_windows() -> HDRStatus:
    """Detect Windows HDR settings"""
    try:
        import winreg

        # Registry path for HDR settings (may vary by Windows version)
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Video\Display"

        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
            # Look for HDR-related values (this is simplified)
            # In reality, HDR state is complex and may require WinRT APIs
            winreg.CloseKey(key)

            return HDRStatus(
                supported=True,
                enabled=False,
                message="HDR detection is basic (check Windows Settings)"
            )
        except FileNotFoundError:
            return HDRStatus(
                supported=True,
                enabled=False,
                message="HDR registry key not found (likely not available)"
            )

    except ImportError:
        return HDRStatus(
            supported=False,
            message="winreg module not available"
        )
    except Exception as e:
        return HDRStatus(
            supported=True,
            message=f"Error: {str(e)}"
        )


def detect_gpu() -> GPUStatus:
    """Detect GPU vendor"""
    try:
        # Try to detect GPU using common methods
        system = platform.system()

        if system == "Windows":
            return _detect_gpu_windows()
        elif system == "Linux":
            return _detect_gpu_linux()
        elif system == "Darwin":
            return _detect_gpu_macos()
        else:
            return GPUStatus(
                vendor="unknown",
                message=f"GPU detection not supported on {system}"
            )

    except Exception as e:
        return GPUStatus(
            vendor="unknown",
            message=f"Error: {str(e)}"
        )


def _detect_gpu_windows() -> GPUStatus:
    """Detect GPU on Windows using WMIC"""
    try:
        result = subprocess.run(
            ["wmic", "path", "win32_VideoController", "get", "name"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            output = result.stdout.lower()

            if "nvidia" in output or "geforce" in output or "quadro" in output:
                return GPUStatus(vendor="NVIDIA", message="OK")
            elif "amd" in output or "radeon" in output:
                return GPUStatus(vendor="AMD", message="OK")
            elif "intel" in output:
                return GPUStatus(vendor="Intel", message="OK")
            else:
                return GPUStatus(vendor="unknown", message=f"Detected: {output.strip()}")
        else:
            return GPUStatus(vendor="unknown", message="WMIC command failed")

    except Exception as e:
        return GPUStatus(vendor="unknown", message=f"Error: {str(e)}")


def _detect_gpu_linux() -> GPUStatus:
    """Detect GPU on Linux using lspci"""
    try:
        result = subprocess.run(
            ["lspci"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            output = result.stdout.lower()

            if "nvidia" in output or "geforce" in output:
                return GPUStatus(vendor="NVIDIA", message="OK")
            elif "amd" in output or "radeon" in output:
                return GPUStatus(vendor="AMD", message="OK")
            elif "intel" in output:
                return GPUStatus(vendor="Intel", message="OK")
            else:
                return GPUStatus(vendor="unknown", message="GPU not found in lspci")
        else:
            return GPUStatus(vendor="unknown", message="lspci command failed")

    except FileNotFoundError:
        return GPUStatus(vendor="unknown", message="lspci not found")
    except Exception as e:
        return GPUStatus(vendor="unknown", message=f"Error: {str(e)}")


def _detect_gpu_macos() -> GPUStatus:
    """Detect GPU on macOS using system_profiler"""
    try:
        result = subprocess.run(
            ["system_profiler", "SPDisplaysDataType"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            output = result.stdout.lower()

            if "nvidia" in output or "geforce" in output:
                return GPUStatus(vendor="NVIDIA", message="OK")
            elif "amd" in output or "radeon" in output:
                return GPUStatus(vendor="AMD", message="OK")
            elif "intel" in output:
                return GPUStatus(vendor="Intel", message="OK")
            elif "apple" in output or "m1" in output or "m2" in output:
                return GPUStatus(vendor="Apple", message="OK")
            else:
                return GPUStatus(vendor="unknown", message="GPU not found")
        else:
            return GPUStatus(vendor="unknown", message="system_profiler failed")

    except Exception as e:
        return GPUStatus(vendor="unknown", message=f"Error: {str(e)}")


def get_calibration_status() -> CalibrationStatus:
    """
    Get complete calibration status

    Returns:
        CalibrationStatus with all detected values
    """
    return CalibrationStatus(
        platform=platform.system(),
        gamma=detect_gamma(),
        night_mode=detect_night_mode(),
        hdr=detect_hdr(),
        gpu=detect_gpu(),
    )


# ============================================================================
# Phase 2: Control Functions
# ============================================================================

# Global storage for saved gamma ramps (for restoration)
_saved_gamma_ramps: dict = {}


@dataclass
class ControlResult:
    """Result of a control operation"""
    success: bool
    message: str
    previous_value: Optional[Any] = None


def set_gamma(gamma: float) -> ControlResult:
    """
    Set gamma correction to specified value

    Args:
        gamma: Target gamma value (e.g., 1.0 for linear, 2.2 for standard)

    Returns:
        ControlResult with success status and message
    """
    system = platform.system()

    if system == "Windows":
        return _set_gamma_windows(gamma)
    elif system == "Linux":
        return _set_gamma_linux(gamma)
    elif system == "Darwin":
        return _set_gamma_macos(gamma)
    else:
        return ControlResult(
            success=False,
            message=f"Gamma control not supported on {system}"
        )


def _set_gamma_windows(gamma: float) -> ControlResult:
    """Set gamma on Windows"""
    try:
        import ctypes
        import ctypes.wintypes

        gdi32 = ctypes.windll.gdi32
        user32 = ctypes.windll.user32

        hdc = user32.GetDC(0)
        if not hdc:
            return ControlResult(success=False, message="Could not get device context")

        # Save current gamma ramp before changing (if not already saved)
        if "windows" not in _saved_gamma_ramps:
            current_ramp = (ctypes.wintypes.WORD * 256 * 3)()
            if gdi32.GetDeviceGammaRamp(hdc, ctypes.byref(current_ramp)):
                _saved_gamma_ramps["windows"] = list(current_ramp)

        # Create new gamma ramp
        # Formula: output = input^(1/gamma)
        ramp = (ctypes.wintypes.WORD * 256 * 3)()

        for i in range(256):
            # Calculate gamma-corrected value
            linear = i / 255.0
            corrected = linear ** (1.0 / gamma)
            value = int(corrected * 65535.0)
            value = max(0, min(65535, value))  # Clamp

            # Set all three channels (R, G, B) to same value
            ramp[i] = value          # Red
            ramp[256 + i] = value    # Green
            ramp[512 + i] = value    # Blue

        # Apply gamma ramp
        if gdi32.SetDeviceGammaRamp(hdc, ctypes.byref(ramp)):
            user32.ReleaseDC(0, hdc)
            return ControlResult(
                success=True,
                message=f"Gamma set to {gamma:.2f}"
            )
        else:
            user32.ReleaseDC(0, hdc)
            return ControlResult(
                success=False,
                message="SetDeviceGammaRamp failed"
            )

    except Exception as e:
        return ControlResult(success=False, message=f"Error: {str(e)}")


def _set_gamma_linux(gamma: float) -> ControlResult:
    """Set gamma on Linux using xrandr"""
    try:
        # Get primary display name
        result = subprocess.run(
            ["xrandr", "--current"],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode != 0:
            return ControlResult(success=False, message="xrandr query failed")

        # Find primary display
        display_name = None
        for line in result.stdout.splitlines():
            if " connected primary" in line or " connected" in line:
                display_name = line.split()[0]
                break

        if not display_name:
            return ControlResult(success=False, message="No display found")

        # Save current gamma (if not saved)
        if "linux" not in _saved_gamma_ramps:
            current = detect_gamma()
            if current.current_value:
                _saved_gamma_ramps["linux"] = current.current_value

        # Set gamma
        gamma_str = f"{gamma:.2f}:{gamma:.2f}:{gamma:.2f}"
        result = subprocess.run(
            ["xrandr", "--output", display_name, "--gamma", gamma_str],
            capture_output=True,
            text=True,
            timeout=5
        )

        if result.returncode == 0:
            return ControlResult(
                success=True,
                message=f"Gamma set to {gamma:.2f} on {display_name}"
            )
        else:
            return ControlResult(
                success=False,
                message=f"xrandr failed: {result.stderr}"
            )

    except FileNotFoundError:
        return ControlResult(success=False, message="xrandr not found")
    except Exception as e:
        return ControlResult(success=False, message=f"Error: {str(e)}")


def _set_gamma_macos(gamma: float) -> ControlResult:
    """Set gamma on macOS (placeholder)"""
    # TODO: Implement using CoreGraphics CGSetDisplayTransferByTable
    return ControlResult(
        success=False,
        message="macOS gamma control not yet implemented"
    )


def reset_gamma() -> ControlResult:
    """Reset gamma to 1.0 (linear)"""
    return set_gamma(1.0)


def restore_gamma() -> ControlResult:
    """Restore gamma to saved value"""
    system = platform.system()
    system_key = system.lower()

    if system_key not in _saved_gamma_ramps:
        return ControlResult(
            success=False,
            message="No saved gamma to restore"
        )

    if system == "Windows":
        return _restore_gamma_windows()
    elif system == "Linux":
        # For Linux, we saved the numeric value, not the full ramp
        saved_gamma = _saved_gamma_ramps.get("linux", 1.0)
        return set_gamma(saved_gamma)
    elif system == "Darwin":
        return ControlResult(
            success=False,
            message="macOS gamma restore not yet implemented"
        )
    else:
        return ControlResult(
            success=False,
            message=f"Gamma restore not supported on {system}"
        )


def _restore_gamma_windows() -> ControlResult:
    """Restore gamma on Windows"""
    try:
        import ctypes
        import ctypes.wintypes

        if "windows" not in _saved_gamma_ramps:
            return ControlResult(success=False, message="No saved gamma ramp")

        gdi32 = ctypes.windll.gdi32
        user32 = ctypes.windll.user32

        hdc = user32.GetDC(0)
        if not hdc:
            return ControlResult(success=False, message="Could not get device context")

        # Restore saved ramp
        saved_ramp = _saved_gamma_ramps["windows"]
        ramp = (ctypes.wintypes.WORD * 256 * 3)(*saved_ramp)

        if gdi32.SetDeviceGammaRamp(hdc, ctypes.byref(ramp)):
            user32.ReleaseDC(0, hdc)
            return ControlResult(
                success=True,
                message="Gamma restored to original value"
            )
        else:
            user32.ReleaseDC(0, hdc)
            return ControlResult(
                success=False,
                message="SetDeviceGammaRamp failed"
            )

    except Exception as e:
        return ControlResult(success=False, message=f"Error: {str(e)}")


def disable_night_mode() -> ControlResult:
    """Disable night mode / blue light filter"""
    system = platform.system()

    if system == "Windows":
        return _disable_night_mode_windows()
    elif system == "Linux":
        return _disable_night_mode_linux()
    elif system == "Darwin":
        return _disable_night_mode_macos()
    else:
        return ControlResult(
            success=False,
            message=f"Night mode control not supported on {system}"
        )


def _disable_night_mode_windows() -> ControlResult:
    """Disable Windows Night Light"""
    # Note: Windows Night Light cannot be easily controlled via registry
    # It requires Windows.System.Display API (UWP/WinRT)
    # This is a placeholder - proper implementation requires pythonnet or similar
    return ControlResult(
        success=False,
        message="Windows Night Light control requires manual action: Settings → Display → Night light → Turn off"
    )


def _disable_night_mode_linux() -> ControlResult:
    """Disable Linux night mode (kill Redshift/f.lux)"""
    try:
        # Try to kill redshift
        result = subprocess.run(
            ["pkill", "-x", "redshift"],
            capture_output=True,
            timeout=2
        )

        if result.returncode == 0:
            return ControlResult(
                success=True,
                message="Redshift disabled"
            )

        # Try to kill f.lux
        result = subprocess.run(
            ["pkill", "-x", "fluxgui"],
            capture_output=True,
            timeout=2
        )

        if result.returncode == 0:
            return ControlResult(
                success=True,
                message="f.lux disabled"
            )

        return ControlResult(
            success=False,
            message="No night mode application found to disable"
        )

    except Exception as e:
        return ControlResult(success=False, message=f"Error: {str(e)}")


def _disable_night_mode_macos() -> ControlResult:
    """Disable macOS Night Shift (placeholder)"""
    # TODO: Implement using CoreBrightness (unofficial API)
    # Or use AppleScript
    return ControlResult(
        success=False,
        message="macOS Night Shift control not yet implemented. Disable manually in System Preferences."
    )
