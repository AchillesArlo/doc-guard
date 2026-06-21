import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig, mergeCliOverrides, DEFAULT_CONFIG } from './loader.js';

vi.mock('fs', () => {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('Config Loader', () => {
  it('should return default config if no config file exists', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    const config = loadConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('should load and validate config from file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({
        failOn: 'critical',
        include: ['docs/**/*.md'],
      })
    );

    const config = loadConfig('/custom/docsguard.config.json');
    expect(config.failOn).toBe('critical');
    expect(config.include).toEqual(['docs/**/*.md']);
    // Fallbacks from defaults
    expect(config.exclude).toEqual(DEFAULT_CONFIG.exclude);
  });

  it('should merge CLI overrides correctly', () => {
    const baseConfig = { ...DEFAULT_CONFIG, failOn: 'medium' as const };
    const merged = mergeCliOverrides(baseConfig, {
      failOn: 'high',
      include: ['README.md'],
    });

    expect(merged.failOn).toBe('high');
    expect(merged.include).toEqual(['README.md']);
    expect(merged.exclude).toEqual(baseConfig.exclude);
  });

  it('should ignore invalid CLI severity overrides', () => {
    const baseConfig = { ...DEFAULT_CONFIG, failOn: 'medium' as const };
    const merged = mergeCliOverrides(baseConfig, {
      failOn: 'invalid-severity',
    });

    expect(merged.failOn).toBe('medium');
  });
});
