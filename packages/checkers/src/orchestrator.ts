import {
  type Finding,
  type Severity,
} from '@docs-guard/core';
import { ALL_CHECKERS, type CheckerContext } from './rules.js';

export async function runOrchestrator(context: CheckerContext): Promise<Finding[]> {
  const { config } = context;

  // Filter active checkers based on config
  const activeCheckers = ALL_CHECKERS.filter((checker) => {
    // If explicitly set to false, it is disabled. Default is enabled.
    return config.checkers[checker.id] !== false;
  });

  // Run active checkers in parallel
  const allFindingsPromises = activeCheckers.map(async (checker) => {
    try {
      return await checker.run(context);
    } catch (err) {
      console.error(`Error running checker "${checker.id}":`, err);
      return [];
    }
  });

  const rawFindingsArray = await Promise.all(allFindingsPromises);
  let findings = rawFindingsArray.flat();

  // Apply overrides based on files pattern
  if (config.overrides && config.overrides.length > 0) {
    findings = findings.filter((finding) => {
      let isIgnored = false;

      for (const override of config.overrides || []) {
        // Check if file matches patterns
        const matchesFile = override.files.some((pattern) =>
          matchGlob(finding.location.filePath, pattern)
        );

        if (matchesFile) {
          // Check if rule is disabled for this file
          if (override.disable && override.disable.includes(finding.checkerId)) {
            isIgnored = true;
            break;
          }

          // Check if severity is overridden
          if (override.overrides && override.overrides[finding.checkerId] !== undefined) {
            finding.severity = override.overrides[finding.checkerId] as Severity;
          }
        }
      }

      return !isIgnored;
    });
  }

  // Deduplicate identical findings
  const seen = new Set<string>();
  findings = findings.filter((f) => {
    const key = `${f.checkerId}-${f.location.filePath}-${f.location.startLine}-${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort findings: file path alphabetically, start line ascending, checker ID alphabetically
  findings.sort((a, b) => {
    if (a.location.filePath !== b.location.filePath) {
      return a.location.filePath.localeCompare(b.location.filePath);
    }
    if (a.location.startLine !== b.location.startLine) {
      return a.location.startLine - b.location.startLine;
    }
    // Severity mapping value
    const severityValues: Record<Severity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };
    const valA = severityValues[a.severity] || 0;
    const valB = severityValues[b.severity] || 0;
    if (valA !== valB) {
      return valB - valA; // High severity first
    }
    return a.checkerId.localeCompare(b.checkerId);
  });

  return findings;
}

// Simple glob matching function converts globs to regular expressions
function matchGlob(filePath: string, pattern: string): boolean {
  // Normalize windows backslashes
  const normPath = filePath.replace(/\\/g, '/');
  const normPattern = pattern.replace(/\\/g, '/');

  // Convert glob to regex
  // Escape regex special chars except * and ?
  let regexStr = normPattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape special characters
    .replace(/\*\*/g, '.*')               // double asterisk matches anything
    .replace(/(?<!\.)\*/g, '[^/]*')       // single asterisk matches non-slash chars
    .replace(/\?/g, '.');                 // question mark matches single char

  // Match full string
  const regex = new RegExp(`^${regexStr}$`);

  // Try matching absolute pattern or relative path suffix
  if (regex.test(normPath)) return true;

  // Check if suffix matches relative glob
  // e.g. "CHANGELOG.md" matching "**/CHANGELOG.md" or similar
  const pathParts = normPath.split('/');
  for (let i = 0; i < pathParts.length; i++) {
    const subpath = pathParts.slice(i).join('/');
    if (regex.test(subpath)) return true;
  }

  return false;
}
