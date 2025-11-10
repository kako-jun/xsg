"use client";

// PLUGE (Picture Line-Up Generation Equipment) Pattern
// Used for black level adjustment
export default function Pluge() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="flex h-1/3 items-center justify-center gap-0">
        {/* Below black (-2%) */}
        <div
          className="h-full"
          style={{
            width: "15vw",
            backgroundColor: "rgb(3, 3, 3)",
          }}
        />
        {/* Black (0%) */}
        <div
          className="h-full"
          style={{
            width: "15vw",
            backgroundColor: "rgb(16, 16, 16)",
          }}
        />
        {/* Above black (+2%) */}
        <div
          className="h-full"
          style={{
            width: "15vw",
            backgroundColor: "rgb(21, 21, 21)",
          }}
        />
        {/* Above black (+4%) */}
        <div
          className="h-full"
          style={{
            width: "15vw",
            backgroundColor: "rgb(26, 26, 26)",
          }}
        />
      </div>
    </div>
  );
}
