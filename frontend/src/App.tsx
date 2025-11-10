import { useMemo } from "react";
import PatternDisplay from "./components/PatternDisplay";

function App() {
  // Get pattern from URL search params
  const pattern = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("pattern") || "colorbar";
  }, []);

  return <PatternDisplay pattern={pattern} />;
}

export default App;
