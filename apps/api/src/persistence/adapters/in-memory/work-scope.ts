import type { UnitOfWork } from '../../application/ports.js';

export class InMemoryWorkScope implements UnitOfWork {
  public async execute<T>(work: () => Promise<T>): Promise<T> {
    return await work();
  }
}
