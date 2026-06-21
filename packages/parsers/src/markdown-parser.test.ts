import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import { parseMarkdown } from './markdown-parser.js';

vi.mock('fs', () => {
  return {
    readFileSync: vi.fn(),
  };
});

describe('Markdown Parser', () => {
  it('should parse headings, code blocks, and inline artifacts', () => {
    const mdContent = `
# Docs Guard Project
This is introductory text.

## Installation
To install Docs Guard, run:
\`\`\`bash
npm install -g @docs-guard/cli
\`\`\`

## Getting Started
You can use the library:
\`\`\`typescript
import { createGuard, scanDocs } from '@docs-guard/core';
const guard = createGuard();
\`\`\`

You can run \`npm run dev\` to test locally.
Make sure you set your \`process.env.DATABASE_URL\` or configuration.
`;

    vi.mocked(fs.readFileSync).mockReturnValue(mdContent);

    const doc = parseMarkdown('test-file.md');

    expect(doc.filePath).toBe('test-file.md');
    expect(doc.headings).toEqual([
      { depth: 1, text: 'Docs Guard Project', line: 2 },
      { depth: 2, text: 'Installation', line: 5 },
      { depth: 2, text: 'Getting Started', line: 11 },
    ]);

    // Check extracted artifacts
    // 1. Bash command block
    const bashArtifact = doc.artifacts.find((a) => a.kind === 'command' && a.language === 'bash');
    expect(bashArtifact).toBeDefined();
    expect(bashArtifact?.raw).toBe('npm install -g @docs-guard/cli');
    expect(bashArtifact?.location.startLine).toBe(7);
    expect(bashArtifact?.location.endLine).toBe(9);
    expect(bashArtifact?.headingPath).toEqual(['Docs Guard Project', 'Installation']);

    // 2. TypeScript code snippet
    const tsSnippet = doc.artifacts.find((a) => a.kind === 'code_snippet' && a.language === 'typescript');
    expect(tsSnippet).toBeDefined();
    expect(tsSnippet?.raw).toContain('import { createGuard, scanDocs }');

    // 3. API references parsed from the TS snippet
    const apiRefs = doc.artifacts.filter((a) => a.kind === 'api_reference');
    expect(apiRefs).toHaveLength(2);
    expect(apiRefs.map((a) => a.raw)).toContain('createGuard');
    expect(apiRefs.map((a) => a.raw)).toContain('scanDocs');
    expect(apiRefs[0]?.metadata?.moduleName).toBe('@docs-guard/core');

    // 4. Command reference in inline text
    const inlineCmd = doc.artifacts.find((a) => a.kind === 'command' && a.raw === 'npm run dev');
    expect(inlineCmd).toBeDefined();
    expect(inlineCmd?.location.startLine).toBe(18);

    // 5. Script reference extracted from inline command
    const scriptRef = doc.artifacts.find((a) => a.kind === 'script_reference');
    expect(scriptRef).toBeDefined();
    expect(scriptRef?.raw).toBe('dev');

    // 6. Environment variable
    const envVar = doc.artifacts.find((a) => a.kind === 'environment_variable');
    expect(envVar).toBeDefined();
    expect(envVar?.raw).toBe('DATABASE_URL');
  });

  it('should flag unclosed code blocks as diagnostic', () => {
    const mdContent = `
# Broken Doc
\`\`\`typescript
const a = 1;
`;
    vi.mocked(fs.readFileSync).mockReturnValue(mdContent);

    const doc = parseMarkdown('test-file.md');
    expect(doc.diagnostics).toHaveLength(1);
    expect(doc.diagnostics[0]?.message).toContain('Unclosed fenced code block');
  });
});
