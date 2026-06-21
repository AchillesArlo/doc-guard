import { type Finding, type ScanSummary, type Severity } from '@docs-guard/core';

// Lightweight ANSI styling helper
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function style(text: string, color: keyof typeof colors): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export function reportTerminal(findings: Finding[], summary: ScanSummary): void {
  console.log('\n' + style('Docs Guard Scan Results', 'bold') + '\n' + style('═'.repeat(40), 'dim'));

  if (findings.length === 0) {
    console.log(style('✔ No issues found. Your documentation is fully synchronized!', 'green'));
  } else {
    // Group findings by file
    const fileGroups = new Map<string, Finding[]>();
    for (const f of findings) {
      const list = fileGroups.get(f.location.filePath) || [];
      list.push(f);
      fileGroups.set(f.location.filePath, list);
    }

    for (const [filePath, fileFindings] of fileGroups.entries()) {
      console.log(`\n📄 ${style(filePath, 'cyan')}`);
      
      for (const f of fileFindings) {
        const severityColor = getSeverityColor(f.severity);
        const severityTag = style(`[${f.severity.toUpperCase()}]`, severityColor);
        const ruleTag = style(f.checkerId, 'gray');
        
        console.log(`  ${severityTag} ${ruleTag} at line ${f.location.startLine}`);
        console.log(`    ${style(f.message, 'bold')}`);
        
        if (f.suggestion) {
          console.log(`    💡 Suggestion: ${f.suggestion}`);
        }
        console.log();
      }
    }
  }

  console.log(style('═'.repeat(40), 'dim'));
  console.log(style('Scan Summary:', 'bold'));
  console.log(`  Files scanned:       ${summary.filesScanned}`);
  console.log(`  Docs files scanned:  ${summary.docsFilesScanned}`);
  console.log(`  Artifacts extracted: ${summary.artifactsExtracted}`);
  
  const findingsSummary = Object.entries(summary.findingsBySeverity)
    .filter(([_, count]) => count > 0)
    .map(([sev, count]) => {
      const color = getSeverityColor(sev as Severity);
      return style(`${count} ${sev}`, color);
    })
    .join(', ');

  console.log(`  Findings:            ${findingsSummary || style('0', 'green')}`);
  console.log(`  Duration:            ${summary.durationMs}ms`);
  
  const statusStr = summary.passed 
    ? style('PASSED', 'green') 
    : style('FAILED', 'red');

  console.log(`\nResult: ${statusStr}\n`);
}

function getSeverityColor(severity: Severity): keyof typeof colors {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'high':
      return 'red';
    case 'medium':
      return 'yellow';
    case 'low':
      return 'cyan';
    case 'info':
      return 'gray';
    default:
      return 'reset';
  }
}
