import {
  alternation,
  constant,
  atLeastOne,
  property,
  object,
  characterRange,
  lexeme,
  lexemeAtLeastOne,
  sequence,
  notPredicate,
  sequenceCustom,
  andPredicate,
  join,
  joinMany,
  treeJoin,
  appendProperty,
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
  describe('alternation', () => {
    const parseConstantsAlternation = alternation(
      constant('oh'),
      constant('cat'),
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

  describe('atLeastOne', () => {
    const parseAtLeastOneConstantsAlternation = atLeastOne(
      alternation(constant('oh'), constant('cat')),
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

    describe('rewinds the parser index after partial match of second repetition', () => {
      it('by parsing "ab cz" with ([a-f]^[a-f])+ as ["ab"] and leaving parser at whitespace', () => {
        const parseAtLeastOneLexeme = atLeastOne(
          lexeme(characterRange('a', 'f'), characterRange('a', 'f')),
        )

        const p = new Parser('ab cz')
        const value = parseAtLeastOneLexeme(p)
        expect(value).toEqual(['ab'])
        expect(p.next).toEqual(' ')
      })
    })
  })

  const parseAtoZ = characterRange('a', 'z')

  describe('characterRange', () => {
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

  describe('lexeme', () => {
    const parseAtoZTwiceLexeme = lexeme(parseAtoZ, parseAtoZ)

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

  describe('lexemeAtLeastOne', () => {
    const parseMultipleRanges = lexemeAtLeastOne(
      alternation(characterRange('a', 'd'), characterRange('m', 'z')),
    )

    it('parses addat using [a-dm-z]^+ as adda and advances stream up to t', () => {
      const p = new Parser('annaf')
      expect(parseMultipleRanges(p)).toEqual('anna')
      expect(p.next).toEqual('f')
    })
  })

  describe('property', () => {
    const parseConstantToProperty = property('value', constant('oh'))

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
      const alternationWithProp = alternation(
        parseConstantToProperty,
        constant('cat'),
      )
      const value = alternationWithProp(p, result)
      expect(value).toEqual('oh')
      expect(result).toEqual({ value: 'oh' })
    })
  })

  describe('object', () => {
    const parseConstantToObjectProperty = object(
      () => ({ value: '' }),
      property('value', constant('oh')),
    )

    it('parses match into object property', () => {
      const p = new Parser('oh')
      const result = parseConstantToObjectProperty(p)
      expect(result).toEqual({ value: 'oh' })
    })
  })

  describe('sequence', () => {
    const parseOhThenCat = sequence(constant('oh'), constant('cat'))

    const parseOhNotFollowedByCat = sequenceCustom<string>()(
      constant('oh'),
      notPredicate(constant('cat')),
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
    const aToFPredicate = andPredicate(characterRange('a', 'f'))

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
    const notAtoFPredicate = notPredicate(characterRange('a', 'f'))

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

  describe('join', () => {
    describe('with [a-z] % ","', () => {
      const commaSeparatedStrings = join(
        characterRange('a', 'z'),
        constant(','),
      )

      it('parses "a , d" as ["a", "d"]', () => {
        const p = new Parser('a, d:')
        expect(commaSeparatedStrings(p)).toEqual(['a', 'd'])
        expect(p.next).toEqual(':')
      })

      it('parses "b,d" as ["b", "d"]', () => {
        const p = new Parser('b,d')
        expect(commaSeparatedStrings(p)).toEqual(['b', 'd'])
        expect(p.atEof).toBeTruthy()
      })

      it('parses ":" as []', () => {
        const p = new Parser(':')
        expect(commaSeparatedStrings(p)).toEqual([])
        expect(p.next).toEqual(':')
      })
    })
  })

  describe('joinMany', () => {
    describe('with [a-z] %+ ","', () => {
      const commaSeparatedStrings = joinMany(
        characterRange('a', 'z'),
        constant(','),
      )

      it('parses "a" as ["a"]', () => {
        const p = new Parser('a:')
        expect(commaSeparatedStrings(p)).toEqual(['a'])
        expect(p.next).toEqual(':')
      })

      it('parses ":" as undefined', () => {
        const p = new Parser(':')
        expect(commaSeparatedStrings(p)).toEqual(undefined)
        expect(p.next).toEqual(':')
      })
    })
  })

  describe('treeJoin', () => {
    describe('with values:[a-z] |% ","', () => {
      const simpleTree = treeJoin(
        () => ({ values: [] }),
        appendProperty('values', characterRange('a', 'z')),
        constant(','),
      )

      it('parses "a" as "a"', () => {
        const p = new Parser('a:')
        expect(simpleTree(p)).toEqual('a')
        expect(p.next).toEqual(':')
      })

      it('parses "a,b" as "{ values: ["a", "b"] }', () => {
        const p = new Parser('a,b')
        expect(simpleTree(p)).toEqual({ values: ['a', 'b'] })
        expect(p.atEof).toBeTruthy()
      })

      it('parses "a,b, c" as "{ values: ["a", "b", "c"] }', () => {
        const p = new Parser('a,b, c:')
        expect(simpleTree(p)).toEqual({ values: ['a', 'b', 'c'] })
        expect(p.next).toEqual(':')
      })
    })
  })
})
