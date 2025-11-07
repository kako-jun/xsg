"use client";

import { useEffect, useRef } from "react";

// Simulated pixel defect pattern for testing
export default function PixelDefect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // White background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add simulated dead pixels (black dots)
      const numDefects = 50;
      ctx.fillStyle = "#000000";

      for (let i = 0; i < numDefects; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      }

      // Add simulated stuck pixels (colored dots)
      const colors = ["#FF0000", "#00FF00", "#0000FF"];
      for (let i = 0; i < numDefects / 3; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
      }
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: "pixelated" }}
    />
  );
}
