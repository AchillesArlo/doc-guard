import * as fs from 'fs';
import * as path from 'path';

export function analyzeExports(entrypointPath: string): string[] {
  return extractExports(entrypointPath, new Set<string>());
}

function extractExports(filePath: string, visited: Set<string>): string[] {
  const normalizedPath = path.resolve(filePath);
  if (visited.has(normalizedPath)) {
    return [];
  }
  visited.add(normalizedPath);

  if (!fs.existsSync(normalizedPath)) {
    return [];
  }

  const content = fs.readFileSync(normalizedPath, 'utf-8');
  const lines = content.split(/\r?\n/);
  const exports: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

    // 1. Inline declarations: export const foo = ..., export function bar() ..., export class Baz ...
    const inlineMatch = trimmed.match(/^export\s+(?:async\s+)?(const|let|var|function|class|interface|type|enum|abstract\s+class)\s+([a-zA-Z0-9_]+)/);
    if (inlineMatch && inlineMatch[2]) {
      exports.push(inlineMatch[2]);
      continue;
    }

    // 2. Default export: export default ...
    if (/^export\s+default\s+/.test(trimmed)) {
      exports.push('default');
      continue;
    }

    // 3. Wildcard re-export: export * from './path' or export * as ns from './path'
    const wildcardMatch = trimmed.match(/^export\s+\*\s+(?:as\s+([\w_]+)\s+)?from\s+['"]([^'"]+)['"]/);
    if (wildcardMatch && wildcardMatch[2]) {
      const alias = wildcardMatch[1];
      const relPath = wildcardMatch[2];
      
      if (alias) {
        // e.g. export * as utils from './utils' -> exports symbol 'utils'
        exports.push(alias);
      } else {
        // e.g. export * from './utils' -> inherits all exports of './utils'
        const resolved = resolveModulePath(relPath, normalizedPath);
        if (resolved) {
          const subExports = extractExports(resolved, visited);
          exports.push(...subExports);
        }
      }
      continue;
    }

    // 4. Re-export named symbols or local named exports: export { a, b as c } from './path' OR export { a, b as c }
    // Matches export { a, b as c } ...
    const curlyMatch = trimmed.match(/^export\s+\{([^}]+)\}(?:\s+from\s+['"]([^'"]+)['"])?/);
    if (curlyMatch && curlyMatch[1]) {
      const symbolsStr = curlyMatch[1];
      const parts = symbolsStr.split(',');
      for (const part of parts) {
        const clean = part.trim();
        if (!clean) continue;

        // Check for alias: b as c
        const aliasMatch = clean.match(/([\w_]+)\s+as\s+([\w_]+)/);
        if (aliasMatch && aliasMatch[2]) {
          exports.push(aliasMatch[2]);
        } else {
          exports.push(clean);
        }
      }
    }
  }

  return Array.from(new Set(exports));
}

function resolveModulePath(importPath: string, currentFile: string): string | null {
  const currentDir = path.dirname(currentFile);
  const targetPath = path.resolve(currentDir, importPath);

  const extensions = ['.ts', '.tsx', '.d.ts', '.js', '.jsx'];
  
  // 1. If it's a file directly
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath;
  }

  // 2. Try adding extensions
  for (const ext of extensions) {
    // E.g. ./types -> ./types.ts
    const testPath = targetPath + ext;
    if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
      return testPath;
    }
    // E.g. ./types.js -> ./types.ts (if building from ts files)
    if (importPath.endsWith('.js')) {
      const importWithoutJs = importPath.substring(0, importPath.length - 3);
      const testPathJsReplace = path.resolve(currentDir, importWithoutJs + ext);
      if (fs.existsSync(testPathJsReplace) && fs.statSync(testPathJsReplace).isFile()) {
        return testPathJsReplace;
      }
    }
  }

  // 3. Try directory index file
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    for (const ext of extensions) {
      const testPath = path.resolve(targetPath, 'index' + ext);
      if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
        return testPath;
      }
    }
  }

  return null;
}
