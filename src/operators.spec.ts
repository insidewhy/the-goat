import { parseAlternation, parseConstant } from './operators'
import { Parser as AbstractParser } from './parser'

class Parser extends AbstractParser {
  skipSpacing(): void {
    for (
      const { next } = this;
      this.hasData() && next === ' ';
      this.advance()
    ) {}
  }
}

describe('operator', () => {
  describe('parseAlternation', () => {
    it('parses first alternation match', () => {
      const p = new Parser('oh cat')
      const value = parseAlternation(
        p,
        (p: Parser) => parseConstant(p, 'oh'),
        (p: Parser) => parseConstant(p, 'cat'),
      )
      expect(value).toEqual('oh')
    })
  })
})
