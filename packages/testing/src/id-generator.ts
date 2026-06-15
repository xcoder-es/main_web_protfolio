export class SequenceIdGenerator {
  private position = 0;

  public constructor(private readonly values: readonly string[]) {}

  public generate(): string {
    const value = this.values[this.position];
    if (value === undefined) throw new Error('No generated IDs remain');
    this.position += 1;
    return value;
  }
}
