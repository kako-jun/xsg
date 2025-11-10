"use client";

// ARIB Color Bars (Association of Radio Industries and Businesses - Japan)
export default function ARIBColorBar() {
  const mainColors = [
    "#FFFFFF", // White (100%)
    "#FFFF00", // Yellow
    "#00FFFF", // Cyan
    "#00FF00", // Green
    "#FF00FF", // Magenta
    "#FF0000", // Red
    "#0000FF", // Blue
    "#000000", // Black
  ];

  return (
    <div className="w-full h-full flex">
      {mainColors.map((color, index) => (
        <div
          key={index}
          className="flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
