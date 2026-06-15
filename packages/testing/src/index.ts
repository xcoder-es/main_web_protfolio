export class FixedClock {
  public constructor(private readonly current: Date) {}

  public now(): Date {
    return new Date(this.current.getTime());
  }
}
