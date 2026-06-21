import * as fs from 'fs';
import * as path from 'path';
import { DocsGuardConfigSchema, type DocsGuardConfig } from './schema.js';

export const DEFAULT_CONFIG: DocsGuardConfig = DocsGuardConfigSchema.parse({});

export function loadConfig(configPath?: string, projectRoot: string = process.cwd()): DocsGuardConfig {
  let fileConfig: Record<string, unknown> = {};

  const searchPaths = configPath
    ? [path.resolve(projectRoot, configPath)]
    : [
        path.resolve(projectRoot, 'docsguard.config.json'),
        path.resolve(projectRoot, '.docsguard.json'),
      ];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8');
        fileConfig = JSON.parse(content) as Record<string, unknown>;
        break;
      } catch (err) {
        console.warn(`Warning: Failed to parse configuration file at ${p}. Using defaults.`, err);
      }
    }
  }

  // Parse and validate config
  try {
    const merged = {
      ...DEFAULT_CONFIG,
      ...fileConfig,
      // Perform manual shallow merge for complex objects/arrays if present
      output: fileConfig['output']
        ? { ...DEFAULT_CONFIG.output, ...(fileConfig['output'] as Record<string, unknown>) }
        : DEFAULT_CONFIG.output,
      checkers: fileConfig['checkers']
        ? { ...DEFAULT_CONFIG.checkers, ...(fileConfig['checkers'] as Record<string, unknown>) }
        : DEFAULT_CONFIG.checkers,
    };
    return DocsGuardConfigSchema.parse(merged);
  } catch (err) {
    console.error('Error: Configuration schema is invalid. Using fallback default config.', err);
    return DEFAULT_CONFIG;
  }
}

export function mergeCliOverrides(
  config: DocsGuardConfig,
  overrides: {
    include?: string[];
    exclude?: string[];
    failOn?: string;
    reporters?: string[];
    outputJson?: string;
  }
): DocsGuardConfig {
  const merged = { ...config };

  if (overrides.include) {
    merged.include = overrides.include;
  }
  if (overrides.exclude) {
    merged.exclude = overrides.exclude;
  }
  if (overrides.failOn) {
    // Validate severity value
    const parsedSeverity = DocsGuardConfigSchema.shape.failOn.safeParse(overrides.failOn);
    if (parsedSeverity.success) {
      merged.failOn = parsedSeverity.data;
    }
  }
  if (overrides.reporters) {
    merged.reporters = overrides.reporters;
  }
  if (overrides.outputJson) {
    merged.output = {
      ...merged.output,
      json: overrides.outputJson,
    };
  }

  return merged;
}
