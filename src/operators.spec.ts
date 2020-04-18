import {
  parseAlternation,
  parseConstant,
  parseAtLeastOne,
  parseProperty,
  parseObject,
  parseCharacterRange,
  parseLexeme,
  parseLexemeAtLeastOne,
  parseSequence,
  notPredicate,
  parseSequenceCustom,
  andPredicate,
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

    it('returns undefined when there are no matches', () => {
      const p = new Parser('baby fraud')
      const value = parseAtLeastOneConstantsAlternation(p)
      expect(value).toEqual(undefined)
      expect(p.index).toEqual(0)
    })
  })

  const parseAtoZ = parseCharacterRange('a', 'z')

  describe('parseCharacterRange', () => {
    it('parses f using [a-z] and advances stream', () => {
      const p = new Parser('fh')
      expect(parseAtoZ(p)).toEqual('f')
      expect(p.next).toEqual('h')
    })

    it('does not parse F using [a-z] and does not advance stream', () => {
      const p = new Parser('Fh')
      expect(parseAtoZ(p)).toEqual(undefined)
      expect(p.next).toEqual('F')
    })
  })

  describe('parseLexeme', () => {
    const parseAtoZTwiceLexeme = parseLexeme(parseAtoZ, parseAtoZ)

    it('parses cat using [a-z]^[a-z] and advances stream', () => {
      const p = new Parser('cat')
      expect(parseAtoZTwiceLexeme(p)).toEqual('ca')
      expect(p.next).toEqual('t')
    })

    it('returns undefined for cAt using [a-z]^[a-z] advancing stream to A', () => {
      const p = new Parser('cAt')
      expect(parseAtoZTwiceLexeme(p)).toEqual(undefined)
      expect(p.next).toEqual('A')
    })
  })

  describe('parseLexemeAtLeastOne', () => {
    const parseMultipleRanges = parseLexemeAtLeastOne(
      parseAlternation(
        parseCharacterRange('a', 'd'),
        parseCharacterRange('m', 'z'),
      ),
    )

    it('parses addat using [a-dm-z]^+ as adda and advances stream up to t', () => {
      const p = new Parser('annaf')
      expect(parseMultipleRanges(p)).toEqual('anna')
      expect(p.next).toEqual('f')
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

  describe('parseSequence', () => {
    const parseOhThenCat = parseSequence(
      parseConstant('oh'),
      parseConstant('cat'),
    )

    const parseOhNotFollowedByCat = parseSequenceCustom<string>()(
      parseConstant('oh'),
      notPredicate(parseConstant('cat')),
    )

    it('parses "oh cat" using ("oh" "cat") as ["oh", "cat"]', () => {
      const p = new Parser('oh catb')
      expect(parseOhThenCat(p)).toEqual(['oh', 'cat'])
      expect(p.next).toEqual('b')
    })

    it('parses "oh bat" using ("oh" "cat") as undefined', () => {
      const p = new Parser('oh bat')
      expect(parseOhThenCat(p)).toEqual(undefined)
      // the string is not reset, this is left to the alternation/repetition above
      expect(p.next).toEqual('b')
    })

    it('parses "oh bat" using ("oh" &!"cat") as "oh"', () => {
      const p = new Parser('oh bat')
      expect(parseOhNotFollowedByCat(p)).toEqual('oh')
      expect(p.next).toEqual('b')
    })

    it('parses "oh cat" using ("oh" &!"cat") as undefined', () => {
      const p = new Parser('oh cat')
      expect(parseOhNotFollowedByCat(p)).toEqual(undefined)
      expect(p.next).toEqual('c')
    })
  })

  describe('andPredicate', () => {
    const aToFPredicate = andPredicate(parseCharacterRange('a', 'f'))

    it('parses "c" with &[a-f] as true and does not advance parser', () => {
      const p = new Parser('c')
      expect(aToFPredicate(p)).toEqual(true)
      expect(p.next).toEqual('c')
    })

    it('parses "z" with &[a-f] as false', () => {
      const p = new Parser('z')
      expect(aToFPredicate(p)).toEqual(false)
      expect(p.next).toEqual('z')
    })
  })

  describe('notPredicate', () => {
    const notAtoFPredicate = notPredicate(parseCharacterRange('a', 'f'))

    it('parses "z" with &![a-f] as true and does not advance parser', () => {
      const p = new Parser('z')
      expect(notAtoFPredicate(p)).toEqual(true)
      expect(p.next).toEqual('z')
    })

    it('parses "c" with &![a-f] as false', () => {
      const p = new Parser('c')
      expect(notAtoFPredicate(p)).toEqual(false)
      expect(p.next).toEqual('c')
    })
  })
})
