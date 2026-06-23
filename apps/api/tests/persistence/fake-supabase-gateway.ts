import type {
  DatabaseFilter,
  DatabaseOrder,
  DatabaseRow,
  SupabaseGateway,
  TransactionRunner,
} from '../../src/persistence/adapters/supabase/gateway.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

function matches(row: DatabaseRow, filters: readonly DatabaseFilter[]): boolean {
  return filters.every((filter) => row[filter.column] === filter.value);
}

export class FakeSupabaseGateway implements SupabaseGateway {
  private tables = new Map<string, Map<string, DatabaseRow>>();

  public async insert(table: string, row: DatabaseRow): Promise<DatabaseRow> {
    const id = row.id;
    if (typeof id !== 'string') throw new Error(`Missing row id for ${table}`);
    const rows = this.getTable(table);
    if (rows.has(id)) throw new Error(`Duplicate row id: ${id}`);
    rows.set(id, clone(row));
    return clone(row);
  }

  public async update(table: string, id: string, row: DatabaseRow): Promise<DatabaseRow> {
    const rows = this.getTable(table);
    if (!rows.has(id)) throw new Error(`Row not found: ${table}/${id}`);
    rows.set(id, clone(row));
    return clone(row);
  }

  public async selectOne(
    table: string,
    filters: readonly DatabaseFilter[],
  ): Promise<DatabaseRow | null> {
    const row = [...this.getTable(table).values()].find((candidate) => matches(candidate, filters));
    return row ? clone(row) : null;
  }

  public async selectMany(
    table: string,
    filters: readonly DatabaseFilter[] = [],
    order: readonly DatabaseOrder[] = [],
  ): Promise<readonly DatabaseRow[]> {
    const rows = [...this.getTable(table).values()].filter((row) => matches(row, filters));
    rows.sort((left, right) => {
      for (const ordering of order) {
        const leftValue = left[ordering.column];
        const rightValue = right[ordering.column];
        if (leftValue === rightValue) continue;
        const direction = ordering.ascending ? 1 : -1;
        return String(leftValue).localeCompare(String(rightValue)) * direction;
      }
      return 0;
    });
    return rows.map(clone);
  }

  public snapshot(): Map<string, Map<string, DatabaseRow>> {
    return clone(this.tables);
  }

  public restore(snapshot: Map<string, Map<string, DatabaseRow>>): void {
    this.tables = clone(snapshot);
  }

  private getTable(table: string): Map<string, DatabaseRow> {
    const existing = this.tables.get(table);
    if (existing) return existing;
    const created = new Map<string, DatabaseRow>();
    this.tables.set(table, created);
    return created;
  }
}

export class FakeTransactionRunner implements TransactionRunner {
  public executions = 0;

  public constructor(private readonly gateway: FakeSupabaseGateway) {}

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    this.executions += 1;
    const snapshot = this.gateway.snapshot();
    try {
      return await work();
    } catch (error) {
      this.gateway.restore(snapshot);
      throw error;
    }
  }
}
