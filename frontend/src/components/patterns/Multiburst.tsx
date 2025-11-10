"use client";

import { useEffect, useRef } from "react";

// Multiburst pattern for frequency response testing
export default function Multiburst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // Gray background
      ctx.fillStyle = "#808080";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerY = canvas.height / 2;
      const burstHeight = canvas.height * 0.6;
      const frequencies = [0.5, 1, 2, 3, 4, 5, 6]; // MHz equivalent frequencies

      const sectionWidth = canvas.width / frequencies.length;

      frequencies.forEach((freq, index) => {
        const x = index * sectionWidth;
        const lineWidth = sectionWidth / (freq * 10);

        for (let i = 0; i < sectionWidth / lineWidth; i++) {
          ctx.fillStyle = i % 2 === 0 ? "#FFFFFF" : "#000000";
          ctx.fillRect(
            x + i * lineWidth,
            centerY - burstHeight / 2,
            lineWidth,
            burstHeight
          );
        }
      });
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
