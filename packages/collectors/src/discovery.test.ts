import { describe, it, expect, vi, beforeEach } from 'vitest';
import fg from 'fast-glob';
import { execSync } from 'child_process';
import { discoverFiles } from './discovery.js';
import * as path from 'path';

vi.mock('fast-glob', () => {
  return {
    default: vi.fn(),
  };
});

vi.mock('child_process', () => {
  return {
    execSync: vi.fn(),
  };
});

describe('File Discovery', () => {
  const include = ['README.md', 'docs/**/*.md'];
  const exclude = ['**/node_modules/**'];
  const projectRoot = 'd:/Games/Agent/Doc Guard';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should list all matching files in standard mode', async () => {
    vi.mocked(fg).mockResolvedValue([
      'd:/Games/Agent/Doc Guard/README.md',
      'd:/Games/Agent/Doc Guard/docs/intro.md',
    ]);

    const files = await discoverFiles({ include, exclude, projectRoot });
    expect(files).toEqual([
      path.normalize('d:/Games/Agent/Doc Guard/README.md'),
      path.normalize('d:/Games/Agent/Doc Guard/docs/intro.md'),
    ]);
    expect(fg).toHaveBeenCalledWith(include, {
      cwd: projectRoot.replace(/\\/g, '/'),
      ignore: exclude,
      absolute: true,
      dot: true,
    });
  });

  it('should filter files by git changed files in changed-only mode', async () => {
    vi.mocked(fg).mockResolvedValue([
      'd:/Games/Agent/Doc Guard/README.md',
      'd:/Games/Agent/Doc Guard/docs/intro.md',
      'd:/Games/Agent/Doc Guard/docs/architecture.md',
    ]);

    // git status modified files
    vi.mocked(execSync).mockReturnValue(
      'README.md\ndocs/intro.md\nsrc/index.ts\n'
    );

    const files = await discoverFiles({
      include,
      exclude,
      projectRoot,
      changedOnly: true,
    });

    expect(files).toEqual([
      path.normalize('d:/Games/Agent/Doc Guard/README.md'),
      path.normalize('d:/Games/Agent/Doc Guard/docs/intro.md'),
    ]);
  });

  it('should fallback to full scan if git command fails in changed-only mode', async () => {
    vi.mocked(fg).mockResolvedValue([
      'd:/Games/Agent/Doc Guard/README.md',
    ]);
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error('Not a git repository');
    });

    const files = await discoverFiles({
      include,
      exclude,
      projectRoot,
      changedOnly: true,
    });

    expect(files).toEqual([
      path.normalize('d:/Games/Agent/Doc Guard/README.md'),
    ]);
  });
});
