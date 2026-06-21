import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { reportJson } from './json-reporter.js';
import { reportTerminal } from './terminal-reporter.js';
import { reportGithubSummary } from './github-summary-reporter.js';
import { type ScanResult, type ScanSummary } from '@docs-guard/core';

vi.mock('fs', () => {
  return {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  };
});

describe('Reporters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should write stable JSON results to file', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const summary: ScanSummary = {
      filesScanned: 1,
      docsFilesScanned: 1,
      artifactsExtracted: 1,
      findingsBySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
      durationMs: 100,
      passed: true,
    };

    const mockResult: ScanResult = {
      summary,
      findings: [],
      diagnostics: [],
      version: '1.0.0',
    };

    reportJson(mockResult, 'report.json');

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.resolve('report.json'),
      JSON.stringify(mockResult, null, 2),
      'utf-8'
    );
  });

  it('should print terminal output successfully', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const summary: ScanSummary = {
      filesScanned: 5,
      docsFilesScanned: 2,
      artifactsExtracted: 10,
      findingsBySeverity: { info: 0, low: 0, medium: 1, high: 0, critical: 0 },
      durationMs: 120,
      passed: false,
    };

    reportTerminal(
      [
        {
          id: 'F-1',
          checkerId: 'env-key-known',
          severity: 'medium',
          message: 'Env var missing',
          location: { filePath: 'README.md', startLine: 12, endLine: 12 },
        },
      ],
      summary
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  describe('GitHub Step Summary Reporter', () => {

    it('should generate passed markdown summary when scan passed', () => {
      const summary: ScanSummary = {
        filesScanned: 3,
        docsFilesScanned: 3,
        artifactsExtracted: 15,
        findingsBySeverity: { info: 0, low: 0, medium: 0, high: 0, critical: 0 },
        durationMs: 450,
        passed: true,
      };

      const markdown = reportGithubSummary([], summary);
      expect(markdown).toContain('# Docs Guard Scan Results');
      expect(markdown).toContain('## ✅ Passed');
      expect(markdown).toContain('| **Files Scanned** | 3 |');
      expect(markdown).toContain('| **Total Findings** | 0 |');
    });

    it('should generate failed markdown summary with findings details when scan failed', () => {
      const summary: ScanSummary = {
        filesScanned: 2,
        docsFilesScanned: 2,
        artifactsExtracted: 8,
        findingsBySeverity: { info: 0, low: 0, medium: 1, high: 1, critical: 0 },
        durationMs: 250,
        passed: false,
      };

      const findings = [
        {
          id: 'F-1',
          checkerId: 'export-reference-exists',
          severity: 'high' as const,
          message: 'Symbol foo not exported',
          suggestion: 'Fix export in index.ts',
          location: { filePath: 'README.md', startLine: 10, endLine: 10 },
        },
        {
          id: 'F-2',
          checkerId: 'env-key-known',
          severity: 'medium' as const,
          message: 'Env var DB_URL missing',
          location: { filePath: 'README.md', startLine: 15, endLine: 15 },
        },
      ];

      const markdown = reportGithubSummary(findings, summary);
      expect(markdown).toContain('# Docs Guard Scan Results');
      expect(markdown).toContain('## ❌ Failed');
      expect(markdown).toContain('🔴 [HIGH] | 10 | `export-reference-exists` | Symbol foo not exported | Fix export in index.ts |');
      expect(markdown).toContain('🟡 [MEDIUM] | 15 | `env-key-known` | Env var DB_URL missing |');
    });
  });
});

