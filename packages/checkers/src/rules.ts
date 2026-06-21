import ts from 'typescript';
import * as YAML from 'yaml';
import {
  type Finding,
  type ParsedDocument,
  type DocsGuardConfig,
  type ProjectMetadata,
  type Severity,
  type SourceLocation,
} from '@docs-guard/core';
import { resolveReference } from '@docs-guard/resolvers';

export interface CheckerContext {
  config: DocsGuardConfig;
  projectMetadata: ProjectMetadata;
  documents: ParsedDocument[];
  projectRoot: string;
}

export interface Checker {
  id: string;
  description: string;
  run(context: CheckerContext): Promise<Finding[]>;
}

// Helper to create a basic finding
function createFinding(
  checkerId: string,
  severity: Severity,
  message: string,
  location: SourceLocation,
  suggestion?: string,
  excerpt?: string
): Finding {
  // Generate a unique ID based on values hash
  const hashInput = `${checkerId}-${location.filePath}-${location.startLine}-${message}`;
  const id = 'F-' + Math.abs(hashInput.split('').reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0)).toString(16).padStart(4, '0');

  return {
    id,
    checkerId,
    severity,
    message,
    suggestion,
    location,
    excerpt,
  };
}

// 1. syntax-js-ts
export const syntaxJsTsChecker: Checker = {
  id: 'syntax-js-ts',
  description: 'Validates syntax of Javascript/Typescript code snippets',
  async run({ documents }) {
    const findings: Finding[] = [];

    for (const doc of documents) {
      const tsSnippetArtifacts = doc.artifacts.filter(
        (a) =>
          a.kind === 'code_snippet' &&
          a.language &&
          ['javascript', 'typescript', 'js', 'ts', 'jsx', 'tsx'].includes(a.language)
      );

      for (const art of tsSnippetArtifacts) {
        // Parse snippet using TypeScript compiler API
        const filename = `temp.${art.language || 'ts'}`;
        const sourceFile = ts.createSourceFile(
          filename,
          art.raw,
          ts.ScriptTarget.Latest,
          true // setParentNodes
        );

        const diagnostics = (sourceFile as any).parseDiagnostics;
        if (diagnostics.length > 0) {
          for (const diag of diagnostics) {
            let errorLine = art.location.startLine;
            let errorCol = 0;

            if (diag.start !== undefined) {
              const { line, character } = sourceFile.getLineAndCharacterOfPosition(diag.start);
              // Line in sourceFile is 0-indexed, so we add it to starting line of snippet
              // The snippet content starts on line startLine + 1
              errorLine = art.location.startLine + line + 1;
              errorCol = character + 1;
            }

            const messageText = typeof diag.messageText === 'string'
              ? diag.messageText
              : diag.messageText.messageText;

            findings.push(
              createFinding(
                this.id,
                'high',
                `Syntax error in ${art.language} snippet: ${messageText}`,
                {
                  filePath: art.location.filePath,
                  startLine: errorLine,
                  endLine: errorLine,
                  startColumn: errorCol || undefined,
                },
                'Correct the syntax errors in the code snippet.'
              )
            );
          }
        }
      }
    }

    return findings;
  },
};

// 2. syntax-json-yaml
export const syntaxJsonYamlChecker: Checker = {
  id: 'syntax-json-yaml',
  description: 'Validates syntax of JSON and YAML configuration snippets',
  async run({ documents }) {
    const findings: Finding[] = [];

    for (const doc of documents) {
      const configArtifacts = doc.artifacts.filter(
        (a) =>
          a.kind === 'config_example' &&
          a.language &&
          ['json', 'yaml', 'yml'].includes(a.language)
      );

      for (const art of configArtifacts) {
        const isJson = art.language === 'json';

        if (isJson) {
          try {
            JSON.parse(art.raw);
          } catch (err: any) {
            findings.push(
              createFinding(
                this.id,
                'medium',
                `Invalid JSON syntax: ${err.message}`,
                art.location,
                'Ensure the JSON snippet has valid brackets, quotes, and commas.'
              )
            );
          }
        } else {
          // YAML/YML
          try {
            YAML.parse(art.raw);
          } catch (err: any) {
            findings.push(
              createFinding(
                this.id,
                'medium',
                `Invalid YAML syntax: ${err.message}`,
                art.location,
                'Ensure the YAML snippet has valid indentation.'
              )
            );
          }
        }
      }
    }

    return findings;
  },
};

// 3. package-script-exists
export const packageScriptExistsChecker: Checker = {
  id: 'package-script-exists',
  description: 'Verifies that referenced npm scripts exist in package.json',
  async run({ documents, projectMetadata, projectRoot }) {
    const findings: Finding[] = [];

    for (const doc of documents) {
      const scriptRefs = doc.artifacts.filter((a) => a.kind === 'script_reference');

      for (const art of scriptRefs) {
        const resolved = resolveReference(art, projectMetadata, projectRoot);
        if (resolved.status === 'unresolved') {
          findings.push(
            createFinding(
              this.id,
              'high',
              `Script "${art.raw}" is referenced in docs but does not exist in package.json`,
              art.location,
              `Add "${art.raw}" to scripts in package.json, or update docs to a valid script.`
            )
          );
        }
      }
    }

    return findings;
  },
};

// 4. export-reference-exists
export const exportReferenceExistsChecker: Checker = {
  id: 'export-reference-exists',
  description: 'Verifies that referenced API symbols are exported by package entrypoints',
  async run({ documents, projectMetadata, projectRoot }) {
    const findings: Finding[] = [];

    for (const doc of documents) {
      const apiRefs = doc.artifacts.filter((a) => a.kind === 'api_reference');

      for (const art of apiRefs) {
        const resolved = resolveReference(art, projectMetadata, projectRoot);
        if (resolved.status === 'unresolved') {
          const modName = art.metadata?.moduleName || 'package';
          findings.push(
            createFinding(
              this.id,
              'high',
              `Symbol "${art.raw}" is referenced in docs but is not exported by module "${modName}"`,
              art.location,
              `Verify that "${art.raw}" is correctly exported from "${modName}".`
            )
          );
        }
      }
    }

    return findings;
  },
};

// 5. env-key-known
export const envKeyKnownChecker: Checker = {
  id: 'env-key-known',
  description: 'Verifies that referenced environment variables are defined in .env.example',
  async run({ documents, projectMetadata, projectRoot }) {
    const findings: Finding[] = [];

    for (const doc of documents) {
      const envRefs = doc.artifacts.filter((a) => a.kind === 'environment_variable');

      for (const art of envRefs) {
        const resolved = resolveReference(art, projectMetadata, projectRoot);
        if (resolved.status === 'unresolved') {
          findings.push(
            createFinding(
              this.id,
              'medium',
              `Environment variable "${art.raw}" is referenced in docs but not defined in .env.example`,
              art.location,
              `Add "${art.raw}=" to .env.example.`
            )
          );
        }
      }
    }

    return findings;
  },
};

// 6. cli-command-known
export const cliCommandKnownChecker: Checker = {
  id: 'cli-command-known',
  description: 'Verifies that commands contain recognized scripts or binaries',
  async run({ documents, projectMetadata, projectRoot }) {
    const findings: Finding[] = [];

    for (const doc of documents) {
      const cmdRefs = doc.artifacts.filter((a) => a.kind === 'command');

      for (const art of cmdRefs) {
        const resolved = resolveReference(art, projectMetadata, projectRoot);
        if (resolved.status === 'unresolved') {
          findings.push(
            createFinding(
              this.id,
              'medium',
              `Command "${art.raw}" contains unrecognized scripts or binaries`,
              art.location,
              `Verify spelling or ensure the corresponding npm script or binary is declared.`
            )
          );
        }
      }
    }

    return findings;
  },
};

// Register all checkers
export const ALL_CHECKERS: Checker[] = [
  syntaxJsTsChecker,
  syntaxJsonYamlChecker,
  packageScriptExistsChecker,
  exportReferenceExistsChecker,
  envKeyKnownChecker,
  cliCommandKnownChecker,
];
