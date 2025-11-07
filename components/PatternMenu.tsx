"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PatternMenuItem {
  name: string;
  pattern: string;
  category: string;
}

const patterns: PatternMenuItem[] = [
  // Color Bars
  { name: "SMPTE Color Bars", pattern: "colorbar", category: "Color Bars" },
  { name: "EBU Color Bars", pattern: "ebu", category: "Color Bars" },
  { name: "ARIB Color Bars", pattern: "arib", category: "Color Bars" },

  // Grayscale & Gradients
  { name: "Grayscale", pattern: "grayscale", category: "Grayscale & Gradients" },
  { name: "Staircase", pattern: "staircase", category: "Grayscale & Gradients" },
  { name: "Vertical Gradient", pattern: "vgradient", category: "Grayscale & Gradients" },
  { name: "Horizontal Gradient", pattern: "hgradient", category: "Grayscale & Gradients" },

  // Solid Colors
  { name: "White", pattern: "white", category: "Solid Colors" },
  { name: "Black", pattern: "black", category: "Solid Colors" },
  { name: "Red", pattern: "red", category: "Solid Colors" },
  { name: "Green", pattern: "green", category: "Solid Colors" },
  { name: "Blue", pattern: "blue", category: "Solid Colors" },
  { name: "Cyan", pattern: "cyan", category: "Solid Colors" },
  { name: "Magenta", pattern: "magenta", category: "Solid Colors" },
  { name: "Yellow", pattern: "yellow", category: "Solid Colors" },

  // Geometric Patterns
  { name: "Checkerboard", pattern: "checker", category: "Geometric" },
  { name: "Cross-hatch", pattern: "crosshatch", category: "Geometric" },
  { name: "Cross-hatch 2px", pattern: "crosshatch2px", category: "Geometric" },
  { name: "Convergence", pattern: "convergence", category: "Geometric" },

  // Professional
  { name: "PLUGE", pattern: "pluge", category: "Professional" },
  { name: "Multiburst", pattern: "multiburst", category: "Professional" },
  { name: "Pixel Defect", pattern: "pixeldefect", category: "Professional" },
];

export default function PatternMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        setIsVisible((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsVisible(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handlePatternSelect = (pattern: string) => {
    router.push(`?pattern=${pattern}`);
    setIsVisible(false);
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
        Press 'M' for menu
      </div>
    );
  }

  // Group patterns by category
  const categories = Array.from(new Set(patterns.map((p) => p.category)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 text-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Pattern Selection</h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Press 'M' to toggle menu • ESC to close
          </p>
        </div>

        <div className="p-6">
          {categories.map((category) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-blue-400">
                {category}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {patterns
                  .filter((p) => p.category === category)
                  .map((item) => (
                    <button
                      key={item.pattern}
                      onClick={() => handlePatternSelect(item.pattern)}
                      className="bg-gray-800 hover:bg-blue-600 px-4 py-3 rounded transition-colors text-left"
                    >
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {item.pattern}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
