import * as fs from 'fs';
import * as path from 'path';
import { analyzePackageJson } from './package-json.js';
import { analyzeExports } from './exports-analyzer.js';
import { type ProjectMetadata } from '@docs-guard/core';

export * from './package-json.js';
export * from './exports-analyzer.js';

export function analyzeProject(projectRoot: string): ProjectMetadata {
  const pkgData = analyzePackageJson(projectRoot);

  const exportsMap: Record<string, string[]> = {};
  for (const [exportKey, filePath] of Object.entries(pkgData.entrypoints)) {
    exportsMap[exportKey] = analyzeExports(filePath);
  }

  const envKeys = parseEnvExample(projectRoot);

  return {
    packageName: pkgData.packageName,
    packageManager: pkgData.packageManager,
    scripts: pkgData.scripts,
    exportsMap,
    binaries: pkgData.binaries,
    configKeys: [], // placeholders for config keys schema parsing
    envKeys,
  };
}

function parseEnvExample(projectRoot: string): string[] {
  const envExamplePath = path.resolve(projectRoot, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(envExamplePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const keys: string[] = [];

    for (const line of lines) {
      const match = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
      if (match && match[1]) {
        keys.push(match[1]);
      }
    }
    return keys;
  } catch (err) {
    console.error('Error parsing .env.example:', err);
    return [];
  }
}

