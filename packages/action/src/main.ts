import * as core from '@actions/core';
import * as path from 'path';
import {
  loadConfig,
  mergeCliOverrides,
  type Severity,
  type ScanSummary,
  type ScanResult,
  type RuntimeDiagnostic,
  type ParsedDocument,
} from '@docs-guard/core';
import { discoverFiles } from '@docs-guard/collectors';
import { parseMarkdown } from '@docs-guard/parsers';
import { analyzeProject } from '@docs-guard/project-analyzer';
import { runOrchestrator } from '@docs-guard/checkers';
import { reportTerminal, reportJson, reportGithubSummary } from '@docs-guard/reporters';

async function run(): Promise<void> {
  const startTime = Date.now();
  const diagnostics: RuntimeDiagnostic[] = [];
  const logDiagnostic = (message: string, severity: 'info' | 'warn' | 'error' = 'info') => {
    diagnostics.push({
      message,
      severity,
      timestamp: new Date().toISOString(),
    });
  };

  try {
    const projectRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    
    // Read inputs
    const configInput = core.getInput('config') || undefined;
    const failOnInput = (core.getInput('fail-on') || undefined) as Severity | undefined;
    const changedOnlyInput = core.getInput('changed-only') === 'true';
    const baseRefInput = core.getInput('base-ref') || undefined;
    const headRefInput = core.getInput('head-ref') || undefined;
    const writeSummaryInput = core.getInput('write-summary') !== 'false';
    const outputJsonInput = core.getInput('output-json') || undefined;

    logDiagnostic('Loading configuration');
    let config = loadConfig(configInput, projectRoot);
    config = mergeCliOverrides(config, {
      failOn: failOnInput,
      outputJson: outputJsonInput,
    });

    logDiagnostic('Running file discovery');
    const files = await discoverFiles({
      include: config.include,
      exclude: config.exclude,
      projectRoot,
      changedOnly: changedOnlyInput,
      baseRef: baseRefInput,
      headRef: headRefInput,
    });

    logDiagnostic(`Discovered ${files.length} doc files`);

    logDiagnostic('Analyzing project codebase metadata');
    const projectMetadata = analyzeProject(projectRoot);

    logDiagnostic('Parsing documentation files');
    const documents: ParsedDocument[] = [];
    let totalArtifacts = 0;

    for (const file of files) {
      try {
        const doc = parseMarkdown(file);
        documents.push(doc);
        totalArtifacts += doc.artifacts.length;
      } catch (err: any) {
        logDiagnostic(`Failed to parse ${file}: ${err.message}`, 'error');
        core.warning(`Failed to parse file ${file}: ${err.message}`);
      }
    }

    logDiagnostic('Running rule checks and verifications');
    const context = {
      config,
      projectMetadata,
      documents,
      projectRoot,
    };

    const findings = await runOrchestrator(context);

    // Determine status based on severity threshold
    const severityValues: Record<Severity, number> = {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      info: 1,
    };

    const failOnRank = severityValues[config.failOn] || 4; // default high (4)
    let passed = true;
    const findingsBySeverity: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    for (const f of findings) {
      findingsBySeverity[f.severity]++;
      const rank = severityValues[f.severity] || 1;
      if (rank >= failOnRank) {
        passed = false;
      }
    }

    const durationMs = Date.now() - startTime;
    const summary: ScanSummary = {
      filesScanned: files.length,
      docsFilesScanned: files.length,
      artifactsExtracted: totalArtifacts,
      findingsBySeverity,
      durationMs,
      passed,
    };

    // 1. Report to Terminal
    reportTerminal(findings, summary);

    // 2. Write GitHub Step Summary
    if (writeSummaryInput) {
      const summaryMarkdown = reportGithubSummary(findings, summary);
      await core.summary.addRaw(summaryMarkdown).write();
    }

    // 3. Report to JSON if path configured
    const jsonPath = config.output?.json;
    if (jsonPath) {
      const result: ScanResult = {
        summary,
        findings,
        diagnostics,
        version: '1.0.0',
      };
      const absoluteJsonPath = path.resolve(projectRoot, jsonPath);
      reportJson(result, absoluteJsonPath);
    }

    // 4. Set action status outputs
    core.setOutput('passed', passed.toString());
    core.setOutput('files-scanned', files.length.toString());
    core.setOutput('findings-count', findings.length.toString());

    if (!passed) {
      core.setFailed(`Docs Guard found check issues exceeding the "${config.failOn}" severity threshold.`);
    }
  } catch (err: any) {
    core.setFailed(`Docs Guard Action failed: ${err.message}`);
  }
}

run();
