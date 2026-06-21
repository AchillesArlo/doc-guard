import fg from 'fast-glob';
import * as path from 'path';
import { execSync } from 'child_process';

export interface DiscoveryOptions {
  include: string[];
  exclude: string[];
  projectRoot: string;
  changedOnly?: boolean;
  baseRef?: string;
  headRef?: string;
}

export async function discoverFiles(options: DiscoveryOptions): Promise<string[]> {
  const {
    include,
    exclude,
    projectRoot,
    changedOnly = false,
    baseRef = 'HEAD',
    headRef,
  } = options;

  // Normalize projectRoot path and convert backslashes to forward slashes for fast-glob compatibility
  const normalizedRoot = projectRoot.replace(/\\/g, '/');

  if (changedOnly) {
    try {
      // Find modified files using git
      const gitCmd = headRef
        ? `git diff --name-only ${baseRef}...${headRef}`
        : `git diff --name-only ${baseRef}`;
      const stdout = execSync(gitCmd, { cwd: projectRoot, encoding: 'utf-8' });
      const changedFiles = stdout
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0)
        .map((f) => path.resolve(projectRoot, f));

      // We need to filter changedFiles based on our glob patterns
      // fast-glob makes it easy to match paths locally
      const allMatchingFiles = await runGlob(include, exclude, normalizedRoot);
      const allMatchingSet = new Set(allMatchingFiles.map((f) => path.resolve(f)));

      return changedFiles.filter((f) => allMatchingSet.has(f));
    } catch (err) {
      console.warn('Warning: Failed to fetch changed files via Git. Falling back to full scan.', err);
      // Fallback to full scan
    }
  }

  return runGlob(include, exclude, normalizedRoot);
}

async function runGlob(include: string[], exclude: string[], normalizedRoot: string): Promise<string[]> {
  // Convert inclusion and exclusion globs to absolute paths if they are not already, or pass cwd
  const files = await fg(include, {
    cwd: normalizedRoot,
    ignore: exclude,
    absolute: true,
    dot: true,
  });

  return files.map((f) => path.normalize(f));
}
