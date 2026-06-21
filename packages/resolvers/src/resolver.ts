import * as path from 'path';
import * as fs from 'fs';
import {
  type ExtractedArtifact,
  type ResolvedReference,
  type ProjectMetadata,
} from '@docs-guard/core';
import { analyzeExports } from '@docs-guard/project-analyzer';

export function resolveReference(
  artifact: ExtractedArtifact,
  projectMetadata: ProjectMetadata,
  projectRoot: string
): ResolvedReference {
  const result: ResolvedReference = {
    artifactId: artifact.id,
    status: 'unresolved',
    confidence: 0,
  };

  switch (artifact.kind) {
    case 'script_reference': {
      const scriptName = artifact.raw.trim();
      result.targetType = 'script';
      
      if (projectMetadata.scripts[scriptName] !== undefined) {
        result.status = 'resolved';
        result.confidence = 1.0;
        result.targetPath = 'package.json';
      } else {
        result.status = 'unresolved';
        result.confidence = 1.0;
      }
      break;
    }

    case 'api_reference': {
      const symbolName = artifact.raw.trim();
      const moduleName = (artifact.metadata?.moduleName as string | undefined)?.trim();
      result.targetType = 'export';

      if (!moduleName) {
        // No module name associated (e.g. inline code referring to a symbol without context)
        // Mark as partial since we can't verify module source
        result.status = 'partial';
        result.confidence = 0.5;
        break;
      }

      const ownPackageName = projectMetadata.packageName;

      // 1. Importing from our own package name (e.g. import { foo } from 'my-pkg')
      if (ownPackageName && (moduleName === ownPackageName || moduleName.startsWith(ownPackageName + '/'))) {
        let exportKey = '.';
        if (moduleName.startsWith(ownPackageName + '/')) {
          exportKey = '.' + moduleName.substring(ownPackageName.length);
        }

        const exports = projectMetadata.exportsMap[exportKey];
        if (exports) {
          if (exports.includes(symbolName)) {
            result.status = 'resolved';
            result.confidence = 1.0;
          } else {
            result.status = 'unresolved';
            result.confidence = 1.0;
          }
        } else {
          // Export subpath not defined in package.json exports
          result.status = 'unresolved';
          result.confidence = 0.9;
        }
      }
      // 2. Importing from relative paths (e.g. import { foo } from './utils.js')
      else if (moduleName.startsWith('.') || moduleName.startsWith('..')) {
        const docDir = path.dirname(artifact.location.filePath);
        const resolvedPath = resolveRelativeModulePath(moduleName, docDir);

        if (resolvedPath && fs.existsSync(resolvedPath)) {
          const fileExports = analyzeExports(resolvedPath);
          if (fileExports.includes(symbolName)) {
            result.status = 'resolved';
            result.confidence = 1.0;
            result.targetPath = path.relative(projectRoot, resolvedPath);
          } else {
            result.status = 'unresolved';
            result.confidence = 1.0;
            result.targetPath = path.relative(projectRoot, resolvedPath);
          }
        } else {
          // File does not exist
          result.status = 'unresolved';
          result.confidence = 0.8;
        }
      }
      // 3. Importing from external package (e.g. import React from 'react')
      else {
        // We assume it's resolved with partial confidence since we don't scan external node_modules
        // But we can check if the dependency exists in package.json to be safer
        result.status = 'resolved';
        result.confidence = 0.7;
        result.metadata = { external: true };
      }
      break;
    }

    case 'environment_variable': {
      const envKey = artifact.raw.trim();
      result.targetType = 'env_var';

      // Verify against .env.example keys if available
      if (projectMetadata.envKeys.length > 0) {
        if (projectMetadata.envKeys.includes(envKey)) {
          result.status = 'resolved';
          result.confidence = 1.0;
          result.targetPath = '.env.example';
        } else {
          result.status = 'unresolved';
          result.confidence = 0.9;
        }
      } else {
        // No .env.example configured or empty, assume resolved with low confidence (or partial)
        result.status = 'partial';
        result.confidence = 0.5;
      }
      break;
    }

    case 'command': {
      const commandStr = artifact.raw.trim();
      result.targetType = 'cli_command';

      // Parse first token
      const tokens = commandStr.split(/\s+/);
      const pkgManager = tokens[0];

      if (pkgManager && ['npm', 'pnpm', 'yarn', 'bun'].includes(pkgManager)) {
        const action = tokens[1];
        if (action === 'run' || (action && !['install', 'add', 'i', 'ci', 'remove', 'init'].includes(action))) {
          // E.g., npm run dev OR pnpm dev
          const scriptName = action === 'run' ? tokens[2] : action;
          if (scriptName) {
            const cleanScript = scriptName.split('?')[0]?.split('#')[0] || ''; // remove potential arguments/flags
            if (projectMetadata.scripts[cleanScript] !== undefined) {
              result.status = 'resolved';
              result.confidence = 1.0;
              result.targetPath = 'package.json';
            } else {
              result.status = 'unresolved';
              result.confidence = 1.0;
            }
          } else {
            result.status = 'resolved'; // general command
            result.confidence = 0.8;
          }
        } else {
          // E.g., npm install, pnpm add
          result.status = 'resolved';
          result.confidence = 1.0;
        }
      } else if (pkgManager) {
        // Check if command calls one of our binaries
        if (projectMetadata.binaries.includes(pkgManager)) {
          result.status = 'resolved';
          result.confidence = 1.0;
          result.targetPath = 'package.json';
        } else if (['git', 'node', 'npx', 'curl', 'wget', 'docker'].includes(pkgManager)) {
          // Standard system utilities
          result.status = 'resolved';
          result.confidence = 1.0;
        } else {
          // Unrecognized system utility
          result.status = 'partial';
          result.confidence = 0.5;
        }
      }
      break;
    }

    default: {
      result.status = 'resolved';
      result.confidence = 1.0;
      break;
    }
  }

  return result;
}

function resolveRelativeModulePath(importPath: string, currentDir: string): string | null {
  const targetPath = path.resolve(currentDir, importPath);
  const extensions = ['.ts', '.tsx', '.d.ts', '.js', '.jsx'];

  // 1. Direct file matching
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    return targetPath;
  }

  // 2. Extension matching
  for (const ext of extensions) {
    const testPath = targetPath + ext;
    if (fs.existsSync(testPath) && fs.statSync(testPath).isFile()) {
      return testPath;
    }

    if (importPath.endsWith('.js')) {
      const importWithoutJs = importPath.substring(0, importPath.length - 3);
      const testPathJsReplace = path.resolve(currentDir, importWithoutJs + ext);
      if (fs.existsSync(testPathJsReplace) && fs.statSync(testPathJsReplace).isFile()) {
        return testPathJsReplace;
      }
    }
  }

  // 3. Index file matching
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
