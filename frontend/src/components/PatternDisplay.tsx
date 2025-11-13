"use client";

import { useEffect, useRef, useState } from "react";
import yaml from "js-yaml";
import NodeRenderer from "./NodeRenderer";
import PatternMenu from "./PatternMenu";
import {
  expandParams,
  parseQueryParams,
  resolveExtends,
} from "../lib/paramExpander";
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
        // Map common pattern names to filenames
        const patternMap: Record<string, string> = {
          colorbar: "colorbar.yaml",
          colorbars: "colorbar.yaml",
          smpte: "colorbar.yaml",
          ebu: "ebu-colorbar.yaml",
          ebucolorbar: "ebu-colorbar.yaml",
          arib: "arib-colorbar.yaml",
          aribcolorbar: "arib-colorbar.yaml",
          grayscale: "grayscale.yaml",
          greyscale: "grayscale.yaml",
          gray: "grayscale.yaml",
          grey: "grayscale.yaml",
          staircase: "staircase.yaml",
          stairs: "staircase.yaml",
          verticalgradient: "vertical-gradient.yaml",
          vgradient: "vertical-gradient.yaml",
          horizontalgradient: "horizontal-gradient.yaml",
          hgradient: "horizontal-gradient.yaml",
          checker: "checker.yaml",
          checkerboard: "checker.yaml",
          crosshatch: "crosshatch.yaml",
          grid: "crosshatch.yaml",
          pluge: "pluge.yaml",
          solid: "solid.yaml",
          multiburst: "multiburst.yaml",
          burst: "multiburst.yaml",
          convergence: "convergence.yaml",
          align: "convergence.yaml",
          pixeldefect: "pixel-defect.yaml",
          deadpixel: "pixel-defect.yaml",
          dotdefect: "pixel-defect.yaml",
        };

        const filename = patternMap[pattern.toLowerCase()] || "colorbar.yaml";
        const patternPath = `/patterns/${filename}`;

        const response = await fetch(patternPath);
        const yamlText = await response.text();
        let data = yaml.load(yamlText) as XSGPattern;

        // Resolve template inheritance (extends)
        data = await resolveExtends(data);

        // Expand parameters from URL query
        const queryParams = parseQueryParams(window.location.search);
        data = expandParams(data, queryParams);

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

    const canvas = patternData.canvas || { width: 1920, height: 1080 };

    return (
      <>
        {patternData.nodes.map((node: any) => (
          <NodeRenderer key={node.id} node={node} canvas={canvas} />
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
    </div>
  );
}
