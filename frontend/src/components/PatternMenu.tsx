import { useEffect, useState } from "react";

interface PatternMenuItem {
  id: string;
  name: string;
  category: string;
}

export default function PatternMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const [patterns, setPatterns] = useState<PatternMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load patterns from API
  useEffect(() => {
    const loadPatterns = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/patterns");
        const data = await response.json();
        setPatterns(data.patterns || []);
      } catch (error) {
        console.error("Failed to load patterns:", error);
      } finally {
        setLoading(false);
      }
    };

    loadPatterns();
  }, []);

  // Keyboard shortcut (M key) and screen tap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "m" || e.key === "M") {
        setIsVisible((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsVisible(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      // Toggle menu on screen tap (only if menu is not visible)
      // If menu is visible, clicking outside will close it
      const target = e.target as HTMLElement;
      const isMenuClick = target.closest('[data-menu-content]');

      if (!isMenuClick) {
        setIsVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  const handlePatternSelect = async (pattern: string) => {
    try {
      // Call backend API to change pattern
      const response = await fetch("http://localhost:8000/api/pattern", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pattern: pattern,
          params: {},
        }),
      });

      if (!response.ok) {
        console.error("Failed to change pattern:", await response.text());
      }
    } catch (error) {
      console.error("Error calling pattern API:", error);
      // Fallback to direct URL navigation if API fails
      window.location.href = `?pattern=${pattern}`;
    }

    setIsVisible(false);
  };

  if (!isVisible) {
    return null; // No button - tap screen or press M to open menu
  }

  // Group patterns by category
  const categories = Array.from(new Set(patterns.map((p) => p.category)));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div data-menu-content className="bg-gray-900 text-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
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
            Tap screen or press &apos;M&apos; to toggle • ESC to close
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center text-gray-400 py-8">
              Loading patterns...
            </div>
          ) : patterns.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No patterns found
            </div>
          ) : (
            categories.map((category) => (
              <div key={category} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-blue-400">
                  {category}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {patterns
                    .filter((p) => p.category === category)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handlePatternSelect(item.id)}
                        className="bg-gray-800 hover:bg-blue-600 active:bg-blue-700 px-4 py-3 rounded transition-colors text-left touch-manipulation"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.id}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
