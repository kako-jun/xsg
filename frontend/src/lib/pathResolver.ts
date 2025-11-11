/**
 * Path Resolution for XSG Pattern Files
 *
 * Supports 4 path formats:
 * 1. @/ - Project-relative paths (e.g., "@/images/test.png")
 * 2. Relative paths (e.g., "../images/test.png")
 * 3. Absolute paths (e.g., "/home/user/images/test.png")
 * 4. URLs (e.g., "https://example.com/test.png")
 *
 * Current directory for relative paths: YAML file's directory
 * Project root detection: package.json, pyproject.toml, .git/, or cwd
 */

/**
 * Path resolution options
 */
export interface PathResolverOptions {
  /** Current YAML file path (used for relative path resolution) */
  currentFilePath?: string;
  /** Project root directory (optional, auto-detected if not provided) */
  projectRoot?: string;
  /** Base URL for development server (default: current origin) */
  baseUrl?: string;
}

/**
 * Path resolver class
 */
export class PathResolver {
  private currentFileDir: string | null = null;
  private projectRoot: string | null = null;
  private baseUrl: string;

  constructor(options: PathResolverOptions = {}) {
    // Extract current file directory from file path
    if (options.currentFilePath) {
      this.currentFileDir = this.getDirectory(options.currentFilePath);
    }

    // Set project root (or detect it)
    this.projectRoot = options.projectRoot || this.detectProjectRoot();

    // Set base URL
    this.baseUrl = options.baseUrl || window.location.origin;
  }

  /**
   * Resolve a path to an absolute URL
   *
   * @param path - Path to resolve (can be @/, relative, absolute, or URL)
   * @returns Resolved absolute URL
   */
  resolve(path: string): string {
    // 1. URL: Return as-is
    if (this.isUrl(path)) {
      return path;
    }

    // 2. Project-relative (@/)
    if (path.startsWith("@/")) {
      return this.resolveProjectRelative(path);
    }

    // 3. Absolute path
    if (this.isAbsolutePath(path)) {
      return this.resolveAbsolute(path);
    }

    // 4. Relative path
    return this.resolveRelative(path);
  }

  /**
   * Check if path is a URL
   */
  private isUrl(path: string): boolean {
    return /^https?:\/\//i.test(path);
  }

  /**
   * Check if path is absolute
   * Windows: C:\..., D:\..., \\server\...
   * Unix: /...
   */
  private isAbsolutePath(path: string): boolean {
    // Windows absolute paths
    if (/^[a-zA-Z]:[\\\/]/.test(path)) return true;
    if (/^\\\\/.test(path)) return true; // UNC paths

    // Unix absolute paths
    if (path.startsWith("/")) return true;

    return false;
  }

  /**
   * Resolve project-relative path (@/...)
   */
  private resolveProjectRelative(path: string): string {
    // Remove @/ prefix
    const relativePath = path.slice(2);

    // In browser context, map to base URL
    // Backend will handle actual file system resolution
    if (this.projectRoot) {
      return `${this.baseUrl}/${relativePath}`;
    }

    // Fallback: treat as relative to base URL
    return `${this.baseUrl}/${relativePath}`;
  }

  /**
   * Resolve absolute path
   * In browser context, we need to convert to URL via backend API
   */
  private resolveAbsolute(path: string): string {
    // In browser, absolute file paths need to go through backend
    // For now, we'll use a file API endpoint
    const encodedPath = encodeURIComponent(path);
    return `${this.baseUrl}/api/file?path=${encodedPath}`;
  }

  /**
   * Resolve relative path
   * Relative to current YAML file's directory
   */
  private resolveRelative(path: string): string {
    if (!this.currentFileDir) {
      // No current file context, treat as relative to base URL
      return `${this.baseUrl}/${path}`;
    }

    // Normalize path separators
    const normalizedPath = path.replace(/\\/g, "/");

    // Combine current directory with relative path
    const combined = this.combinePaths(this.currentFileDir, normalizedPath);

    return `${this.baseUrl}/${combined}`;
  }

  /**
   * Get directory from file path
   */
  private getDirectory(filePath: string): string {
    // Handle URLs
    if (this.isUrl(filePath)) {
      const url = new URL(filePath);
      const pathParts = url.pathname.split("/");
      pathParts.pop(); // Remove filename
      return pathParts.join("/");
    }

    // Handle file paths
    const normalized = filePath.replace(/\\/g, "/");
    const lastSlash = normalized.lastIndexOf("/");

    if (lastSlash === -1) {
      return ""; // No directory, just filename
    }

    return normalized.slice(0, lastSlash);
  }

  /**
   * Combine two paths, handling .. and . segments
   */
  private combinePaths(basePath: string, relativePath: string): string {
    // Split paths into segments
    const baseSegments = basePath.split("/").filter((s) => s && s !== ".");
    const relativeSegments = relativePath
      .split("/")
      .filter((s) => s && s !== ".");

    // Process relative segments
    for (const segment of relativeSegments) {
      if (segment === "..") {
        // Go up one level
        if (baseSegments.length > 0) {
          baseSegments.pop();
        }
      } else {
        // Add segment
        baseSegments.push(segment);
      }
    }

    return baseSegments.join("/");
  }

  /**
   * Detect project root directory
   * Looks for: package.json, pyproject.toml, .git/
   * In browser context, this returns null (backend handles it)
   */
  private detectProjectRoot(): string | null {
    // In browser, we can't access file system directly
    // Backend will handle project root detection
    return null;
  }

  /**
   * Update current file path (for when loading a new YAML file)
   */
  setCurrentFilePath(filePath: string): void {
    this.currentFileDir = this.getDirectory(filePath);
  }

  /**
   * Update project root
   */
  setProjectRoot(projectRoot: string): void {
    this.projectRoot = projectRoot;
  }
}

/**
 * Default path resolver instance
 */
let defaultResolver: PathResolver | null = null;

/**
 * Get or create default path resolver
 */
export function getPathResolver(options?: PathResolverOptions): PathResolver {
  if (!defaultResolver) {
    defaultResolver = new PathResolver(options);
  } else if (options) {
    // Update options if provided
    if (options.currentFilePath) {
      defaultResolver.setCurrentFilePath(options.currentFilePath);
    }
    if (options.projectRoot) {
      defaultResolver.setProjectRoot(options.projectRoot);
    }
  }
  return defaultResolver;
}

/**
 * Convenience function to resolve a path using the default resolver
 */
export function resolvePath(
  path: string,
  options?: PathResolverOptions
): string {
  const resolver = getPathResolver(options);
  return resolver.resolve(path);
}

/**
 * Parse calc() expressions in coordinate strings
 * Examples:
 *   "50%" -> { type: 'percentage', value: 50 }
 *   "calc(50% + 10px)" -> { type: 'calc', expr: '50% + 10px' }
 *   100 -> { type: 'absolute', value: 100 }
 */
export type CoordinateValue =
  | { type: "absolute"; value: number }
  | { type: "percentage"; value: number }
  | { type: "calc"; expr: string };

export function parseCoordinate(coord: number | string): CoordinateValue {
  // Number: absolute pixels
  if (typeof coord === "number") {
    return { type: "absolute", value: coord };
  }

  // String: percentage or calc()
  const coordStr = coord.trim();

  // Percentage
  if (coordStr.endsWith("%")) {
    const value = parseFloat(coordStr);
    if (!isNaN(value)) {
      return { type: "percentage", value };
    }
  }

  // calc() expression
  const calcMatch = coordStr.match(/^calc\((.+)\)$/);
  if (calcMatch) {
    return { type: "calc", expr: calcMatch[1] };
  }

  // Fallback: treat as absolute
  const value = parseFloat(coordStr);
  return { type: "absolute", value: isNaN(value) ? 0 : value };
}

/**
 * Evaluate coordinate value to pixels
 *
 * @param coord - Coordinate value
 * @param containerSize - Container size (for percentage calculations)
 * @returns Pixel value
 */
export function evaluateCoordinate(
  coord: number | string,
  containerSize: number
): number {
  const parsed = parseCoordinate(coord);

  switch (parsed.type) {
    case "absolute":
      return parsed.value;

    case "percentage":
      return (parsed.value / 100) * containerSize;

    case "calc":
      // Simple calc() evaluation
      // Supports: 50% + 10px, 50% - 10px, etc.
      return evaluateCalcExpression(parsed.expr, containerSize);

    default:
      return 0;
  }
}

/**
 * Evaluate calc() expression
 * Supports basic arithmetic: +, -, *, /
 * Supports: px, %, numbers
 */
function evaluateCalcExpression(expr: string, containerSize: number): number {
  // Replace percentages with pixel values
  const normalized = expr.replace(/(\d+(?:\.\d+)?)%/g, (_match, num) => {
    const percentage = parseFloat(num);
    const pixels = (percentage / 100) * containerSize;
    return pixels.toString();
  });

  // Remove 'px' units
  const withoutUnits = normalized.replace(/px/g, "");

  // Evaluate expression (simple evaluation, not production-ready)
  // For production, consider using a proper expression parser
  try {
    // eslint-disable-next-line no-eval
    return eval(withoutUnits);
  } catch {
    return 0;
  }
}
