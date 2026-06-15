export type DatabaseRow = Readonly<Record<string, unknown>>;

export type DatabaseFilter = {
  column: string;
  value: string | number | boolean | null;
};

export type DatabaseOrder = {
  column: string;
  ascending: boolean;
};

export interface SupabaseGateway {
  insert(table: string, row: DatabaseRow): Promise<DatabaseRow>;
  update(table: string, id: string, row: DatabaseRow): Promise<DatabaseRow>;
  selectOne(table: string, filters: readonly DatabaseFilter[]): Promise<DatabaseRow | null>;
  selectMany(
    table: string,
    filters?: readonly DatabaseFilter[],
    order?: readonly DatabaseOrder[],
  ): Promise<readonly DatabaseRow[]>;
}

export interface TransactionRunner {
  execute<T>(work: () => Promise<T>): Promise<T>;
}
