"use client";

// SMPTE Color Bars pattern
export default function ColorBar() {
  const colors = [
    "#C0C0C0", // White (75%)
    "#C0C000", // Yellow
    "#00C0C0", // Cyan
    "#00C000", // Green
    "#C000C0", // Magenta
    "#C00000", // Red
    "#0000C0", // Blue
  ];

  return (
    <div className="w-full h-full flex">
      {colors.map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
