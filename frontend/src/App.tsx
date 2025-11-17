import { useMemo } from "react";
import PatternDisplay from "./components/PatternDisplay";
import CalibrationSettings from "./components/CalibrationSettings";

function App() {
  // Get pattern from URL search params
  const pattern = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("pattern") || "colorbar";
  }, []);

  return (
    <>
      <PatternDisplay pattern={pattern} />
      <CalibrationSettings />
    </>
  );
}

export default App;
