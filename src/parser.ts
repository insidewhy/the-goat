export class Parser {
  public index = 0

  constructor(public data: string) {}

  get next(): string {
    return this.data[this.index]
  }

  advance(): void {
    ++this.index
  }
}
