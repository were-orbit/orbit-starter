export interface Clock {
  now(): Date;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FakeClock implements Clock {
  constructor(private current: Date = new Date("2024-01-01T00:00:00.000Z")) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advanceBy(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }

  set(next: Date): void {
    this.current = new Date(next.getTime());
  }
}
