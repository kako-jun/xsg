"use client";

import { useSearchParams } from "next/navigation";

// Solid color field
export default function SolidColor() {
  const searchParams = useSearchParams();
  const color = searchParams.get("color") || "white";

  const colors: Record<string, string> = {
    white: "#FFFFFF",
    black: "#000000",
    red: "#FF0000",
    green: "#00FF00",
    blue: "#0000FF",
    cyan: "#00FFFF",
    magenta: "#FF00FF",
    yellow: "#FFFF00",
  };

  const bgColor = colors[color.toLowerCase()] || color;

  return <div className="w-full h-full" style={{ backgroundColor: bgColor }} />;
}
