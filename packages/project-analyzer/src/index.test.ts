import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeProject } from './index.js';

vi.mock('fs', () => {
  return {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

describe('Project Analyzer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should analyze package.json and extract metadata', () => {
    const pkgContent = JSON.stringify({
      name: 'my-lib',
      scripts: {
        build: 'tsup src/index.ts',
        test: 'vitest run',
      },
      exports: {
        '.': './dist/index.js',
        './config': './dist/config.js',
      },
    });

    vi.mocked(fs.existsSync).mockImplementation((p) => {
      const pString = String(p).replace(/\\/g, '/');
      if (pString.endsWith('package.json')) return true;
      if (pString.endsWith('pnpm-lock.yaml')) return true;
      // Entrypoints
      if (pString.includes('src/index.ts')) return true;
      if (pString.includes('src/config.ts')) return true;
      return false;
    });

    vi.mocked(fs.readFileSync).mockImplementation((p) => {
      const pString = String(p).replace(/\\/g, '/');
      if (pString.endsWith('package.json')) {
        return pkgContent;
      }
      if (pString.includes('src/index.ts')) {
        return `
export const createGuard = () => {};
export default createGuard;
export { helper } from './utils.js';
        `;
      }
      if (pString.includes('src/config.ts')) {
        return `
export interface Config {
  failOn: string;
}
        `;
      }
      if (pString.includes('src/utils.ts')) {
        return `
export const helper = '123';
        `;
      }
      return '';
    });

    vi.mocked(fs.statSync).mockImplementation(() => {
      return {
        isFile: () => true,
        isDirectory: () => false,
      } as any;
    });

    const metadata = analyzeProject('/workspace');

    expect(metadata.packageName).toBe('my-lib');
    expect(metadata.packageManager).toBe('pnpm');
    expect(metadata.scripts).toEqual({
      build: 'tsup src/index.ts',
      test: 'vitest run',
    });

    expect(metadata.exportsMap['.']).toContain('createGuard');
    expect(metadata.exportsMap['.']).toContain('default');
    expect(metadata.exportsMap['.']).toContain('helper'); // re-exported from utils.ts

    expect(metadata.exportsMap['./config']).toContain('Config');
  });
});
