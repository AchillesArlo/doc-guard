import * as fs from 'fs';
import * as path from 'path';
import { type ScanResult } from '@docs-guard/core';

export function reportJson(result: ScanResult, outputPath: string): void {
  try {
    const absolutePath = path.resolve(outputPath);
    const directory = path.dirname(absolutePath);

    // Ensure output folder exists
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(absolutePath, JSON.stringify(result, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error: Failed to write JSON report to ${outputPath}:`, err);
  }
}
