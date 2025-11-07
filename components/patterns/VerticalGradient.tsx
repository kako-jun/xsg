"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

// Vertical gradient pattern
export default function VerticalGradient() {
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

      const barHeight = canvas.height / steps;

      for (let i = 0; i < steps; i++) {
        const level = Math.floor((255 / (steps - 1)) * i);
        ctx.fillStyle = `rgb(${level}, ${level}, ${level})`;
        ctx.fillRect(0, i * barHeight, canvas.width, barHeight);
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
