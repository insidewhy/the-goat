import { Parser as AbstractParser } from './parser'
import {
  parseRuleName,
  parsePropertyName,
  parseRule,
  parseGroup,
  parseExpressionLeaf,
  parseAlternation,
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
    it('matches RuleName', () => {
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
