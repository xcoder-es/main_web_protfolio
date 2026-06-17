import type { DatabaseRow } from './gateway.js';

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}

function toCamelCase(value: string): string {
  return value.replace(/_([a-z])/g, (_, character: string) => character.toUpperCase());
}

export function toDatabaseRow<T extends object>(record: T): DatabaseRow {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      toSnakeCase(key),
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}

export function fromDatabaseRow<T>(row: DatabaseRow): T {
  const mapped = Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      const property = toCamelCase(key);
      const mappedValue =
        key.endsWith('_at') && typeof value === 'string' ? new Date(value) : value;
      return [property, mappedValue];
    }),
  );

  return mapped as T;
}
