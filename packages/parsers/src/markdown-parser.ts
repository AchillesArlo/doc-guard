import * as fs from 'fs';
import * as crypto from 'crypto';
import {
  type ParsedDocument,
  type ExtractedArtifact,
  type ParseDiagnostic,
} from '@docs-guard/core';

export function parseMarkdown(filePath: string): ParsedDocument {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/);
  
  // Calculate content hash
  const contentHash = crypto.createHash('sha256').update(content).digest('hex');

  const headings: { depth: number; text: string; line: number }[] = [];
  const artifacts: ExtractedArtifact[] = [];
  const diagnostics: ParseDiagnostic[] = [];

  let currentHeadingPath: string[] = [];
  let insideCodeBlock = false;
  let codeBlockStartLine = -1;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  let artifactCounter = 0;
  const generateArtifactId = (kind: string) => {
    artifactCounter++;
    return `art-${kind}-${artifactCounter}`;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lineNum = i + 1;

    // 1. Check for fenced code block toggle
    if (line.trim().startsWith('```')) {
      if (!insideCodeBlock) {
        // Starting code block
        insideCodeBlock = true;
        codeBlockStartLine = lineNum;
        codeBlockLang = line.trim().substring(3).trim().split(/\s+/)[0]?.toLowerCase() || '';
        codeBlockLines = [];
      } else {
        // Ending code block
        insideCodeBlock = false;
        const codeContent = codeBlockLines.join('\n');
        
        let kind: ExtractedArtifact['kind'] = 'code_snippet';
        if (['bash', 'shell', 'sh', 'zsh', 'powershell', 'cmd'].includes(codeBlockLang)) {
          kind = 'command';
        } else if (['json', 'yaml', 'yml'].includes(codeBlockLang)) {
          kind = 'config_example';
        }

        artifacts.push({
          id: generateArtifactId(kind),
          kind,
          language: codeBlockLang || undefined,
          raw: codeContent,
          headingPath: [...currentHeadingPath],
          location: {
            filePath,
            startLine: codeBlockStartLine,
            endLine: lineNum,
          },
        });

        // Also check if this JS/TS code block contains import/require references
        if (['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(codeBlockLang)) {
          extractApiReferencesFromSnippet(
            codeContent,
            filePath,
            codeBlockStartLine + 1,
            currentHeadingPath,
            artifacts,
            generateArtifactId
          );
        }
      }
      continue;
    }

    if (insideCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Headings parser (only outside code blocks)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2].trim();
      headings.push({ depth, text, line: lineNum });

      // Update current heading path based on depth
      currentHeadingPath = currentHeadingPath.slice(0, depth - 1);
      currentHeadingPath[depth - 1] = text;
      continue;
    }

    // 3. Command scanner in inline text/lists (e.g. `npm run test` or `pnpm dev`)
    // Look for backticked inline commands or generic lists
    const inlineCodeMatches = [...line.matchAll(/`([^`]+)`/g)];
    for (const match of inlineCodeMatches) {
      const code = match[1]?.trim() || '';
      // Check if it looks like a package command
      if (
        /^(npm|pnpm|yarn|bun)\s+(run\s+)?([a-zA-Z0-9:-]+)/.test(code) ||
        /^(npm|pnpm|yarn|bun)\s+(install|add|i|ci)\s+/.test(code)
      ) {
        artifacts.push({
          id: generateArtifactId('command'),
          kind: 'command',
          raw: code,
          headingPath: [...currentHeadingPath],
          location: {
            filePath,
            startLine: lineNum,
            endLine: lineNum,
          },
        });

        // If it's a script run, also extract it as a script reference
        const scriptMatch = code.match(/^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?([a-zA-Z0-9:-]+)(?:\s+|$)/);
        const action = code.split(/\s+/)[1];
        if (scriptMatch && scriptMatch[1] && action !== 'install' && action !== 'add' && action !== 'i' && action !== 'ci') {
          artifacts.push({
            id: generateArtifactId('script_reference'),
            kind: 'script_reference',
            raw: scriptMatch[1],
            headingPath: [...currentHeadingPath],
            location: {
              filePath,
              startLine: lineNum,
              endLine: lineNum,
            },
          });
        }
      }
    }

    // 4. Environment variable scanner (e.g. `process.env.API_KEY` or `PORT=3000` or `DATABASE_URL`)
    // Matches process.env.SOMETHING
    const envVarMatches = [...line.matchAll(/process\.env\.([a-zA-Z_][a-zA-Z0-9_]*)/g)];
    for (const match of envVarMatches) {
      if (match[1]) {
        artifacts.push({
          id: generateArtifactId('environment_variable'),
          kind: 'environment_variable',
          raw: match[1],
          headingPath: [...currentHeadingPath],
          location: {
            filePath,
            startLine: lineNum,
            endLine: lineNum,
          },
        });
      }
    }

    // Matches backticked env assignment like `PORT=3000`
    const envAssignMatches = [...line.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*)=[^`]+`/g)];
    for (const match of envAssignMatches) {
      if (match[1]) {
        artifacts.push({
          id: generateArtifactId('environment_variable'),
          kind: 'environment_variable',
          raw: match[1],
          headingPath: [...currentHeadingPath],
          location: {
            filePath,
            startLine: lineNum,
            endLine: lineNum,
          },
        });
      }
    }
  }

  if (insideCodeBlock) {
    diagnostics.push({
      message: 'Unclosed fenced code block at end of file',
      location: {
        filePath,
        startLine: codeBlockStartLine,
        endLine: lines.length,
      },
    });
  }

  return {
    filePath,
    contentHash,
    headings,
    artifacts,
    diagnostics,
  };
}

function extractApiReferencesFromSnippet(
  code: string,
  filePath: string,
  startLineOffset: number,
  headingPath: string[],
  artifacts: ExtractedArtifact[],
  generateArtifactId: (kind: string) => string
) {
  const lines = code.split('\n');
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx]!;
    const lineNum = startLineOffset + idx;

    // Match ESM imports: import { a, b } from 'c' or import x from 'y'
    // Group 1: imports inside {}, Group 2: default import, Group 3: module name
    const esmImportMatch = line.match(/import\s+(?:([\w\s,{}*]+)\s+from\s+)?['"]([^'"]+)['"]/);
    if (esmImportMatch) {
      const importNamesStr = esmImportMatch[1]?.trim();
      const moduleName = esmImportMatch[2]?.trim();

      if (importNamesStr && moduleName) {
        // Extract individual symbols from inside curly braces or default imports
        const symbols = extractSymbolsFromImportString(importNamesStr);
        for (const sym of symbols) {
          artifacts.push({
            id: generateArtifactId('api_reference'),
            kind: 'api_reference',
            raw: sym,
            headingPath: [...headingPath],
            location: {
              filePath,
              startLine: lineNum,
              endLine: lineNum,
            },
            metadata: {
              moduleName,
            },
          });
        }
      }
      continue;
    }

    // Match CommonJS requires: const { a } = require('b') or const x = require('y')
    const cjsRequireMatch = line.match(/(?:const|let|var)\s+([\w\s,{}]+)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (cjsRequireMatch) {
      const requireNamesStr = cjsRequireMatch[1]?.trim();
      const moduleName = cjsRequireMatch[2]?.trim();

      if (requireNamesStr && moduleName) {
        const symbols = extractSymbolsFromImportString(requireNamesStr);
        for (const sym of symbols) {
          artifacts.push({
            id: generateArtifactId('api_reference'),
            kind: 'api_reference',
            raw: sym,
            headingPath: [...headingPath],
            location: {
              filePath,
              startLine: lineNum,
              endLine: lineNum,
            },
            metadata: {
              moduleName,
            },
          });
        }
      }
    }
  }
}

function extractSymbolsFromImportString(importStr: string): string[] {
  // E.g. "{ foo, bar as baz }" or "defaultExport" or "* as ns"
  const symbols: string[] = [];

  // Check if it has curly braces
  const curlyMatch = importStr.match(/\{([^}]+)\}/);
  if (curlyMatch && curlyMatch[1]) {
    const parts = curlyMatch[1].split(',');
    for (const part of parts) {
      const cleanPart = part.trim();
      if (!cleanPart) continue;
      // Handle "bar as baz"
      const aliasMatch = cleanPart.match(/([\w_]+)\s+as\s+([\w_]+)/);
      if (aliasMatch && aliasMatch[1]) {
        symbols.push(aliasMatch[1]);
      } else {
        symbols.push(cleanPart);
      }
    }

    // Also look for default export import outside curly braces, e.g. "React, { useState }"
    const outsideBraces = importStr.replace(/\{[^}]+\}/, '').trim();
    if (outsideBraces) {
      const cleanOutside = outsideBraces.replace(/,$/, '').trim();
      if (cleanOutside) {
        symbols.push(cleanOutside);
      }
    }
  } else {
    // Single import name or namespaces
    const clean = importStr.trim();
    if (clean.startsWith('* as ')) {
      // Namespace import, we can ignore the prefix
      symbols.push(clean.substring(5).trim());
    } else {
      symbols.push(clean);
    }
  }

  return symbols;
}
