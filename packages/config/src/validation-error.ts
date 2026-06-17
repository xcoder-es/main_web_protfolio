import type { z } from 'zod';

export class ConfigurationError extends Error {
  public readonly issues: readonly { path: string; message: string }[];

  public constructor(error: z.ZodError) {
    const issues = error.issues.map((issue) => ({
      path: issue.path.join('.') || 'configuration',
      message: issue.message,
    }));

    super(
      `Invalid configuration: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`,
    );
    this.name = 'ConfigurationError';
    this.issues = issues;
  }
}
