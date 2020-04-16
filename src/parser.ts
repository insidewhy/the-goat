export interface Ast<T extends string> {
  type: T
}

export abstract class Parser {
  public index = 0

  abstract skipSpacing(): void

  constructor(public data: string) {}

  get next(): string {
    return this.data[this.index]
  }

  hasData(): boolean {
    return this.index < this.data.length
  }

  atEof(): boolean {
    return this.index >= this.data.length
  }

  advance(): void {
    ++this.index
  }

  restoreIndex(index: number): void {
    this.index = index
  }
}
