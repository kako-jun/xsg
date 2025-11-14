"use client";

import { useEffect, useRef, useState } from "react";
import NodeRenderer from "./NodeRenderer";
import PatternMenu from "./PatternMenu";
import CalibrationSettings from "./CalibrationSettings";
import type { XSGPattern } from "../lib/types";

interface PatternDisplayProps {
  pattern: string;
}

export default function PatternDisplay({ pattern }: PatternDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [patternData, setPatternData] = useState<XSGPattern | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Request fullscreen on mount
    const requestFullscreen = async () => {
      if (containerRef.current && document.documentElement.requestFullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
        }
      }
    };

    requestFullscreen();
  }, []);

  useEffect(() => {
    const loadPatternFile = async () => {
      setLoading(true);
      setError(null);

      try {
        // Map common pattern names to pattern IDs
        const patternMap: Record<string, string> = {
          colorbar: "colorbar",
          colorbars: "colorbar",
          smpte: "colorbar",
          ebu: "ebu-colorbar",
          ebucolorbar: "ebu-colorbar",
          arib: "arib-colorbar",
          aribcolorbar: "arib-colorbar",
          gradient: "gradient",
          grayscale: "grayscale",
          greyscale: "grayscale",
          gray: "grayscale",
          grey: "grayscale",
          staircase: "staircase",
          stairs: "staircase",
          "vertical-gradient": "vertical-gradient",
          "horizontal-gradient": "horizontal-gradient",
          checker: "checker",
          checkerboard: "checker",
          crosshatch: "crosshatch",
          grid: "crosshatch",
          pluge: "pluge",
          solid: "solid",
          multiburst: "multiburst",
          burst: "multiburst",
          convergence: "convergence",
          align: "convergence",
          pixeldefect: "pixel-defect",
          deadpixel: "pixel-defect",
          dotdefect: "pixel-defect",
        };

        const patternId = patternMap[pattern.toLowerCase()] || "solid";

        // Parse query parameters
        const searchParams = new URLSearchParams(window.location.search);
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          if (key !== "pattern") {
            // Exclude 'pattern' itself
            params[key] = value;
          }
        });

        // Use Tauri invoke instead of fetch
        const { invoke } = await import("@tauri-apps/api/core");
        const data = (await invoke("get_pattern", {
          patternId,
          params,
        })) as XSGPattern;

        setPatternData(data);
      } catch (err) {
        console.error("Failed to load pattern:", err);
        setError(err instanceof Error ? err.message : "Failed to load pattern");
      } finally {
        setLoading(false);
      }
    };

    loadPatternFile();
  }, [pattern]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black text-white">
          Loading pattern...
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black text-white">
          Error: {error}
        </div>
      );
    }

    if (!patternData || !patternData.nodes) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-black text-white">
          No pattern data
        </div>
      );
    }

    return (
      <>
        {patternData.nodes.map((node: any) => (
          <NodeRenderer key={node.id} node={node} />
        ))}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen overflow-hidden relative"
      style={{ imageRendering: "pixelated" }}
    >
      {renderContent()}
      <PatternMenu />
      <CalibrationSettings />
    </div>
  );
}
