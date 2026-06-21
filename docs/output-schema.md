# Docs Guard JSON Output Schema

When running Docs Guard with `--format json` or specifying `output.json` in the configuration file, the tool generates a structured, machine-readable JSON document. 

This contract is stable and versioned (`version: "1.0.0"`). It is designed to be easily parsed by scripts, external reporter APIs, or notification systems (like Slack/Discord bots).

---

## ScanResult Schema Properties

The output JSON file represents a single `ScanResult` object with the following top-level fields:

### `version` (string)
The schema version of the output (e.g., `"1.0.0"`).

### `summary` (ScanSummary)
Aggregated metrics and final outcome of the scan session.
- `filesScanned` (number): Count of all source files considered during matching.
- `docsFilesScanned` (number): Count of documentation files successfully parsed.
- `artifactsExtracted` (number): Count of code blocks, scripts, command templates, and imports detected in docs.
- `durationMs` (number): Total pipeline execution duration in milliseconds.
- `passed` (boolean): `true` if no findings exceeded the configured severity threshold; otherwise, `false`.
- `findingsBySeverity` (object): Map of severity keys to their respective counts:
  - `critical` (number)
  - `high` (number)
  - `medium` (number)
  - `low` (number)
  - `info` (number)

### `findings` (Finding[])
A list of all detected issues that match configuration parameters. Each finding contains:
- `id` (string): Unique identifier for deduplication purposes.
- `checkerId` (string): The rule identifier (e.g., `"export-reference-exists"`).
- `severity` (string): Severity level (`"info" | "low" | "medium" | "high" | "critical"`).
- `message` (string): Detailed human-readable explanation of the issue.
- `suggestion` (string, optional): Recommended resolution action.
- `location` (SourceLocation): Position of the documentation drift:
  - `filePath` (string): Path to the scanned documentation file relative to the project root.
  - `startLine` (number): 1-indexed start line of the violation context.
  - `endLine` (number): 1-indexed end line of the violation context.
  - `startColumn` (number, optional): Start column position.
  - `endColumn` (number, optional): End column position.
- `excerpt` (string, optional): Relevant context snippet extracted from the file.

### `diagnostics` (RuntimeDiagnostic[])
System-level warnings or operational errors encountered during execution (e.g., parsing failures or workspace directory errors).
- `message` (string): The error message.
- `severity` (string): The system diagnostic type (`"info" | "warn" | "error"`).
- `timestamp` (string): ISO 8601 formatted datetime string of the occurrence.

---

## Example Scan Output JSON

```json
{
  "version": "1.0.0",
  "summary": {
    "filesScanned": 12,
    "docsFilesScanned": 5,
    "artifactsExtracted": 34,
    "findingsBySeverity": {
      "critical": 0,
      "high": 1,
      "medium": 1,
      "low": 0,
      "info": 0
    },
    "durationMs": 85,
    "passed": false
  },
  "findings": [
    {
      "id": "F-a9d8",
      "checkerId": "export-reference-exists",
      "severity": "high",
      "message": "Symbol \"createDocsGuard\" is referenced in docs but is not exported by module \"@docs-guard/core\"",
      "suggestion": "Verify that \"createDocsGuard\" is correctly exported from the module entrypoint.",
      "location": {
        "filePath": "README.md",
        "startLine": 48,
        "endLine": 48
      }
    },
    {
      "id": "F-04ef",
      "checkerId": "env-key-known",
      "severity": "medium",
      "message": "Environment variable \"DATABASE_PORT\" is referenced in docs but not defined in .env.example",
      "suggestion": "Add \"DATABASE_PORT=\" to .env.example.",
      "location": {
        "filePath": "docs/setup.md",
        "startLine": 12,
        "endLine": 12
      }
    }
  ],
  "diagnostics": [
    {
      "message": "Failed to fetch changed files via Git. Falling back to full scan. Error: Not a git repository",
      "severity": "warn",
      "timestamp": "2026-06-21T03:55:10.123Z"
    }
  ]
}
```
