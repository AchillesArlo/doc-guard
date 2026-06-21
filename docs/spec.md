# Docs Guard — Master Spec & Execution Document

## Document Status
- Version: 1.0
- Status: Execution-ready specification
- Type: Product + engineering + delivery document
- Purpose: Serve as a single source of truth for building Docs Guard without ambiguity

## Executive Summary
Docs Guard is a CLI and GitHub Action to ensure open-source documentation remains correct, verifiable, and synchronized with the codebase. The tool scans documentation files, extracts code snippets and instructions, maps documentation references to codebase reality, and runs a series of verifications such as syntax validation, script validation, export validation, config validation, and eventually snippet execution.

This document defines product goals, constraints, architecture, file structures, implementation phases, output contracts, usage examples, testing strategies, quality standards, and detailed instructions for consistent execution.

## Table of Contents
1. Product Definition
2. Problem Statement
3. Success Criteria
4. Scope and Non-Goals
5. Personas and Use Cases
6. Functional Requirements
7. Non-Functional Requirements
8. System Architecture
9. Processing Pipeline
10. Rules Engine
11. Data Contracts
12. File and Folder Structure
13. Tech Stack
14. Example User Flows
15. CLI Specification
16. Config Specification
17. GitHub Action Specification
18. Reporting Specification
19. Implementation Plan
20. Testing Strategy
21. Security and Safety
22. Performance Strategy
23. Release Plan
24. Contribution Model
25. Agent Execution Brief
26. Acceptance Criteria
27. Appendix

---

## 1. Product Definition

### 1.1 Product Name
**Docs Guard**

### 1.2 Tagline
**CI guardrail to ensure open source documentation remains synchronized, valid, and correct relative to the codebase.**

### 1.3 Product Definition
Docs Guard is a combination of a **CLI**, a **core rules engine**, and a **GitHub Action** that validates the technical quality of documentation. The primary focus of the product is not markdown grammar or formatting, but rather the **operational validity** of documentation content. The system scans documentation files and implementation examples, extracts commands and technical references, and verifies whether they align with the current state of the codebase.

### 1.4 Addressed Problem Surface
Documentation in open-source projects frequently suffers from *drift* after APIs, commands, configs, or package structures change. The impact is broken onboarding, repetitive issues, loss of trust, and increased maintainer burden. Docs Guard transforms documentation from a passive asset into a verified artifact within the engineering pipeline.

### 1.5 Product Deliverables
The product is split into four primary layers:
- **Core engine** for discovery, parsing, resolution, verification, and reporting.
- **CLI** for local and CI execution.
- **GitHub Action** for automated verification on PRs and pushes.
- **Configuration system** for presets, ignore rules, severity thresholds, and execution modes.

### 1.6 Core Objectives
- Catch documentation discrepancies before merging changes.
- Reduce support issues caused by broken or outdated docs.
- Provide immediately actionable reports for maintainers.
- Be easy to adopt in JavaScript/TypeScript repositories during the initial phase.
- Build the foundation for expansion to multi-language validation and execution sandboxing.

### 1.7 Core Values
- **Actionable**: Reports must identify what is broken, its location, and suggestions to fix it.
- **Low friction**: Initial setup should take only a few minutes.
- **Deterministic**: Verification results must be fully reproducible.
- **Composable**: New checkers can be added without altering the core architecture.
- **Maintainer-first**: Output is optimized for maintainer decision-making.

---

## 2. Problem Statement

### 2.1 Core Problem
In open-source projects, documentation is the product interface. Many users interact with a project for the first time via the README, quick start, examples, migration guides, and documentation sites. When these artifacts are out of sync with the source code, the user experience is broken before they even begin using the software.

### 2.2 Common Symptoms
- README still refers to APIs that have been removed or renamed.
- Installation commands or project scripts are no longer valid.
- Code examples do not match the current package exports.
- Configuration keys in docs do not match the actual schemas.
- Migration guides are incomplete or incorrect after breaking changes.
- The `examples/` directory lags behind the core package versions.

### 2.3 Business and Ecosystem Impact
- New users experience onboarding failures.
- Maintainers receive support issues that could have been prevented.
- Time-to-adoption increases.
- Repository quality reputation declines.
- Pull requests risk being merged despite outdated docs.

### 2.4 Why Existing Solutions Are Insufficient
Markdown linters and link checkers only verify structure, style, and link validity. Unit tests only verify source code behavior, not the accuracy of instructions in the README. Consequently, there is a gap between *code correctness* and *documentation correctness*. Docs Guard is designed specifically to bridge this gap.

### 2.5 Formal Problem Statement
**Technical documentation in open-source repositories lacks a consistent validation mechanism against codebase reality, allowing source code changes to silently invalidate documentation without detection in CI.**

---

## 3. Success Criteria

### 3.1 Product Success Goal
An implementation of Docs Guard is successful if it detects docs drift with a low false-positive rate, integrates easily into maintainer workflows, and produces actionable reports.

### 3.2 MVP Success Metrics

| Metric | MVP Target | Rationale |
|---|---:|---|
| Initial setup time | <= 10 minutes | Minimizes adoption friction |
| Scan time for small-medium repos | <= 15 seconds | Highly viable for CI runs |
| False positive rate on smoke sample | < 10% | Retains maintainer trust |
| Repos scanned without crashes | >= 90% on test corpus | Base stability |
| Core checker coverage | 5 active checkers | Focuses on highest-value rules |

### 3.3 Qualitative KPIs
- Output is easy to read for non-expert maintainers.
- Initial configuration is simple but customizable.
- Architecture is modular enough for additional checkers.
- Docs Guard's own documentation must pass its own checks.

### 3.4 MVP Definition of Done
The MVP is complete if all the following points are met:
1. CLI `init`, `scan`, and `check` run stably.
2. Supports scanning `README.md`, `docs/**/*.md`, and `examples/**/*`.
3. Supports JS/TS documentation validation for: export references, package scripts, command examples, and config keys.
4. Generates terminal summaries and JSON reports.
5. GitHub Action can fail pipelines based on severity thresholds.
6. A minimum of three fixture repositories exist for integration testing.

---

## 4. Scope and Non-Goals

### 4.1 MVP In-Scope
- Primary target: **JavaScript/TypeScript** repositories.
- Target files: `README.md`, `docs/**/*.md`, `examples/**/*`, `CHANGELOG.md`, `MIGRATION.md`, `.env.example`, example config files.
- Core checkers:
  - Markdown code block extraction
  - Syntax validation for basic JS/TS/JSON/YAML
  - Export reference validation
  - Package script validation
  - Basic CLI command reference validation
  - Config key validation
- Output formats:
  - Human-readable CLI report
  - Machine-readable JSON report
  - CI exit codes based on severity

### 4.2 MVP Out-of-Scope
- Full semantic prose understanding.
- Executing complex snippets that require external services.
- AI-based auto-fixes.
- Full support for Python, Go, Rust, Java.
- PR review bot that automatically writes patches.
- Highly complex cross-workspace dependency graph analysis.

### 4.3 Post-MVP Roadmap
- Snippet execution sandbox.
- Multi-language adapters.
- SARIF format output.
- Richer GitHub PR annotations.
- Migration drift intelligence.
- Example synchronization framework.
- Preset frameworks (Next.js, FastAPI, Express, CLIs, etc.).

---

## 5. Personas and Use Cases

### 5.1 Key Personas
- **Solo Maintainer**: Manages small-medium libraries. Needs automated doc sync to ship releases quickly.
- **Core Team Maintainer**: Works on repositories receiving many PRs. Needs a CI guardrail to prevent code changes from silently breaking docs.
- **OSS Contributor**: Wants to ensure their changes do not break quick starts or examples.
- **Developer Relations / Docs Owner**: Responsible for onboarding quality; wants objective indicators of documentation health.

### 5.2 Jobs-To-Be-Done
- "When I modify an API, I want to know which documentation sections are affected."
- "When reviewing PRs, I want docs to be validated automatically without complete manual review."
- "When releasing a new version, I want to guarantee quick starts and examples still work."
- "When users copy-paste from the README, I want the failure rate to be near zero."

### 5.3 Primary Use Cases

| Use Case | Description | Priority |
|---|---|---|
| Pre-merge docs regression check | Validates documentation changes in PRs | P0 |
| Pre-release docs verification | Verifies docs prior to publishing packages | P0 |
| Local maintainer validation | Local checks run by maintainers during editing | P0 |
| Example drift detection | Detects when examples fall behind package versions | P1 |
| Migration guide validation | Marks out-of-sync upgrade instructions | P1 |
| Machine-readable reporting | Integrates results with other workflow tools | P1 |

---

## 6. Functional Requirements

### 6.1 Discovery Requirements
The system must discover target files based on default globs and user configurations.
- Default targets: `README.md`, `docs/**/*.md`, `examples/**/*`, `CHANGELOG.md`, `MIGRATION.md`, `.env.example`, example configurations.
- Ignore binary files.
- Ignore `node_modules`, `dist`, `build`, `.git`, `.next`, and `coverage` by default.
- Support include/exclude patterns in configurations.
- Support `changed-only` mode for diff-based CI checks.

### 6.2 Parsing Requirements
The system must parse markdown files and examples into a stable intermediate representation (IR).
- Markdown parser must extract: heading hierarchy, paragraph context, fenced code blocks, inline code, list item text, table cells, and accurate source locations (file, start line, end line).
- Identify artifacts: shell commands, import statements, exported symbol references, config keys, package manager commands, and CLI invocations.

### 6.3 Classification Requirements
Each extracted item must be classified into at least one of these types:
- `command`, `code_snippet`, `config_example`, `api_reference`, `script_reference`, `migration_instruction`, `environment_variable`.

### 6.4 Resolution Requirements
Map documentation references to codebase reality:
- Import symbols in docs -> Live exports from packages.
- `npm run build` -> Script `build` in `package.json`.
- Env vars in docs -> Keys in `.env.example` or config schemas.
- CLI commands -> Declared project binaries/subcommands.

### 6.5 Verification Requirements (MVP Checkers)
- **Syntax Checker**: Checks JS, TS, JSON, and YAML syntax.
- **Export Reference Checker**: Verifies referenced symbols are exported by the package entry points.
- **Package Script Checker**: Confirms referenced scripts exist in `package.json`.
- **Command Checker**: Statically validates common commands (install, run, exec, CLI flags).
- **Config Key Checker**: Validates configuration keys and env vars against schemas or examples.

---

## 7. Non-Functional Requirements

### 7.1 Reliability
- Do not crash on unrecognized files; fail gracefully.
- Parse errors in one file must not halt the entire scan unless strict mode is enabled.
- Identical inputs must yield deterministic results.

### 7.2 Performance
- Verify small-medium repos quickly for CI checks.
- Support controlled concurrency for parsing and checks.
- Use a `changed-only` mode to optimize pull request scans.

### 7.3 Extensibility
- Simple interfaces for adding checkers.
- Support for parsing other file types without core refactoring.
- Standardized reporter contracts.

### 7.4 Usability
- Concise and clear CLI output.
- Summaries must state pass/fail status, counts by severity, and primary error locations.
- Simple installation and setup instructions.

---

## 8. System Architecture

### 8.1 Logical Architecture
Docs Guard uses a modular pipeline architecture. Each stage processes structured inputs and yields structured outputs to ensure modular testing and easy upgrades.

### 8.2 Core Components

| Component | Responsibility | Output |
|---|---|---|
| Collector | Discovers target files | List of files |
| Parser | Converts files to AST/IR | Document IR |
| Classifier | Categorizes extracted items | Classified items |
| Resolver | Maps references to codebase | Resolved references |
| Verifier | Executes validation rules | Findings |
| Reporter | Formats and outputs results | CLI/JSON summary |
| Config Loader | Loads and merges options | Runtime config |
| Project Analyzer | Analyzes packages, exports, and schemas | Project metadata |

---

## 9. Processing Pipeline

### 9.1 Pipeline Execution Sequence
1. Load configuration.
2. Discover files.
3. Analyze project metadata.
4. Parse documents and examples.
5. Classify extracted artifacts.
6. Resolve references against codebase.
7. Run checkers.
8. Aggregate findings.
9. Render reports.
10. Exit with code.

---

## 10. Rules Engine

### 10.1 Checker Interface
```ts
interface Checker {
  id: string
  description: string
  supports(input: CheckerContext): boolean
  run(input: CheckerContext): Promise<Finding[]>
}
```

### 10.2 MVP Checker Registries
- `syntax-js-ts` (severity: high)
- `syntax-json-yaml` (severity: medium)
- `package-script-exists` (severity: high)
- `export-reference-exists` (severity: high)
- `env-key-known` (severity: medium)
- `cli-command-known` (severity: medium)

---

## 11. Data Contracts

```ts
export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface SourceLocation {
  filePath: string
  startLine: number
  endLine: number
  startColumn?: number
  endColumn?: number
}

export interface ExtractedArtifact {
  id: string
  kind: 'command' | 'code_snippet' | 'config_example' | 'api_reference' | 'script_reference' | 'migration_instruction' | 'environment_variable'
  language?: string
  raw: string
  normalized?: string
  headingPath: string[]
  location: SourceLocation
  metadata?: Record<string, unknown>
}

export interface Finding {
  id: string
  checkerId: string
  severity: Severity
  message: string
  suggestion?: string
  location: SourceLocation
  excerpt?: string
  docsReference?: string
  metadata?: Record<string, unknown>
}
```

---

## 12. File and Folder Structure
Refer to the monorepo structure in the codebase root containing `packages/core`, `packages/collectors`, `packages/parsers`, `packages/project-analyzer`, `packages/resolvers`, `packages/checkers`, `packages/reporters`, `packages/cli`, and `packages/action`.

---

## 13. Tech Stack
- Core implementation: TypeScript
- Runtime: Node.js LTS
- Package manager: pnpm
- Testing: Vitest
- Parser: Unified/Remark ecosystem

---

## 14. CLI Specification
- `docsguard init`: Initializes configuration.
- `docsguard scan`: Discovers and parses documentation.
- `docsguard check`: Runs the full verification pipeline.
- `docsguard report`: Re-formats JSON scan outputs.

---

## 15. Config Specification
Configured via `docsguard.config.json` defining includes, excludes, active checkers, and pattern-based overrides.

---

## 16. GitHub Action Specification
Wraps the programmatic API to run within pull requests and commits, printing stdout reports and posting step summaries.

---

## 17. Acceptance Criteria
- Easily installable and executable.
- Low false-positive rates on internal checks.
- Generates valid CLI stdout and JSON contract reports.
- Works correctly locally and in GitHub workflows.
