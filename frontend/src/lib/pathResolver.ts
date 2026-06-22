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
    if (/^[a-zA-Z]:[\\/]/.test(path)) return true;
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

  // Evaluate the now purely-arithmetic expression with a sandboxed parser.
  // This intentionally avoids eval()/Function so that a hostile pattern file
  // cannot inject code through coordinate expressions.
  return evaluateArithmetic(withoutUnits);
}

/**
 * Safely evaluate a pure arithmetic expression to a number.
 *
 * This replaces the previous eval()-based evaluation to remove the code
 * injection risk: only numbers, the binary operators `+ - * /`, unary `+`/`-`,
 * parentheses, and whitespace are accepted. Any identifier, function call,
 * or stray symbol causes the whole expression to be rejected.
 *
 * Numeric semantics match JavaScript arithmetic: floating-point division,
 * `* /` bind tighter than `+ -`, operators are left-associative, and unary
 * minus is supported. On any tokenization/parse failure (unknown character,
 * empty or incomplete expression, etc.) this returns 0, matching the old
 * `catch { return 0 }` behavior.
 *
 * @param expr - Normalized arithmetic expression (no units, no percentages)
 * @returns Evaluated value, or 0 if the expression is invalid
 */
function evaluateArithmetic(expr: string): number {
  type Token =
    | { kind: "number"; value: number }
    | { kind: "op"; value: "+" | "-" | "*" | "/" }
    | { kind: "lparen" }
    | { kind: "rparen" };

  // --- Tokenizer ---------------------------------------------------------
  const tokenize = (input: string): Token[] | null => {
    const tokens: Token[] = [];
    let i = 0;

    while (i < input.length) {
      const ch = input[i];

      // Whitespace is ignored.
      if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
        i++;
        continue;
      }

      // Numbers: integer or decimal (e.g. "640", "0.5", ".5", "12.").
      if ((ch >= "0" && ch <= "9") || ch === ".") {
        let j = i;
        let seenDot = false;
        while (j < input.length) {
          const c = input[j];
          if (c >= "0" && c <= "9") {
            j++;
          } else if (c === "." && !seenDot) {
            seenDot = true;
            j++;
          } else {
            break;
          }
        }
        const slice = input.slice(i, j);
        const value = Number(slice);
        // Guard against malformed numbers like a bare ".".
        if (!Number.isFinite(value)) {
          return null;
        }
        tokens.push({ kind: "number", value });
        i = j;
        continue;
      }

      if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
        tokens.push({ kind: "op", value: ch });
        i++;
        continue;
      }

      if (ch === "(") {
        tokens.push({ kind: "lparen" });
        i++;
        continue;
      }

      if (ch === ")") {
        tokens.push({ kind: "rparen" });
        i++;
        continue;
      }

      // Anything else (letters, ';', ',', etc.) is rejected outright.
      return null;
    }

    return tokens;
  };

  // --- Recursive-descent parser ------------------------------------------
  // Grammar (left-associative, standard precedence):
  //   expression := term (('+' | '-') term)*
  //   term       := factor (('*' | '/') factor)*
  //   factor     := ('+' | '-') factor | '(' expression ')' | number
  const tokens = tokenize(expr);
  if (tokens === null) {
    return 0;
  }

  let pos = 0;
  const peek = (): Token | undefined => tokens[pos];

  // ParseError sentinel: thrown on any structural problem, caught below.
  class ParseError extends Error {}

  const parseFactor = (): number => {
    const token = peek();
    if (token === undefined) {
      throw new ParseError("unexpected end of expression");
    }

    // Unary +/-
    if (token.kind === "op" && (token.value === "+" || token.value === "-")) {
      pos++;
      const operand = parseFactor();
      return token.value === "-" ? -operand : operand;
    }

    if (token.kind === "lparen") {
      pos++;
      const value = parseExpression();
      const closing = peek();
      if (closing === undefined || closing.kind !== "rparen") {
        throw new ParseError("missing closing parenthesis");
      }
      pos++;
      return value;
    }

    if (token.kind === "number") {
      pos++;
      return token.value;
    }

    throw new ParseError("expected number or '('");
  };

  const parseTerm = (): number => {
    let value = parseFactor();
    for (;;) {
      const token = peek();
      if (token === undefined || token.kind !== "op") {
        break;
      }
      if (token.value !== "*" && token.value !== "/") {
        break;
      }
      pos++;
      const right = parseFactor();
      value = token.value === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    for (;;) {
      const token = peek();
      if (token === undefined || token.kind !== "op") {
        break;
      }
      if (token.value !== "+" && token.value !== "-") {
        break;
      }
      pos++;
      const right = parseTerm();
      value = token.value === "+" ? value + right : value - right;
    }
    return value;
  };

  try {
    const result = parseExpression();
    // Reject trailing garbage (e.g. "1 2" or "(1)2").
    if (pos !== tokens.length) {
      return 0;
    }
    return Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}
