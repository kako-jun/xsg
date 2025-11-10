import yaml from "js-yaml";

export interface PatternConfig {
  name: string;
  type: string;
  description?: string;
  colors?: string[];
  gridSize?: number;
  defectCount?: number;
}

export interface PatternsConfig {
  patterns: PatternConfig[];
}

export async function loadPatternsFromYaml(
  yamlPath: string
): Promise<PatternsConfig> {
  try {
    const response = await fetch(yamlPath);
    const yamlText = await response.text();
    const config = yaml.load(yamlText) as PatternsConfig;
    return config;
  } catch (error) {
    console.error("Failed to load patterns from YAML:", error);
    return { patterns: [] };
  }
}

export function getDefaultPatterns(): PatternsConfig {
  return {
    patterns: [
      {
        name: "colorbar",
        type: "colorbar",
        description: "SMPTE Color Bars",
        colors: [
          "#C0C0C0",
          "#C0C000",
          "#00C0C0",
          "#00C000",
          "#C000C0",
          "#C00000",
          "#0000C0",
        ],
      },
      {
        name: "grayscale",
        type: "grayscale",
        description: "16-step grayscale gradient",
      },
      {
        name: "checker",
        type: "checker",
        description: "Black and white checkerboard",
        gridSize: 50,
      },
      {
        name: "crosshatch",
        type: "crosshatch",
        description: "Grid pattern for alignment",
        gridSize: 50,
      },
      {
        name: "pixeldefect",
        type: "pixeldefect",
        description: "Simulated pixel defects for testing",
        defectCount: 50,
      },
    ],
  };
}
