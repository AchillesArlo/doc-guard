export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export interface SourceLocation {
  filePath: string;
  startLine: number;
  endLine: number;
  startColumn?: number;
  endColumn?: number;
}

export interface ExtractedArtifact {
  id: string;
  kind:
    | 'command'
    | 'code_snippet'
    | 'config_example'
    | 'api_reference'
    | 'script_reference'
    | 'migration_instruction'
    | 'environment_variable';
  language?: string;
  raw: string;
  normalized?: string;
  headingPath: string[];
  location: SourceLocation;
  metadata?: Record<string, unknown>;
}

export interface ResolvedReference {
  artifactId: string;
  status: 'resolved' | 'unresolved' | 'partial';
  targetType?: 'export' | 'script' | 'config_key' | 'cli_command' | 'env_var';
  targetPath?: string;
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface Finding {
  id: string;
  checkerId: string;
  severity: Severity;
  message: string;
  suggestion?: string;
  location: SourceLocation;
  excerpt?: string;
  docsReference?: string;
  metadata?: Record<string, unknown>;
}

export interface ParseDiagnostic {
  message: string;
  location?: SourceLocation;
}

export interface ParsedDocument {
  filePath: string;
  contentHash: string;
  headings: { depth: number; text: string; line: number }[];
  artifacts: ExtractedArtifact[];
  diagnostics: ParseDiagnostic[];
}

export interface ProjectMetadata {
  packageName?: string;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'unknown';
  scripts: Record<string, string>;
  exportsMap: Record<string, string[]>;
  binaries: string[];
  configKeys: string[];
  envKeys: string[];
  tsconfigPaths?: Record<string, string[]>;
}

export interface ScanSummary {
  filesScanned: number;
  docsFilesScanned: number;
  artifactsExtracted: number;
  findingsBySeverity: Record<Severity, number>;
  durationMs: number;
  passed: boolean;
}

export interface RuntimeDiagnostic {
  message: string;
  severity: 'info' | 'warn' | 'error';
  timestamp: string;
}

export interface ScanResult {
  summary: ScanSummary;
  findings: Finding[];
  diagnostics: RuntimeDiagnostic[];
  version: string;
}
