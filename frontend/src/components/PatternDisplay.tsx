"use client";

import { useEffect, useRef } from "react";
import ColorBar from "./patterns/ColorBar";
import EBUColorBar from "./patterns/EBUColorBar";
import ARIBColorBar from "./patterns/ARIBColorBar";
import GrayScale from "./patterns/GrayScale";
import Checker from "./patterns/Checker";
import CrossHatch from "./patterns/CrossHatch";
import CrossHatch2px from "./patterns/CrossHatch2px";
import PixelDefect from "./patterns/PixelDefect";
import Pluge from "./patterns/Pluge";
import Staircase from "./patterns/Staircase";
import SolidColor from "./patterns/SolidColor";
import VerticalGradient from "./patterns/VerticalGradient";
import HorizontalGradient from "./patterns/HorizontalGradient";
import Multiburst from "./patterns/Multiburst";
import Convergence from "./patterns/Convergence";
import PatternMenu from "./PatternMenu";

interface PatternDisplayProps {
  pattern: string;
}

export default function PatternDisplay({ pattern }: PatternDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  const renderPattern = () => {
    switch (pattern.toLowerCase()) {
      case "colorbar":
      case "colorbars":
      case "smpte":
        return <ColorBar />;
      case "ebu":
      case "ebucolorbar":
        return <EBUColorBar />;
      case "arib":
      case "aribcolorbar":
        return <ARIBColorBar />;
      case "grayscale":
      case "greyscale":
      case "gray":
      case "grey":
        return <GrayScale />;
      case "staircase":
      case "stairs":
        return <Staircase />;
      case "verticalgradient":
      case "vgradient":
        return <VerticalGradient />;
      case "horizontalgradient":
      case "hgradient":
        return <HorizontalGradient />;
      case "checker":
      case "checkerboard":
        return <Checker />;
      case "crosshatch":
      case "grid":
        return <CrossHatch />;
      case "crosshatch2px":
      case "grid2px":
        return <CrossHatch2px />;
      case "pluge":
        return <Pluge />;
      case "white":
      case "black":
      case "red":
      case "green":
      case "blue":
      case "cyan":
      case "magenta":
      case "yellow":
      case "solid":
        return <SolidColor />;
      case "multiburst":
      case "burst":
        return <Multiburst />;
      case "convergence":
      case "align":
        return <Convergence />;
      case "pixeldefect":
      case "deadpixel":
      case "dotdefect":
        return <PixelDefect />;
      default:
        return <ColorBar />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-screen h-screen overflow-hidden"
      style={{ imageRendering: "pixelated" }}
    >
      {renderPattern()}
      <PatternMenu />
    </div>
  );
}
