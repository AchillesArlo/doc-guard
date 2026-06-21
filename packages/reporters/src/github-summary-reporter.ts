import { type Finding, type ScanSummary, type Severity } from '@docs-guard/core';

export function reportGithubSummary(findings: Finding[], summary: ScanSummary): string {
  const lines: string[] = [];

  lines.push('# Docs Guard Scan Results');
  lines.push('');

  if (summary.passed) {
    lines.push('## ✅ Passed');
    lines.push('No documentation sync issues detected! Your docs are synchronized with the codebase.');
  } else {
    lines.push('## ❌ Failed');
    lines.push('Documentation sync issues were detected. Please address the findings below.');
  }
  lines.push('');

  // Summary Table
  lines.push('### Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('| :--- | :--- |');
  lines.push(`| **Files Scanned** | ${summary.filesScanned} |`);
  lines.push(`| **Docs Files Scanned** | ${summary.docsFilesScanned} |`);
  lines.push(`| **Artifacts Extracted** | ${summary.artifactsExtracted} |`);
  
  const totalFindings = Object.values(summary.findingsBySeverity).reduce((sum, count) => sum + count, 0);
  lines.push(`| **Total Findings** | ${totalFindings} |`);
  
  // Severity counts breakdown
  const sevBreakdown = Object.entries(summary.findingsBySeverity)
    .filter(([_, count]) => count > 0)
    .map(([sev, count]) => `${getSeverityEmoji(sev as Severity)} **${sev}**: ${count}`)
    .join(', ');
  
  lines.push(`| **Findings Breakdown** | ${sevBreakdown || 'None'} |`);
  lines.push(`| **Duration** | ${(summary.durationMs / 1000).toFixed(2)}s |`);
  lines.push('');

  if (findings.length > 0) {
    lines.push('### Findings Detail');
    lines.push('');

    // Group findings by file
    const fileGroups = new Map<string, Finding[]>();
    for (const f of findings) {
      const list = fileGroups.get(f.location.filePath) || [];
      list.push(f);
      fileGroups.set(f.location.filePath, list);
    }

    const limit = 50;
    let printedCount = 0;
    let limitReached = false;

    for (const [filePath, fileFindings] of fileGroups.entries()) {
      if (limitReached) break;

      lines.push(`<details open>`);
      lines.push(`<summary>📄 <b>${filePath}</b> (${fileFindings.length} issues)</summary>`);
      lines.push('');
      lines.push('| Severity | Line | Rule | Message | Suggestion |');
      lines.push('| :--- | :---: | :--- | :--- | :--- |');

      for (const f of fileFindings) {
        if (printedCount >= limit) {
          limitReached = true;
          break;
        }

        const sevEmoji = getSeverityEmoji(f.severity);
        const sevText = `[${f.severity.toUpperCase()}]`;
        const lineStr = f.location.startLine === f.location.endLine
          ? `${f.location.startLine}`
          : `${f.location.startLine}-${f.location.endLine}`;

        const escapeMarkdown = (text: string) => text.replace(/\|/g, '\\|');
        const escapedMessage = escapeMarkdown(f.message);
        const escapedSuggestion = f.suggestion ? escapeMarkdown(f.suggestion) : '';

        lines.push(`| ${sevEmoji} ${sevText} | ${lineStr} | \`${f.checkerId}\` | ${escapedMessage} | ${escapedSuggestion} |`);
        printedCount++;
      }

      lines.push('');
      lines.push(`</details>`);
      lines.push('');
    }

    if (limitReached && findings.length > limit) {
      lines.push(`> ⚠️ **Showing only the first ${limit} findings.** Please run \`docsguard check\` locally to see all findings.`);
      lines.push('');
    }
  }

  return lines.join('\n');
}

function getSeverityEmoji(severity: Severity): string {
  switch (severity) {
    case 'critical':
    case 'high':
      return '🔴';
    case 'medium':
      return '🟡';
    case 'low':
      return '🔵';
    case 'info':
    default:
      return '⚪';
  }
}
