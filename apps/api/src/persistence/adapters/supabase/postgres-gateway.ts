import { AsyncLocalStorage } from 'node:async_hooks';

import postgres, { type Sql, type TransactionSql } from 'postgres';

import type { ServiceProbe } from '../../../application/readiness.js';
import type { PersistenceBundle } from '../../../composition.js';
import type { DatabaseFilter, DatabaseOrder, DatabaseRow, SupabaseGateway } from './gateway.js';
import { createSupabasePersistence } from './supabase-persistence.js';

const identifierPattern = /^[a-z][a-z0-9_]*$/;

type RootQueryClient = Sql<Record<string, unknown>>;
type QueryClient = RootQueryClient | TransactionSql<Record<string, unknown>>;

class PostgresSupabaseGateway implements SupabaseGateway {
  public constructor(
    private readonly sql: QueryClient,
    private readonly transactionContext: AsyncLocalStorage<QueryClient>,
  ) {}

  public async insert(table: string, row: DatabaseRow): Promise<DatabaseRow> {
    const client = this.client();
    const rows = await client<DatabaseRow[]>`
      insert into ${this.identifier(table)} ${client(row)}
      returning *
    `;
    return requireSingleRow(rows, table);
  }

  public async update(table: string, id: string, row: DatabaseRow): Promise<DatabaseRow> {
    const client = this.client();
    const rows = await client<DatabaseRow[]>`
      update ${this.identifier(table)}
      set ${client(row)}
      where id = ${id}
      returning *
    `;
    return requireSingleRow(rows, table);
  }

  public async selectOne(
    table: string,
    filters: readonly DatabaseFilter[],
  ): Promise<DatabaseRow | null> {
    const rows = await this.select(table, filters, [], 1);
    return rows[0] ?? null;
  }

  public selectMany(
    table: string,
    filters: readonly DatabaseFilter[] = [],
    order: readonly DatabaseOrder[] = [],
  ): Promise<readonly DatabaseRow[]> {
    return this.select(table, filters, order);
  }

  public async ping(): Promise<void> {
    await this.client()`select 1`;
  }

  private async select(
    table: string,
    filters: readonly DatabaseFilter[],
    order: readonly DatabaseOrder[],
    limit?: number,
  ): Promise<readonly DatabaseRow[]> {
    const client = this.client();
    const where = filters.length > 0 ? client`where ${this.filters(filters)}` : client``;
    const ordering = order.length > 0 ? client`order by ${this.order(order)}` : client``;
    const bounded = limit ? client`limit ${limit}` : client``;
    return client<DatabaseRow[]>`
      select * from ${this.identifier(table)}
      ${where}
      ${ordering}
      ${bounded}
    `;
  }

  private filters(filters: readonly DatabaseFilter[]) {
    const client = this.client();
    return filters.reduce(
      (fragment, filter, index) =>
        index === 0
          ? client`${this.identifier(filter.column)} = ${filter.value}`
          : client`${fragment} and ${this.identifier(filter.column)} = ${filter.value}`,
      client``,
    );
  }

  private order(order: readonly DatabaseOrder[]) {
    const client = this.client();
    return order.reduce(
      (fragment, item, index) => {
        const direction = item.ascending ? client`asc` : client`desc`;
        return index === 0
          ? client`${this.identifier(item.column)} ${direction}`
          : client`${fragment}, ${this.identifier(item.column)} ${direction}`;
      },
      client``,
    );
  }

  private identifier(value: string) {
    if (!identifierPattern.test(value)) throw new Error(`Invalid database identifier: ${value}`);
    return this.client()(value);
  }

  private client(): QueryClient {
    return this.transactionContext.getStore() ?? this.sql;
  }
}

class PostgresTransactionRunner {
  public constructor(
    private readonly sql: RootQueryClient,
    private readonly transactionContext: AsyncLocalStorage<QueryClient>,
  ) {}

  public async execute<T>(work: () => Promise<T>): Promise<T> {
    const transaction = await this.sql.begin(async (client) => ({
      result: await this.transactionContext.run(client, work),
    }));
    return transaction.result;
  }
}

export function createPostgresSupabasePersistence(databaseUrl: string): PersistenceBundle {
  const sql = postgres(databaseUrl, {
    connect_timeout: 10,
    idle_timeout: 20,
    max: 5,
    ssl: 'require',
  });
  const transactionContext = new AsyncLocalStorage<QueryClient>();
  const gateway = new PostgresSupabaseGateway(sql, transactionContext);
  const persistence = createSupabasePersistence(
    gateway,
    new PostgresTransactionRunner(sql, transactionContext),
  );
  return {
    ...persistence,
    probe: databaseProbe(gateway),
    close: () => sql.end({ timeout: 5 }),
  };
}

function databaseProbe(gateway: PostgresSupabaseGateway): ServiceProbe {
  return {
    name: 'persistence',
    required: true,
    async run() {
      await gateway.ping();
      return { name: 'persistence', ok: true, required: true, state: 'ready' as const };
    },
  };
}

function requireSingleRow(rows: readonly DatabaseRow[], table: string): DatabaseRow {
  const row = rows[0];
  if (!row) throw new Error(`No database row returned for ${table}`);
  return row;
}
