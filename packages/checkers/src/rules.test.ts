import { describe, it, expect } from 'vitest';
import { runOrchestrator } from './orchestrator.js';
import {
  type CheckerContext,
  syntaxJsTsChecker,
  syntaxJsonYamlChecker,
} from './rules.js';
import { type ParsedDocument, type DocsGuardConfig, type ProjectMetadata } from '@docs-guard/core';

describe('Rules & Orchestrator', () => {
  const mockConfig: DocsGuardConfig = {
    version: 1,
    include: ['**/*.md'],
    exclude: [],
    failOn: 'high',
    reporters: ['terminal'],
    checkers: {
      'syntax-js-ts': true,
      'syntax-json-yaml': true,
      'package-script-exists': true,
      'export-reference-exists': true,
      'env-key-known': true,
      'cli-command-known': true,
    },
  };

  const mockProjectMetadata: ProjectMetadata = {
    packageName: 'test-lib',
    packageManager: 'pnpm',
    scripts: {
      build: 'tsup src/index.ts',
    },
    exportsMap: {
      '.': ['createGuard'],
    },
    binaries: [],
    configKeys: [],
    envKeys: ['DATABASE_URL'],
  };

  const projectRoot = '/workspace';

  it('should pass correct TS/JS syntax', async () => {
    const documents: ParsedDocument[] = [
      {
        filePath: 'README.md',
        contentHash: '123',
        headings: [],
        diagnostics: [],
        artifacts: [
          {
            id: 'art-1',
            kind: 'code_snippet',
            language: 'typescript',
            raw: 'const a: number = 10; export { a };',
            headingPath: [],
            location: { filePath: 'README.md', startLine: 5, endLine: 7 },
          },
        ],
      },
    ];

    const context: CheckerContext = {
      config: mockConfig,
      projectMetadata: mockProjectMetadata,
      documents,
      projectRoot,
    };

    const findings = await syntaxJsTsChecker.run(context);
    expect(findings).toHaveLength(0);
  });

  it('should detect TS/JS syntax errors and adjust line number', async () => {
    const documents: ParsedDocument[] = [
      {
        filePath: 'README.md',
        contentHash: '123',
        headings: [],
        diagnostics: [],
        artifacts: [
          {
            id: 'art-1',
            kind: 'code_snippet',
            language: 'typescript',
            // Syntax error: missing closing bracket
            raw: 'function test() { const a = 1;',
            headingPath: [],
            location: { filePath: 'README.md', startLine: 5, endLine: 7 },
          },
        ],
      },
    ];

    const context: CheckerContext = {
      config: mockConfig,
      projectMetadata: mockProjectMetadata,
      documents,
      projectRoot,
    };

    const findings = await syntaxJsTsChecker.run(context);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.message).toContain('Syntax error');
    // Error is at the end of the snippet (line 1 of snippet -> actual line 6)
    expect(findings[0]?.location.startLine).toBe(6);
  });

  it('should detect JSON syntax errors', async () => {
    const documents: ParsedDocument[] = [
      {
        filePath: 'README.md',
        contentHash: '123',
        headings: [],
        diagnostics: [],
        artifacts: [
          {
            id: 'art-1',
            kind: 'config_example',
            language: 'json',
            // Invalid JSON
            raw: '{ "key": "value", }', // trailing comma
            headingPath: [],
            location: { filePath: 'README.md', startLine: 10, endLine: 12 },
          },
        ],
      },
    ];

    const context: CheckerContext = {
      config: mockConfig,
      projectMetadata: mockProjectMetadata,
      documents,
      projectRoot,
    };

    const findings = await syntaxJsonYamlChecker.run(context);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.message).toContain('Invalid JSON syntax');
  });

  it('should apply file overrides and ignore disabled rules', async () => {
    const documents: ParsedDocument[] = [
      {
        filePath: 'CHANGELOG.md',
        contentHash: '123',
        headings: [],
        diagnostics: [],
        artifacts: [
          {
            id: 'art-1',
            kind: 'config_example',
            language: 'json',
            raw: '{ broken json }',
            headingPath: [],
            location: { filePath: 'CHANGELOG.md', startLine: 10, endLine: 12 },
          },
        ],
      },
    ];

    // Config overrides: disable syntax-json-yaml on CHANGELOG.md
    const configWithOverrides: DocsGuardConfig = {
      ...mockConfig,
      overrides: [
        {
          files: ['CHANGELOG.md'],
          disable: ['syntax-json-yaml'],
        },
      ],
    };

    const context: CheckerContext = {
      config: configWithOverrides,
      projectMetadata: mockProjectMetadata,
      documents,
      projectRoot,
    };

    const findings = await runOrchestrator(context);
    expect(findings).toHaveLength(0); // Ignore JSON errors in CHANGELOG.md
  });
});
