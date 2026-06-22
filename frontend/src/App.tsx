import { useMemo } from "react";
import PatternDisplay from "./components/PatternDisplay";
import SlideshowView from "./components/SlideshowView";

function App() {
  // Read both `?playlist=` and `?pattern=` once. Playlist takes precedence;
  // when absent we fall back to the existing single-pattern display (backward
  // compatible).
  const { playlist, pattern } = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      playlist: params.get("playlist"),
      pattern: params.get("pattern") || "colorbar",
    };
  }, []);

  if (playlist) {
    return <SlideshowView name={playlist} />;
  }

  return <PatternDisplay pattern={pattern} />;
}

export default App;
