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
})
