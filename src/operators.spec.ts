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
    describe('"oh" / "cat"', () => {
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
  })

  describe('atLeastOne', () => {
    describe('("oh" / "cat")+', () => {
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
    })

    describe('([a-f]^[a-f])+', () => {
      const parseAtLeastOneLexeme = atLeastOne(
        lexeme(characterRange('a', 'f'), characterRange('a', 'f')),
      )

      describe('rewinds the parser index after partial match of second repetition', () => {
        it('by parsing "ab cz" as ["ab"] and leaving parser at whitespace', () => {
          const p = new Parser('ab cz')
          const value = parseAtLeastOneLexeme(p)
          expect(value).toEqual(['ab'])
          expect(p.next).toEqual(' ')
        })
      })
    })
  })

  const parseAtoZ = characterRange('a', 'z')

  describe('characterRange', () => {
    describe('[a-z]', () => {
      it('parses f and advances stream', () => {
        const p = new Parser('fh')
        expect(parseAtoZ(p)).toEqual('f')
        expect(p.next).toEqual('h')
      })

      it('does not parse F and does not advance stream', () => {
        const p = new Parser('Fh')
        expect(parseAtoZ(p)).toEqual(undefined)
        expect(p.next).toEqual('F')
      })
    })
  })

  describe('lexeme', () => {
    const parseAtoZTwiceLexeme = lexeme(parseAtoZ, parseAtoZ)

    describe('[a-z]^[a-z]', () => {
      it('parses cat and advances stream', () => {
        const p = new Parser('cat')
        expect(parseAtoZTwiceLexeme(p)).toEqual('ca')
        expect(p.next).toEqual('t')
      })

      it('returns undefined for cAt, advancing stream to A', () => {
        const p = new Parser('cAt')
        expect(parseAtoZTwiceLexeme(p)).toEqual(undefined)
        expect(p.next).toEqual('A')
      })
    })
  })

  describe('lexemeAtLeastOne', () => {
    describe('[a-dm-z]^+', () => {
      const parseMultipleRanges = lexemeAtLeastOne(
        alternation(characterRange('a', 'd'), characterRange('m', 'z')),
      )

      it('parses addat as adda and advances stream up to t', () => {
        const p = new Parser('annaf')
        expect(parseMultipleRanges(p)).toEqual('anna')
        expect(p.next).toEqual('f')
      })
    })
  })

  describe('property', () => {
    describe('value:"oh"', () => {
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
  })

  describe('object', () => {
    describe('value:"oh"', () => {
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
  })

  describe('sequence', () => {
    describe('"oh" "cat"', () => {
      const parseOhThenCat = sequence(constant('oh'), constant('cat'))

      it('parses "oh cat" as ["oh", "cat"]', () => {
        const p = new Parser('oh catb')
        expect(parseOhThenCat(p)).toEqual(['oh', 'cat'])
        expect(p.next).toEqual('b')
      })

      it('parses "oh bat" as undefined', () => {
        const p = new Parser('oh bat')
        expect(parseOhThenCat(p)).toEqual(undefined)
        // the string is not reset, this is left to the alternation/repetition above
        expect(p.next).toEqual('b')
      })
    })

    describe('"oh" &!"cat"', () => {
      const parseOhNotFollowedByCat = sequenceCustom<string>()(
        constant('oh'),
        notPredicate(constant('cat')),
      )

      it('parses "oh bat" as "oh"', () => {
        const p = new Parser('oh bat')
        expect(parseOhNotFollowedByCat(p)).toEqual('oh')
        expect(p.next).toEqual('b')
      })

      it('parses "oh cat" as undefined', () => {
        const p = new Parser('oh cat')
        expect(parseOhNotFollowedByCat(p)).toEqual(undefined)
        expect(p.next).toEqual('c')
      })
    })
  })

  describe('andPredicate', () => {
    describe('&[a-f]', () => {
      const aToFPredicate = andPredicate(characterRange('a', 'f'))

      it('parses "c" as true and does not advance parser', () => {
        const p = new Parser('c')
        expect(aToFPredicate(p)).toEqual(true)
        expect(p.next).toEqual('c')
      })

      it('parses "z" as false', () => {
        const p = new Parser('z')
        expect(aToFPredicate(p)).toEqual(false)
        expect(p.next).toEqual('z')
      })
    })
  })

  describe('notPredicate', () => {
    describe('&![a-f]', () => {
      const notAtoFPredicate = notPredicate(characterRange('a', 'f'))

      it('parses "z" as true and does not advance parser', () => {
        const p = new Parser('z')
        expect(notAtoFPredicate(p)).toEqual(true)
        expect(p.next).toEqual('z')
      })

      it('parses "c" as false', () => {
        const p = new Parser('c')
        expect(notAtoFPredicate(p)).toEqual(false)
        expect(p.next).toEqual('c')
      })
    })
  })

  describe('join', () => {
    describe('[a-z] % ","', () => {
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
    describe('[a-z] %+ ","', () => {
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
    describe('values:[a-z] |% ","', () => {
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
