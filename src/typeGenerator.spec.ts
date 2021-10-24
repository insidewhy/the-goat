import { GrammarParser } from './tbpegByHand'
import { generateTypes } from './typeGenerator'

describe('typeGenerator', () => {
  const genTypesIt = (grammar: string, focus = false): void => {
    const itString = `generates types for: ${grammar}`
    const test = () => {
      const p = new GrammarParser(grammar + '\nSpacing <- \\s^+')
      const ast = p.parse()
      expect(ast).toBeDefined()
      const types = generateTypes(ast!)
      expect(types).toMatchSnapshot()
    }

    if (focus) {
      fit(itString, test)
    } else {
      it(itString, test)
    }
  }

  // const fgenTypesIt = (grammar: string): void => {
  //   genTypesIt(grammar, true)
  // }

  genTypesIt('Grammar <- [a-z]')

  genTypesIt('Grammar <- [a-z]^+')

  genTypesIt('Grammar <- [A-Z] ^ [a-z]^+')

  // correctly infer repeated character through rule reference
  genTypesIt(`
    Grammar <- Character^+
    Character <- [a-z]
  `)

  // same using $next
  genTypesIt(`
    Grammar <- $next^+
    Character <- [a-z]
  `)

  genTypesIt(`
    Grammar <- String+
    String <- [A-Z]^[a-z]^+
  `)

  genTypesIt(`
    Grammar <- String^+
    String <- [A-Z]^[a-z]^+
  `)

  // two characters generate one string
  genTypesIt(`Grammar <- [A-Z] / [a-z]`)

  // two strings generate one string
  genTypesIt(`Grammar <- [A-Z]^+ / [a-z]^+`)

  // type must be string, character will not make it
  genTypesIt(`Grammar <- [A-Z] / [a-z]^+`)

  // character will be erased
  genTypesIt(`Grammar <- [a-z]^+ / [A-Z]`)

  // named rules will appear in the union even when they duplicate types
  genTypesIt(`
    Grammar <- String / [A-Z]
    String <- [a-z]^+
  `)

  genTypesIt(`
    String <- [a-z]^+
    Grammar <- String / [A-Z]
  `)

  // erase the string type when a later named rule has string type
  genTypesIt(`
    Grammar <- [A-Z] / String
    String <- [a-z]^+
  `)

  // named rules will appear in the union even when they duplicate types
  genTypesIt(`
    Grammar <- String / UpperCaseChar
    UpperCaseChar <- [A-Z]
    String <- [a-z]^+
  `)

  // named rules will appear in union when rule using union is defined before union itself
  genTypesIt(`
    Things <- Stuff
    String <- [a-z]^+
    Stuff <- String / String
    Grammar <- Things
  `)

  // named rules will appear when used both before and after their definition
  genTypesIt(`
    Stuff <- String / String
    String <- [a-z]^+
    Grammar <- Stuff
  `)

  // TODO: test removal of duplicate types in alternations etc.
})
