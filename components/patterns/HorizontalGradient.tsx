"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Horizontal gradient pattern
export default function HorizontalGradient() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const searchParams = useSearchParams();
  const steps = parseInt(searchParams.get("steps") || "256");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const barWidth = canvas.width / steps;

      for (let i = 0; i < steps; i++) {
        const level = Math.floor((255 / (steps - 1)) * i);
        ctx.fillStyle = `rgb(${level}, ${level}, ${level})`;
        ctx.fillRect(i * barWidth, 0, barWidth, canvas.height);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [steps]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
