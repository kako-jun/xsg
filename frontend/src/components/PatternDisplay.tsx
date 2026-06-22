"use client";

import { useRef } from "react";
import PatternCanvas from "./PatternCanvas";
import PatternMenu from "./PatternMenu";
import CalibrationSettings from "./CalibrationSettings";
import { useFullscreen } from "../hooks/useFullscreen";
import { usePatternLoader } from "../hooks/usePatternLoader";

interface PatternDisplayProps {
  pattern: string;
}

export default function PatternDisplay({ pattern }: PatternDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFullscreen(containerRef);
  const load = usePatternLoader(pattern);

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen overflow-hidden relative"
      style={{ imageRendering: "pixelated" }}
    >
      <PatternCanvas load={load} />
      <PatternMenu />
      <CalibrationSettings />
    </div>
  );
}
