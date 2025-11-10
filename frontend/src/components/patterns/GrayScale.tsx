"use client";

// Grayscale gradient pattern
export default function GrayScale() {
  const steps = 16;
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
