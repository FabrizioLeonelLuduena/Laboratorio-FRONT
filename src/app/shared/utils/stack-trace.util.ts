/**
 * Stack Trace Utilities
 * 
 * Shared utilities for parsing and extracting information from JavaScript stack traces.
 * Used by LoggerService and GlobalErrorHandler to identify caller information.
 */

/**
 * Extracts file name from a full file path or URL
 * @param filePath - Full file path or URL
 * @returns File name without path
 */
export function extractFileName(filePath: string): string {
  // Remove query parameters and hash
  const cleanPath = filePath.split('?')[0].split('#')[0];

  // Get last part of path
  const parts = cleanPath.split('/');
  return parts[parts.length - 1] || cleanPath;
}

/**
 * Extracts caller name (component/service/function) from method string or file name
 * @param methodOrFile - Method name or file name
 * @returns Extracted caller name
 */
export function extractCallerName(methodOrFile: string): string {
  // Try to extract class name from method (e.g., "MyComponent.myMethod")
  const classMatch = methodOrFile.match(/([A-Z][a-zA-Z0-9]+(?:Component|Service)?)/);
  if (classMatch) {
    return classMatch[1];
  }

  // If it's a file name, extract component name
  if (methodOrFile.includes('.component')) {
    const match = methodOrFile.match(/([^/]+)\.component/);
    if (match) {
      return pascalCase(match[1]) + 'Component';
    }
  }

  if (methodOrFile.includes('.service')) {
    const match = methodOrFile.match(/([^/]+)\.service/);
    if (match) {
      return pascalCase(match[1]) + 'Service';
    }
  }

  // Return as is
  return methodOrFile.split('.')[0] || methodOrFile;
}

/**
 * Converts kebab-case to PascalCase
 * @param str - String in kebab-case
 * @returns String in PascalCase
 */
export function pascalCase(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/**
 * Extracts source location (file and line) from an error stack trace
 * @param error - Error object with stack trace
 * @returns Object with file and line information, or null if not found
 */
export function extractSourceLocation(error: Error): { file: string; line: number } | null {
  if (!error.stack) {
    return null;
  }

  const stackLines = error.stack.split('\n');

  // Skip the first line (error message) and look for the first relevant stack frame
  for (let i = 1; i < stackLines.length; i++) {
    const line = stackLines[i];

    // Skip Angular internal frames
    if (
      line.includes('node_modules') ||
            line.includes('angular/core') ||
            line.includes('zone.js') ||
            line.includes('webpack')
    ) {
      continue;
    }

    // Match patterns like: at file.ts:line:column or (file.ts:line:column)
    const match = line.match(/(?:at\s+)?(?:.*?\()?([^)]+\.ts):(\d+):(\d+)/);
    if (match) {
      return {
        file: extractFileName(match[1]),
        line: parseInt(match[2], 10)
      };
    }
  }

  return null;
}

/**
 * Extracts component name from an error stack trace
 * @param error - Error object with stack trace
 * @returns Component name or 'Unknown'
 */
export function extractComponentName(error: Error): string {
  if (!error.stack) {
    return 'Unknown';
  }

  const stackLines = error.stack.split('\n');

  for (let i = 1; i < stackLines.length; i++) {
    const line = stackLines[i];

    // Skip internal frames
    if (
      line.includes('node_modules') ||
            line.includes('zone.js') ||
            line.includes('webpack')
    ) {
      continue;
    }

    // Look for component files
    const componentMatch = line.match(/([a-z-]+)\.component\.ts/);
    if (componentMatch) {
      return pascalCase(componentMatch[1]) + 'Component';
    }

    // Look for service files
    const serviceMatch = line.match(/([a-z-]+)\.service\.ts/);
    if (serviceMatch) {
      return pascalCase(serviceMatch[1]) + 'Service';
    }
  }

  return 'Unknown';
}

