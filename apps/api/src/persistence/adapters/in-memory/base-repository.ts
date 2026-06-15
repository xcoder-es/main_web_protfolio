import type { Repository } from '../../application/ports.js';

function clone<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryRepository<T extends { id: string }> implements Repository<T> {
  protected rows = new Map<string, T>();

  public async insert(record: T): Promise<void> {
    if (this.rows.has(record.id)) throw new Error(`Duplicate record id: ${record.id}`);
    this.rows.set(record.id, clone(record));
  }

  public async update(record: T): Promise<void> {
    if (!this.rows.has(record.id)) throw new Error(`Record not found: ${record.id}`);
    this.rows.set(record.id, clone(record));
  }

  public async getById(id: string): Promise<T | null> {
    const record = this.rows.get(id);
    return record ? clone(record) : null;
  }

  public async list(): Promise<readonly T[]> {
    return [...this.rows.values()].map(clone);
  }

  public snapshot(): Map<string, T> {
    return new Map([...this.rows.entries()].map(([id, record]) => [id, clone(record)]));
  }

  public restore(snapshot: Map<string, T>): void {
    this.rows = new Map([...snapshot.entries()].map(([id, record]) => [id, clone(record)]));
  }

  protected async find(predicate: (record: T) => boolean): Promise<T | null> {
    const record = [...this.rows.values()].find(predicate);
    return record ? clone(record) : null;
  }

  protected async filter(predicate: (record: T) => boolean): Promise<readonly T[]> {
    return [...this.rows.values()].filter(predicate).map(clone);
  }
}
