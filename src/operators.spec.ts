import {
  parseAlternation,
  parseConstant,
  parseAtLeastOne,
  parseProperty,
  parseObject,
} from './operators'
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

    it('parses many matches with whitespace in between', () => {
      const p = new Parser('oh cat')
      const value = parseAtLeastOneConstantsAlternation(p)
      expect(value).toEqual(['oh', 'cat'])
    })
  })

  describe('parseProperty', () => {
    const parseConstantToProperty = parseProperty('value', parseConstant('oh'))

    it('parses match into property', () => {
      const p = new Parser('oh')
      const result = { value: '' }
      const value = parseConstantToProperty(p, result)
      expect(value).toEqual('oh')
      expect(result).toEqual({ value: 'oh' })
    })

    it('parses match within alternation into property', () => {
      const p = new Parser('oh')

      const result = { value: '' }
      const alternation = parseAlternation(
        parseConstantToProperty,
        parseConstant('cat'),
      )
      const value = alternation(p, result)
      expect(value).toEqual('oh')
      expect(result).toEqual({ value: 'oh' })
    })
  })

  describe('parseObject', () => {
    const parseConstantToObjectProperty = parseObject(
      () => ({ value: '' }),
      parseProperty('value', parseConstant('oh')),
    )

    it('parses match into object property', () => {
      const p = new Parser('oh')
      const result = parseConstantToObjectProperty(p)
      expect(result).toEqual({ value: 'oh' })
    })
  })
})
