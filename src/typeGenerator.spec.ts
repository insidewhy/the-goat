import { GrammarParser } from './tbpegByHand'
import { generateTypes } from './typeGenerator'

const genTypesIt = (grammar: string): void => {
  it(`generates types for: ${grammar}`, () => {
    const p = new GrammarParser(grammar + '\nSpacing <- s+')
    const ast = p.parse()
    expect(ast).toBeDefined()
    const types = generateTypes(ast!)
    expect(types).toMatchSnapshot()
  })
}

describe('typeGenerator', () => {
  genTypesIt('Grammar <- [a-z]+')
})
