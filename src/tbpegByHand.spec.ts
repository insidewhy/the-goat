import { Parser as AbstractParser } from './parser'
import {
  parseRuleName,
  parsePropertyName,
  parseRule,
  parseGroup,
  parseExpressionLeaf,
  parseAlternation,
  parseSequence,
  parseAssignment,
  parseJoin,
  parseLexeme,
  parseRepetition,
  RuleName,
  parseTreeRepetition,
  parseTreeJoin,
  parseTreeSequence,
  parseTreeOption,
  parseTreeRule,
  parseConstant,
  parseEscapeSequence,
  parseString,
  parseNext,
  parseAsConstant,
  parseNotCharacter,
  parseSpacingRule,
  parseAnyCharacter,
  parseEscapeCode,
  parseCharacters,
  parseToString,
} from './tbpegByHand'

class Parser extends AbstractParser {
  skipSpacing(): void {
    // TODO: generate this as the generator would
    for (
      let { next } = this;
      this.hasData() && (next === ' ' || next === '\t' || next === '\n');
      this.advance(), next = this.next
    ) {}
  }
}

const makeNamedRule = (name: string): RuleName => ({
  type: 'RuleName',
  value: name,
})

describe('tbpegByHand', () => {
  describe('parseRuleName', () => {
    it('matches BabyChan', () => {
      const p = new Parser('BabyChan')
      const result = parseRuleName(p)
      expect(result).toEqual(makeNamedRule('BabyChan'))
    })

    it('matches "Baby Chan" up to space', () => {
      const p = new Parser('Baby Chan')
      const result = parseRuleName(p)
      expect(result).toEqual(makeNamedRule('Baby'))
      expect(p.next).toEqual(' ')
    })
  })

  describe('parsePropertyName', () => {
    it('matches babyChan', () => {
      const p = new Parser('babyChan')
      const result = parsePropertyName(p)
      expect(result).toEqual('babyChan')
    })

    it('matches "_baby chan" up to space', () => {
      const p = new Parser('_baby chan')
      const result = parsePropertyName(p)
      expect(result).toEqual('_baby')
      expect(p.next).toEqual(' ')
    })
  })

  describe('parseRule', () => {
    it('matches Name <= Other', () => {
      const p = new Parser('Name <- Other')
      const result = parseRule(p)
      expect(result).toEqual({
        type: 'Rule',
        name: makeNamedRule('Name'),
        expression: makeNamedRule('Other'),
      })
    })
  })

  describe('parseGroup', () => {
    it('matches (Name)', () => {
      const p = new Parser('(Name)')
      const result = parseGroup(p)
      expect(result).toEqual({
        type: 'Group',
        expression: makeNamedRule('Name'),
      })
    })
  })

  describe('parseAlternation', () => {
    it('matches RuleName and stores RuleName object', () => {
      const p = new Parser('RuleName')
      const result = parseAlternation(p)
      expect(result).toEqual(makeNamedRule('RuleName'))
    })

    it('matches Rule / OtherRule, storing Alternation object', () => {
      const p = new Parser('Rule / OtherRule')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'Alternation',
        expressions: [makeNamedRule('Rule'), makeNamedRule('OtherRule')],
      })
    })

    it('matches Seq1 Seq2 / OtherRule, storing Alternation object with nested Sequence', () => {
      const p = new Parser('Seq1 Seq2 / OtherRule')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'Alternation',
        expressions: [
          {
            type: 'Sequence',
            expressions: [makeNamedRule('Seq1'), makeNamedRule('Seq2')],
          },
          makeNamedRule('OtherRule'),
        ],
      })
    })

    it('matches $string RuleName', () => {
      const p = new Parser('$string RuleName Thing')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'Sequence',
        expressions: [
          {
            type: 'ToString',
            expression: makeNamedRule('RuleName'),
          },
          makeNamedRule('Thing'),
        ],
      })
    })

    it('matches $string RuleName^+', () => {
      const p = new Parser('$string RuleName^+')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'Repetition',
        repetition: 'LexemeOneOrMore',
        expression: {
          type: 'ToString',
          expression: makeNamedRule('RuleName'),
        },
      })
    })
  })

  describe('parseSequence', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseAlternation(p)
      expect(result).toEqual(makeNamedRule('TheRuleName'))
    })

    it('matches Seq1 Seq2, storing Sequence object', () => {
      const p = new Parser('Seq1 Seq2')
      const result = parseSequence(p)
      expect(result).toEqual({
        type: 'Sequence',
        expressions: [makeNamedRule('Seq1'), makeNamedRule('Seq2')],
      })
    })

    it('matches Cat &Angry, storing Sequence object with predicate', () => {
      const p = new Parser('Cat &!Angry')
      const result = parseSequence(p)
      expect(result).toEqual({
        type: 'Sequence',
        expressions: [
          makeNamedRule('Cat'),
          {
            type: 'Predicate',
            predicate: 'NotPredicate',
            expression: makeNamedRule('Angry'),
          },
        ],
      })
    })

    it('matches prop1:Seq1 prop2:Seq2, storing Sequence object with Assignment expressions', () => {
      const p = new Parser('prop1:Seq1 prop2:Seq2')
      const result = parseSequence(p)
      expect(result).toEqual({
        type: 'Sequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'prop1',
            expression: makeNamedRule('Seq1'),
          },
          {
            type: 'Assignment',
            propertyName: 'prop2',
            expression: makeNamedRule('Seq2'),
          },
        ],
      })
    })
  })

  describe('parseAssignment', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseAssignment(p)
      expect(result).toEqual(makeNamedRule('TheRuleName'))
    })

    it('matches rule:TheRuleName and stores assignment object', () => {
      const p = new Parser('prop:TheRuleName')
      const result = parseAssignment(p)
      expect(result).toEqual({
        type: 'Assignment',
        propertyName: 'prop',
        expression: makeNamedRule('TheRuleName'),
      })
    })
  })

  describe('parseJoin', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseJoin(p)
      expect(result).toEqual(makeNamedRule('TheRuleName'))
    })

    it('matches TheRuleName % OtherRule and stores join object', () => {
      const p = new Parser('TheRuleName % OtherRule')
      const result = parseJoin(p)
      expect(result).toEqual({
        type: 'Join',
        repetition: 'ZeroOrMore',
        expression: makeNamedRule('TheRuleName'),
        joinWith: makeNamedRule('OtherRule'),
      })
    })
  })

  describe('parseLexeme', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseLexeme(p)
      expect(result).toEqual(makeNamedRule('TheRuleName'))
    })

    it('matches TheRuleName % OtherRule and stores join object', () => {
      const p = new Parser('TheRuleName ^ OtherRule')
      const result = parseLexeme(p)
      expect(result).toEqual({
        type: 'Lexeme',
        expressions: [makeNamedRule('TheRuleName'), makeNamedRule('OtherRule')],
      })
    })
  })

  describe('parseAsConstant', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseAsConstant(p)
      expect(result).toEqual(makeNamedRule('TheRuleName'))
    })

    it('matches TheRuleName $as "blah" and stores AsConstant object', () => {
      const p = new Parser('TheRuleName $as "blah"')
      const result = parseAsConstant(p)
      expect(result).toEqual({
        type: 'AsConstant',
        expression: makeNamedRule('TheRuleName'),
        value: {
          type: 'String',
          value: 'blah',
        },
      })
    })
  })

  describe('parseRepetition', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseRepetition(p)
      expect(result).toEqual(makeNamedRule('TheRuleName'))
    })

    it('matches (One ^ Two)+ and stores repetition object', () => {
      const p = new Parser('(One ^ Two)+')
      const result = parseRepetition(p)
      expect(result).toEqual({
        type: 'Repetition',
        repetition: 'OneOrMore',
        expression: {
          type: 'Group',
          expression: {
            type: 'Lexeme',
            expressions: [makeNamedRule('One'), makeNamedRule('Two')],
          },
        },
      })
    })

    it('matches Three* and stores repetition object', () => {
      const p = new Parser('Three*')
      const result = parseRepetition(p)
      expect(result).toEqual({
        type: 'Repetition',
        repetition: 'ZeroOrMore',
        expression: makeNamedRule('Three'),
      })
    })
  })

  describe('parseExpressionLeaf', () => {
    it('matches RuleName', () => {
      const p = new Parser('RuleName')
      const result = parseExpressionLeaf(p)
      expect(result).toEqual(makeNamedRule('RuleName'))
    })

    it('does not match "RuleName <-" due to not-predicate in sequence', () => {
      const p = new Parser('RuleName <-')
      const result = parseExpressionLeaf(p)
      expect(result).toEqual(undefined)
      // rewound to beginning by alternation
      expect(p.next).toEqual('R')
    })
  })

  describe('parseConstant', () => {
    it('matches "Pumpy"', () => {
      const p = new Parser('"Pumpy"')
      const result = parseConstant(p)
      expect(result).toEqual({
        type: 'String',
        value: 'Pumpy',
      })
    })
  })

  describe('parseString', () => {
    it('matches "oh \\"beard\\""', () => {
      const p = new Parser('"oh \\"beard\\""')
      const result = parseString(p)
      expect(result).toEqual({
        type: 'String',
        value: 'oh \\"beard\\"',
      })
    })
  })

  describe('parseSpacingRule', () => {
    it('matches "~"', () => {
      const p = new Parser('~')
      const result = parseSpacingRule(p)
      expect(result).toEqual({ type: 'SpacingRule' })
    })
  })

  describe('parseAnyCharacter', () => {
    it('matches "."', () => {
      const p = new Parser('.')
      const result = parseAnyCharacter(p)
      expect(result).toEqual({ type: 'AnyCharacter' })
    })
  })

  describe('parseEscapeCode', () => {
    it('matches "\\w"', () => {
      const p = new Parser('\\w')
      const result = parseEscapeCode(p)
      expect(result).toEqual({ type: 'EscapeCode', code: 'w' })
    })
  })

  describe('parseCharacters', () => {
    // see comment against lexemeAtLeastOne
    xit('matches [a-z]', () => {
      const p = new Parser('[a-z]')
      const result = parseCharacters(p)
      expect(result).toEqual([{ type: 'CharacterRange', from: 'a', to: 'z' }])
    })
  })

  describe('parseEscapeSequence', () => {
    it('matches \\n as newline', () => {
      const p = new Parser('\\n')
      const result = parseEscapeSequence(p)
      expect(result).toEqual({
        type: 'EscapeSequence',
        value: '\n',
      })
    })

    it('matches \\" as "', () => {
      const p = new Parser('\\"')
      const result = parseEscapeSequence(p)
      expect(result).toEqual({
        type: 'EscapeSequence',
        value: '"',
      })
    })

    it('does not match \\o', () => {
      const p = new Parser('\\o')
      const result = parseEscapeSequence(p)
      expect(result).toEqual(undefined)
    })
  })

  describe('parseNotCharacter', () => {
    it('matches ! "."', () => {
      const p = new Parser('! "."')
      const result = parseNotCharacter(p)
      expect(result).toEqual({
        type: 'NotCharacter',
        character: '.',
      })
    })

    it('matches ! \\', () => {
      const p = new Parser('! \\\\')
      const result = parseNotCharacter(p)
      expect(result).toEqual({
        type: 'NotCharacter',
        character: {
          type: 'EscapeSequence',
          value: '\\',
        },
      })
    })
  })

  describe('parseNext', () => {
    it('matches $next', () => {
      const p = new Parser('$next')
      const result = parseNext(p)
      expect(result).toEqual({
        type: 'Next',
      })
    })
  })

  describe('parseToString', () => {
    it('matches $string RuleName', () => {
      const p = new Parser('$string RuleName')
      const result = parseToString(p)
      expect(result).toEqual({
        type: 'ToString',
        expression: makeNamedRule('RuleName'),
      })
    })
  })

  describe('parseTreeRule', () => {
    it('parses Tree <= RuleName |% "Oats" as TreeRule object', () => {
      const p = new Parser('Tree <= RuleName |% "Oats"')
      const result = parseTreeRule(p)
      expect(result).toEqual({
        type: 'TreeRule',
        name: makeNamedRule('Tree'),
        expression: {
          type: 'TreeJoin',
          expression: makeNamedRule('RuleName'),
          joinWith: {
            type: 'String',
            value: 'Oats',
          },
        },
      })
    })
  })

  describe('parseTreeJoin', () => {
    it('parses RuleName |% "Oats" as TreeJoin object', () => {
      const p = new Parser('RuleName |% "Oats"')
      const result = parseTreeJoin(p)
      expect(result).toEqual({
        type: 'TreeJoin',
        expression: makeNamedRule('RuleName'),
        joinWith: {
          type: 'String',
          value: 'Oats',
        },
      })
    })
  })

  describe('parseTreeRepetition', () => {
    it('parses RuleName|+ as TreeRepetition object', () => {
      const p = new Parser('RuleName |+')
      const result = parseTreeRepetition(p)
      expect(result).toEqual({
        type: 'TreeRepetition',
        expression: makeNamedRule('RuleName'),
      })
    })
  })

  describe('parseTreeSequence', () => {
    it('parses Oats Eater|? as TreeSequence object', () => {
      const p = new Parser('Oats Eater|?')
      const result = parseTreeSequence(p)
      expect(result).toEqual({
        type: 'TreeSequence',
        expressions: [
          makeNamedRule('Oats'),
          {
            type: 'TreeOption',
            option: makeNamedRule('Eater'),
          },
        ],
      })
    })
  })

  describe('parseTreeOption', () => {
    it('parses Snakey|? as TreeOption object', () => {
      const p = new Parser('Snakey|?')
      const result = parseTreeOption(p)
      expect(result).toEqual({
        type: 'TreeOption',
        option: makeNamedRule('Snakey'),
      })
    })
  })
})
