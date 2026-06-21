# Docs Guard

CI guardrail to ensure open source documentation remains synchronized, valid, and correct relative to the codebase.

Docs Guard acts as a static analysis checker for your Markdown documentation files, checking code snippets, imports, CLI commands, scripts, and environment variables against the real code definition.

---

## Key Features

1. **Syntax Checking**: Automatically validates syntax for JavaScript, TypeScript, JSON, and YAML code blocks inside documentation files.
2. **Export Reference Checker**: Verifies that imported/referenced modules or function symbols actually exist and are exported by the codebase.
3. **Package Script Checker**: Ensures that commands like `npm run <script>` refer to actual scripts declared in `package.json`.
4. **Environment Variables**: Confirms that referenced environment variables (like `process.env.PORT`) are declared in `.env.example`.
5. **CLI Command Checker**: Statically parses shell commands to make sure they refer to valid scripts or recognized binaries.

---

## Installation

Install Docs Guard as a dev dependency in your project:

```bash
# Using npm
npm install --save-dev @docs-guard/cli

# Using pnpm
pnpm add -D @docs-guard/cli

# Using YARN
yarn add --dev @docs-guard/cli
```

---

## CLI Usage

### 1. Initialize Configuration
Generates a default `docsguard.config.json` config file:
```bash
npx docsguard init
```

### 2. Scan Documentation Files
Discovers and extracts documentation artifacts to check what files will be parsed:
```bash
npx docsguard scan
```

### 3. Run Sync Verification
Executes the checkers and performs validation against the codebase:
```bash
npx docsguard check
```

#### CLI Flags
- `--config <path>`: Path to a custom configuration file.
- `--fail-on <severity>`: Severity threshold to fail the build (`info`, `low`, `medium`, `high`, `critical`).
- `--changed-only`: Only check documentation files modified relative to the base ref.
- `--base-ref <ref>`: Base git reference for changed-only comparison (default: HEAD).
- `--head-ref <ref>`: Head git reference for changed-only comparison.
- `--output-json <path>`: Path to output a JSON-formatted scan report.

---

## Configuration Schema

Configure Docs Guard via `docsguard.config.json`:

```json
{
  "version": 1,
  "include": ["README.md", "docs/**/*.md", "examples/**/*"],
  "exclude": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"],
  "failOn": "high",
  "reporters": ["terminal", "json"],
  "output": {
    "json": ".docsguard/report.json"
  },
  "checkers": {
    "syntax-js-ts": true,
    "syntax-json-yaml": true,
    "package-script-exists": true,
    "export-reference-exists": true,
    "env-key-known": true,
    "cli-command-known": true
  },
  "overrides": [
    {
      "files": ["CHANGELOG.md"],
      "disable": ["export-reference-exists"]
    }
  ]
}
```

---

## GitHub Action Integration

Add Docs Guard to your pull request workflows to catch drift before merging:

```yaml
name: Docs Guard CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  docs-guard:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Run Docs Guard
        uses: ./packages/action # Or use the published actions action
        with:
          fail-on: 'high'
          changed-only: 'true'
```

### Action Inputs
- `config`: Path to the config file (optional).
- `fail-on`: Severity threshold to fail the build (default: `high`).
- `changed-only`: Only run validation on changed files in the commit diff (default: `false`).
- `base-ref`: Base git reference.
- `head-ref`: Head git reference.
- `write-summary`: Write scan results to GitHub Step Summary (default: `true`).
- `output-json`: Path to write the JSON scan report.

---

## License

MIT
