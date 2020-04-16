import { parseAlternation, parseConstant, parseAtLeastOne } from './operators'
import { Parser as AbstractParser } from './parser'

class Parser extends AbstractParser {
  skipSpacing(): void {
    for (
      let { next } = this;
      this.hasData() && next === ' ';
      this.advance(), next = this.next
    ) {}
  }
}

describe('operator', () => {
  describe('parseAlternation', () => {
    const parseConstantsAlternation = parseAlternation(
      parseConstant('oh'),
      parseConstant('cat'),
    )

    it('parses first alternation match', () => {
      const p = new Parser('oh cat')
      const value = parseConstantsAlternation(p)
      expect(value).toEqual('oh')
    })

    it('parses second alternation match', () => {
      const p = new Parser('cat oh')
      const value = parseConstantsAlternation(p)
      expect(value).toEqual('cat')
    })
  })

  describe('parseAtLeastOne', () => {
    const parseAtLeastOneConstantsAlternation = parseAtLeastOne(
      parseAlternation(parseConstant('oh'), parseConstant('cat')),
    )

    it('parses many matches', () => {
      const p = new Parser('ohcat')
      const value = parseAtLeastOneConstantsAlternation(p)
      expect(value).toEqual(['oh', 'cat'])
    })

    fit('parses many matches with whitespace in between', () => {
      const p = new Parser('oh cat')
      const value = parseAtLeastOneConstantsAlternation(p)
      expect(value).toEqual(['oh', 'cat'])
    })
  })
})
