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

describe('tbpegByHand', () => {
  describe('parseRuleName', () => {
    it('matches BabyChan', () => {
      const p = new Parser('BabyChan')
      const result = parseRuleName(p)
      expect(result).toEqual({ type: 'RuleName', value: 'BabyChan' })
    })

    it('matches "Baby Chan" up to space', () => {
      const p = new Parser('Baby Chan')
      const result = parseRuleName(p)
      expect(result).toEqual({ type: 'RuleName', value: 'Baby' })
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
        name: { type: 'RuleName', value: 'Name' },
        expression: { type: 'RuleName', value: 'Other' },
      })
    })
  })

  describe('parseGroup', () => {
    it('matches (Name)', () => {
      const p = new Parser('(Name)')
      const result = parseGroup(p)
      expect(result).toEqual({
        type: 'Group',
        expression: {
          type: 'RuleName',
          value: 'Name',
        },
      })
    })
  })

  describe('parseAlternation', () => {
    it('matches RuleName and stores RuleName object', () => {
      const p = new Parser('RuleName')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'RuleName',
        value: 'RuleName',
      })
    })

    it('matches Rule / OtherRule, storing Alternation object', () => {
      const p = new Parser('Rule / OtherRule')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'Alternation',
        expressions: [
          { type: 'RuleName', value: 'Rule' },
          { type: 'RuleName', value: 'OtherRule' },
        ],
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
            expressions: [
              { type: 'RuleName', value: 'Seq1' },
              { type: 'RuleName', value: 'Seq2' },
            ],
          },
          { type: 'RuleName', value: 'OtherRule' },
        ],
      })
    })
  })

  describe('parseSequence', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseAlternation(p)
      expect(result).toEqual({
        type: 'RuleName',
        value: 'TheRuleName',
      })
    })

    it('matches Seq1 Seq2, storing Sequence object', () => {
      const p = new Parser('Seq1 Seq2')
      const result = parseSequence(p)
      expect(result).toEqual({
        type: 'Sequence',
        expressions: [
          { type: 'RuleName', value: 'Seq1' },
          { type: 'RuleName', value: 'Seq2' },
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
            expression: {
              type: 'RuleName',
              value: 'Seq1',
            },
          },
          {
            type: 'Assignment',
            propertyName: 'prop2',
            expression: {
              type: 'RuleName',
              value: 'Seq2',
            },
          },
        ],
      })
    })
  })

  describe('parseAssignment', () => {
    it('matches TheRuleName and stores RuleName object', () => {
      const p = new Parser('TheRuleName')
      const result = parseAssignment(p)
      expect(result).toEqual({
        type: 'RuleName',
        value: 'TheRuleName',
      })
    })

    it('matches rule:TheRuleName and stores assignment object', () => {
      const p = new Parser('prop:TheRuleName')
      const result = parseAssignment(p)
      expect(result).toEqual({
        type: 'Assignment',
        propertyName: 'prop',
        expression: {
          type: 'RuleName',
          value: 'TheRuleName',
        },
      })
    })
  })

  describe('parseExpressionLeaf', () => {
    it('matches RuleName', () => {
      const p = new Parser('RuleName')
      const result = parseExpressionLeaf(p)
      expect(result).toEqual({
        type: 'RuleName',
        value: 'RuleName',
      })
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
