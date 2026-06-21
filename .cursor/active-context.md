> **BrainSync Context Pumper** 🧠
> Dynamically loaded for active file: `.gitignore` (Domain: **Generic Logic**)

### 📐 Generic Logic Conventions & Fixes
- **[discovery] 13 potentially unused files detected**: These files are not imported by any other file in the codebase and may be dead code:
  • orchestrator.ts
  • rules.ts
  • discovery.ts
  • loader.ts
  • schema.ts
  • types.ts
  • markdown-parser.ts
  • exports-analyzer.ts
  • package-json.ts
  • json-reporter.ts
  • terminal-reporter.ts
  • resolver.ts
  • vitest.config.ts

Consider verifying if they are entry points, dynamically required, or can be safely removed.
