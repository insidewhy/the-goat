import { Parser as AbstractParser } from './parser'
import { parseRuleName, parsePropertyName } from './tbpegByHand'

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
})
