import { z } from 'zod';

export const SeveritySchema = z.enum(['info', 'low', 'medium', 'high', 'critical']);

export const CheckerConfigSchema = z.record(z.boolean());

export const OverrideConfigSchema = z.object({
  files: z.array(z.string()),
  disable: z.array(z.string()).optional(),
  enable: z.array(z.string()).optional(),
  overrides: z.record(SeveritySchema).optional(),
});

export const DocsGuardConfigSchema = z.object({
  version: z.number().int().default(1),
  include: z.array(z.string()).default(['README.md', 'docs/**/*.md', 'examples/**/*']),
  exclude: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']),
  failOn: SeveritySchema.default('high'),
  reporters: z.array(z.string()).default(['terminal']),
  output: z.object({
    json: z.string().optional(),
    markdown: z.string().optional(),
  }).optional(),
  checkers: z.record(z.boolean()).default({
    'syntax-js-ts': true,
    'syntax-json-yaml': true,
    'package-script-exists': true,
    'export-reference-exists': true,
    'env-key-known': true,
    'cli-command-known': true,
  }),
  overrides: z.array(OverrideConfigSchema).optional(),
});

export type DocsGuardConfig = z.infer<typeof DocsGuardConfigSchema>;
export type OverrideConfig = z.infer<typeof OverrideConfigSchema>;
