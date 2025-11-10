"use client";

// EBU Color Bars (European Broadcasting Union)
export default function EBUColorBar() {
  const topColors = [
    "#FFFFFF", // White (100%)
    "#FFFF00", // Yellow
    "#00FFFF", // Cyan
    "#00FF00", // Green
    "#FF00FF", // Magenta
    "#FF0000", // Red
    "#0000FF", // Blue
  ];

  const middleColors = [
    "#0000FF", // Blue
    "#000000", // Black
    "#FF00FF", // Magenta
    "#000000", // Black
    "#00FFFF", // Cyan
    "#000000", // Black
    "#FFFFFF", // White
  ];

  const bottomLeftColors = [
    "#00214C", // -I
    "#FFFFFF", // White
    "#32006A", // +Q
    "#000000", // Black
  ];

  const blackLevel = "#000000";
  const belowBlack = "#000000";
  const aboveBlack = "#111111";

  return (
    <div className="w-full h-full flex flex-col">
      {/* Top section - 75% */}
      <div className="flex flex-1" style={{ flexBasis: "75%" }}>
        {topColors.map((color, index) => (
          <div
            key={`top-${index}`}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Middle section - 8% */}
      <div className="flex" style={{ height: "8%" }}>
        {middleColors.map((color, index) => (
          <div
            key={`mid-${index}`}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Bottom section - 17% */}
      <div className="flex" style={{ height: "17%" }}>
        {/* Left section */}
        <div className="flex" style={{ width: "75%" }}>
          {bottomLeftColors.map((color, index) => (
            <div
              key={`bot-left-${index}`}
              className="flex-1"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>

        {/* Right section - PLUGE */}
        <div className="flex" style={{ width: "25%" }}>
          <div className="flex-1" style={{ backgroundColor: belowBlack }} />
          <div className="flex-1" style={{ backgroundColor: blackLevel }} />
          <div className="flex-1" style={{ backgroundColor: aboveBlack }} />
        </div>
      </div>
    </div>
  );
}
