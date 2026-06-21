import * as fs from 'fs';
import * as path from 'path';

export interface PackageJsonData {
  packageName?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'unknown';
  scripts: Record<string, string>;
  entrypoints: Record<string, string>;
  binaries: string[];
}

export function analyzePackageJson(projectRoot: string): PackageJsonData {
  const packageJsonPath = path.resolve(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return {
      scripts: {},
      entrypoints: {},
      binaries: [],
      packageManager: 'unknown',
    };
  }

  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(raw);

    const packageName = pkg.name;
    const scripts = pkg.scripts || {};
    const binaries = pkg.bin
      ? typeof pkg.bin === 'string'
        ? [pkg.name || 'bin']
        : Object.keys(pkg.bin)
      : [];

    const entrypoints = resolveEntrypoints(pkg, projectRoot);
    const packageManager = detectPackageManager(projectRoot);

    return {
      packageName,
      packageManager,
      scripts,
      entrypoints,
      binaries,
    };
  } catch (err) {
    console.error('Error analyzing package.json:', err);
    return {
      scripts: {},
      entrypoints: {},
      binaries: [],
      packageManager: 'unknown',
    };
  }
}

function detectPackageManager(projectRoot: string): 'npm' | 'pnpm' | 'yarn' | 'unknown' {
  if (fs.existsSync(path.resolve(projectRoot, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.resolve(projectRoot, 'package-lock.json'))) return 'npm';
  if (fs.existsSync(path.resolve(projectRoot, 'yarn.lock'))) return 'yarn';
  return 'unknown';
}

function resolveEntrypoints(pkg: any, projectRoot: string): Record<string, string> {
  const entrypoints: Record<string, string> = {};

  const addEntry = (key: string, fileVal: any) => {
    if (typeof fileVal !== 'string') return;
    const resolved = findSourceFile(fileVal, projectRoot);
    if (resolved) {
      entrypoints[key] = resolved;
    }
  };

  // 1. Try exports field
  if (pkg.exports) {
    if (typeof pkg.exports === 'string') {
      addEntry('.', pkg.exports);
    } else if (typeof pkg.exports === 'object') {
      for (const [exportKey, value] of Object.entries(pkg.exports)) {
        if (typeof value === 'string') {
          addEntry(exportKey, value);
        } else if (typeof value === 'object' && value !== null) {
          // Look for import, require, default, types
          const target = (value as any).import || (value as any).require || (value as any).default || (value as any).types;
          if (target) {
            addEntry(exportKey, target);
          }
        }
      }
    }
  }

  // 2. Fallback to main / module / types if exports are empty
  if (Object.keys(entrypoints).length === 0) {
    if (pkg.main) addEntry('.', pkg.main);
    if (pkg.module) addEntry('.', pkg.module);
    if (pkg.types) addEntry('.', pkg.types);
    if (pkg.typings) addEntry('.', pkg.typings);
  }

  // 3. Absolute fallback to index.ts or index.js in src or root
  if (Object.keys(entrypoints).length === 0) {
    const fallbacks = [
      'src/index.ts',
      'src/index.js',
      'index.ts',
      'index.js',
    ];
    for (const f of fallbacks) {
      const fullPath = path.resolve(projectRoot, f);
      if (fs.existsSync(fullPath)) {
        entrypoints['.'] = fullPath;
        break;
      }
    }
  }

  return entrypoints;
}

// Map a built file path (e.g. dist/index.js) to its corresponding source file (e.g. src/index.ts) if it exists
function findSourceFile(filePath: string, projectRoot: string): string | null {
  const normPath = path.normalize(filePath).replace(/\\/g, '/');
  
  // Try checking absolute path first
  const absPath = path.resolve(projectRoot, normPath);
  if (fs.existsSync(absPath)) {
    return absPath;
  }

  // If file does not exist, or it is in a build dir like /dist/ or /lib/, try finding it in /src/
  // E.g., dist/index.js -> src/index.ts or src/index.js
  const filename = path.basename(normPath);
  const ext = path.extname(filename);
  const baseWithoutExt = path.basename(filename, ext);

  // Try checking with different source extensions
  const srcDirs = ['src', 'lib', '.'];
  const extensions = ['.ts', '.js', '.tsx', '.jsx', '.d.ts'];

  for (const srcDir of srcDirs) {
    for (const testExt of extensions) {
      // Check relative path
      const testPath = path.resolve(projectRoot, srcDir, baseWithoutExt + testExt);
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    }
  }

  // Fallback to absolute path even if not existing on disk yet (for build configurations)
  return absPath;
}
