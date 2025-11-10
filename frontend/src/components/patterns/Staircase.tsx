"use client";

// Staircase pattern for contrast and gradation testing
export default function Staircase() {
  const steps = 21; // 0%, 5%, 10%, ..., 100%
  const grayLevels = Array.from({ length: steps }, (_, i) => {
    const level = Math.floor((255 / (steps - 1)) * i);
    return `rgb(${level}, ${level}, ${level})`;
  });

  return (
    <div className="w-full h-full flex">
      {grayLevels.map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
