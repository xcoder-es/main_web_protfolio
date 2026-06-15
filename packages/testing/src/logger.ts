import type { LogContext, Logger } from '../../contracts/src/ports.js';

export type MemoryLogEntry = {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
};

export class MemoryLogger implements Logger {
  public readonly entries: MemoryLogEntry[] = [];

  public debug(message: string, context?: LogContext): void {
    this.entries.push({ level: 'debug', message, ...(context ? { context } : {}) });
  }

  public info(message: string, context?: LogContext): void {
    this.entries.push({ level: 'info', message, ...(context ? { context } : {}) });
  }

  public warn(message: string, context?: LogContext): void {
    this.entries.push({ level: 'warn', message, ...(context ? { context } : {}) });
  }

  public error(message: string, context?: LogContext): void {
    this.entries.push({ level: 'error', message, ...(context ? { context } : {}) });
  }
}
