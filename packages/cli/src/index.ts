#!/usr/bin/env node

import { cac } from 'cac';
import * as fs from 'fs';
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
import { reportTerminal, reportJson } from '@docs-guard/reporters';

const cli = cac('docsguard');

cli
  .command('init', 'Create a default docsguard.config.json file')
  .option('--preset <name>', 'Configuration preset (library-ts, cli-ts, etc.)')
  .action((_options) => {
    const projectRoot = process.cwd();
    const configPath = path.resolve(projectRoot, 'docsguard.config.json');

    if (fs.existsSync(configPath)) {
      console.log('✔ Configuration file docsguard.config.json already exists.');
      return;
    }

    const defaultConfig = {
      version: 1,
      include: ['README.md', 'docs/**/*.md', 'examples/**/*'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      failOn: 'high',
      reporters: ['terminal', 'json'],
      output: {
        json: '.docsguard/report.json',
      },
      checkers: {
        'syntax-js-ts': true,
        'syntax-json-yaml': true,
        'package-script-exists': true,
        'export-reference-exists': true,
        'env-key-known': true,
        'cli-command-known': true,
      },
    };

    try {
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf-8');
      console.log('✔ Initialized Docs Guard configuration at docsguard.config.json');
    } catch (err) {
      console.error('✖ Failed to initialize config file:', err);
      process.exit(2);
    }
  });

cli
  .command('scan', 'Discover and parse target files to show extracted artifacts')
  .option('--config <path>', 'Path to config file')
  .action(async (options) => {
    const projectRoot = process.cwd();
    const config = loadConfig(options.config, projectRoot);

    console.log('Scanning documentation files...');
    const startTime = Date.now();

    const files = await discoverFiles({
      include: config.include,
      exclude: config.exclude,
      projectRoot,
    });

    let artifactsCount = 0;
    for (const file of files) {
      try {
        const doc = parseMarkdown(file);
        artifactsCount += doc.artifacts.length;
      } catch (err) {
        console.warn(`Warning: Failed to parse ${file}:`, err);
      }
    }

    const duration = Date.now() - startTime;
    console.log('\nScan completed successfully:');
    console.log(`  Files discovered:    ${files.length}`);
    console.log(`  Artifacts extracted: ${artifactsCount}`);
    console.log(`  Duration:            ${duration}ms\n`);
  });

cli
  .command('check', 'Run full documentation sync checks and verification')
  .option('--config <path>', 'Path to config file')
  .option('--fail-on <severity>', 'Severity threshold to fail the build (info, low, medium, high, critical)')
  .option('--changed-only', 'Only validate files changed in Git relative to base ref')
  .option('--base-ref <ref>', 'Base git reference for changed-only comparison (default: HEAD)')
  .option('--head-ref <ref>', 'Head git reference for changed-only comparison')
  .option('--output-json <path>', 'Path to output JSON report')
  .action(async (options) => {
    const projectRoot = process.cwd();
    const startTime = Date.now();

    const diagnostics: RuntimeDiagnostic[] = [];
    const logDiagnostic = (message: string, severity: 'info' | 'warn' | 'error' = 'info') => {
      diagnostics.push({
        message,
        severity,
        timestamp: new Date().toISOString(),
      });
    };

    logDiagnostic('Loading configuration');
    let config = loadConfig(options.config, projectRoot);
    config = mergeCliOverrides(config, {
      failOn: options.failOn,
      outputJson: options.outputJson,
    });

    logDiagnostic('Running file discovery');
    const files = await discoverFiles({
      include: config.include,
      exclude: config.exclude,
      projectRoot,
      changedOnly: options.changedOnly,
      baseRef: options.baseRef,
      headRef: options.headRef,
    });

    logDiagnostic(`Discovered ${files.length} doc files`);

    logDiagnostic('Analyzing project codebase metadata');
    const projectMetadata = analyzeProject(projectRoot);

    logDiagnostic('Parsing doc documents');
    const documents: ParsedDocument[] = [];
    let totalArtifacts = 0;

    for (const file of files) {
      try {
        const doc = parseMarkdown(file);
        documents.push(doc);
        totalArtifacts += doc.artifacts.length;
      } catch (err: any) {
        logDiagnostic(`Failed to parse ${file}: ${err.message}`, 'error');
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
      filesScanned: files.length, // target doc files
      docsFilesScanned: files.length,
      artifactsExtracted: totalArtifacts,
      findingsBySeverity,
      durationMs,
      passed,
    };

    // 1. Report to Terminal
    reportTerminal(findings, summary);

    // 2. Report to JSON if path configured
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

    // Exit with appropriate code
    if (!passed) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  });

cli.help();
cli.parse();
