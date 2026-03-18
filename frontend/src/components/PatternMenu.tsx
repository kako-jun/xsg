import { useEffect, useState } from "react";
import { safeInvoke } from "../lib/tauriCompat";

interface PatternMenuItem {
  id: string;
  name: string;
  category: string;
}

interface PatternsResponse {
  patterns: PatternMenuItem[];
}

export default function PatternMenu() {
  const [isVisible, setIsVisible] = useState(false);
  const [patterns, setPatterns] = useState<PatternMenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load patterns from Tauri backend
  useEffect(() => {
    const loadPatterns = async () => {
      try {
        const data = await safeInvoke<PatternsResponse>("get_patterns");
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
      const isMenuClick = target.closest("[data-menu-content]");

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
    // TODO: Implement set_pattern Tauri command in Phase 2
    // For now, directly navigate to pattern URL
    window.location.href = `?pattern=${pattern}`;
    setIsVisible(false);
  };

  if (!isVisible) {
    return null; // No button - tap screen or press M to open menu
  }

  // Group patterns by category
  const categories = Array.from(new Set(patterns.map((p) => p.category)));

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
    >
      <div
        data-menu-content
        className="text-white max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: "#111",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="sticky top-0 px-6 py-4"
          style={{
            backgroundColor: "#111",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex justify-between items-center">
            <h2
              className="text-base font-medium tracking-widest uppercase"
              style={{
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.15em",
              }}
            >
              Patterns
            </h2>
            <button
              onClick={() => setIsVisible(false)}
              className="text-sm"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              ESC
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div
              className="text-center py-8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Loading...
            </div>
          ) : patterns.length === 0 ? (
            <div
              className="text-center py-8"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              No patterns found
            </div>
          ) : (
            categories.map((category) => (
              <div key={category} className="mb-8">
                <h3
                  className="text-xs mb-3 tracking-widest uppercase"
                  style={{
                    color: "rgba(255,255,255,0.25)",
                    letterSpacing: "0.2em",
                  }}
                >
                  {category}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1">
                  {patterns
                    .filter((p) => p.category === category)
                    .map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handlePatternSelect(item.id)}
                        className="px-4 py-3 text-left touch-manipulation transition-colors"
                        style={{
                          backgroundColor: "transparent",
                          color: "rgba(255,255,255,0.7)",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.05)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "transparent")
                        }
                        onMouseDown={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.1)")
                        }
                        onMouseUp={(e) =>
                          (e.currentTarget.style.backgroundColor =
                            "rgba(255,255,255,0.05)")
                        }
                      >
                        <div className="text-sm font-normal">{item.name}</div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "rgba(255,255,255,0.2)" }}
                        >
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
