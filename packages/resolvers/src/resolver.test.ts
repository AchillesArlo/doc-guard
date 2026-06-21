import { describe, it, expect, vi } from 'vitest';
import { resolveReference } from './resolver.js';
import { type ProjectMetadata, type ExtractedArtifact } from '@docs-guard/core';
import * as fs from 'fs';
import { analyzeExports } from '@docs-guard/project-analyzer';

vi.mock('fs', () => {
  return {
    existsSync: vi.fn(),
    statSync: vi.fn(() => ({
      isFile: () => true,
      isDirectory: () => false,
    })),
  };
});

vi.mock('@docs-guard/project-analyzer', () => {
  return {
    analyzeExports: vi.fn(),
  };
});

describe('Reference Resolver', () => {
  const projectMetadata: ProjectMetadata = {
    packageName: 'test-pkg',
    packageManager: 'pnpm',
    scripts: {
      build: 'tsup src/index.ts',
      dev: 'tsup src/index.ts --watch',
    },
    exportsMap: {
      '.': ['createGuard', 'defaultConfig'],
      './config': ['loadConfig'],
    },
    binaries: ['test-pkg-cli'],
    configKeys: [],
    envKeys: ['DATABASE_URL', 'PORT'],
  };

  const projectRoot = '/workspace';

  it('should resolve script_reference if it exists', () => {
    const artifact: ExtractedArtifact = {
      id: 'art-1',
      kind: 'script_reference',
      raw: 'build',
      headingPath: [],
      location: { filePath: 'README.md', startLine: 10, endLine: 10 },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('resolved');
    expect(resolved.targetType).toBe('script');
    expect(resolved.confidence).toBe(1.0);
  });

  it('should unresolve script_reference if it is missing', () => {
    const artifact: ExtractedArtifact = {
      id: 'art-2',
      kind: 'script_reference',
      raw: 'start-server',
      headingPath: [],
      location: { filePath: 'README.md', startLine: 10, endLine: 10 },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('unresolved');
  });

  it('should resolve api_reference when importing from own package', () => {
    const artifact: ExtractedArtifact = {
      id: 'art-3',
      kind: 'api_reference',
      raw: 'createGuard',
      headingPath: [],
      location: { filePath: 'README.md', startLine: 10, endLine: 10 },
      metadata: { moduleName: 'test-pkg' },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('resolved');
    expect(resolved.confidence).toBe(1.0);
  });

  it('should resolve api_reference from subpath of own package', () => {
    const artifact: ExtractedArtifact = {
      id: 'art-4',
      kind: 'api_reference',
      raw: 'loadConfig',
      headingPath: [],
      location: { filePath: 'README.md', startLine: 10, endLine: 10 },
      metadata: { moduleName: 'test-pkg/config' },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('resolved');
  });

  it('should resolve api_reference from relative module path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(analyzeExports).mockReturnValue(['myHelper']);

    const artifact: ExtractedArtifact = {
      id: 'art-5',
      kind: 'api_reference',
      raw: 'myHelper',
      headingPath: [],
      location: { filePath: '/workspace/docs/intro.md', startLine: 10, endLine: 10 },
      metadata: { moduleName: '../src/utils.js' },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('resolved');
    expect(resolved.targetPath?.replace(/\\/g, '/')).toBe('src/utils.js');
  });

  it('should resolve env_var from .env.example keys', () => {
    const artifact: ExtractedArtifact = {
      id: 'art-6',
      kind: 'environment_variable',
      raw: 'DATABASE_URL',
      headingPath: [],
      location: { filePath: 'README.md', startLine: 10, endLine: 10 },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('resolved');
    expect(resolved.targetPath).toBe('.env.example');
  });

  it('should resolve recognized shell commands', () => {
    const artifact: ExtractedArtifact = {
      id: 'art-7',
      kind: 'command',
      raw: 'pnpm dev',
      headingPath: [],
      location: { filePath: 'README.md', startLine: 10, endLine: 10 },
    };

    const resolved = resolveReference(artifact, projectMetadata, projectRoot);
    expect(resolved.status).toBe('resolved');
    expect(resolved.targetPath).toBe('package.json');
  });
});
