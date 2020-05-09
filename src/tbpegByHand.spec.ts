import {
  GrammarParser as Parser,
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

const makeNamedRule = (name: string): RuleName => ({
  type: 'RuleName',
  value: name,
})

const parseIt = <T, U>(
  parseOp: (p: Parser) => T,
  ruleStr: string,
  match: U,
): void => {
  it(`matches ${ruleStr}`, () => {
    const p = new Parser(ruleStr)
    const result = parseOp(p)
    expect(result).toEqual(match)
  })
}

describe('tbpegByHand', () => {
  describe('parseRuleName', () => {
    parseIt(parseRuleName, 'BabyChan', makeNamedRule('BabyChan'))

    it('matches "Baby Chan" up to space', () => {
      const p = new Parser('Baby Chan')
      const result = parseRuleName(p)
      expect(result).toEqual(makeNamedRule('Baby'))
      expect(p.next).toEqual(' ')
    })
  })

  describe('parsePropertyName', () => {
    parseIt(parsePropertyName, 'babyChan', 'babyChan')

    it('matches "_baby chan" up to space', () => {
      const p = new Parser('_baby chan')
      const result = parsePropertyName(p)
      expect(result).toEqual('_baby')
      expect(p.next).toEqual(' ')
    })
  })

  describe('parseGroup', () => {
    parseIt(parseGroup, '(Name)', {
      type: 'Group',
      expression: makeNamedRule('Name'),
    })
  })

  describe('parseAlternation', () => {
    parseIt(parseAlternation, 'Rule / OtherRule', {
      type: 'Alternation',
      expressions: [makeNamedRule('Rule'), makeNamedRule('OtherRule')],
    })

    parseIt(parseAlternation, 'Seq1 Seq2 / OtherRule', {
      type: 'Alternation',
      expressions: [
        {
          type: 'Sequence',
          expressions: [makeNamedRule('Seq1'), makeNamedRule('Seq2')],
        },
        makeNamedRule('OtherRule'),
      ],
    })

    parseIt(parseAlternation, '$string RuleName Thing', {
      type: 'Sequence',
      expressions: [
        {
          type: 'ToString',
          expression: makeNamedRule('RuleName'),
        },
        makeNamedRule('Thing'),
      ],
    })

    parseIt(parseAlternation, '$string RuleName^+', {
      type: 'Repetition',
      repetition: 'LexemeOneOrMore',
      expression: {
        type: 'ToString',
        expression: makeNamedRule('RuleName'),
      },
    })
  })

  describe('parseSequence', () => {
    parseIt(parseSequence, 'Seq1 Seq2', {
      type: 'Sequence',
      expressions: [makeNamedRule('Seq1'), makeNamedRule('Seq2')],
    })

    parseIt(parseSequence, 'Cat &!Angry', {
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

    parseIt(parseSequence, 'prop1:Seq1 prop2:Seq2', {
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

  describe('parseAssignment', () => {
    parseIt(parseAssignment, 'prop:TheRuleName', {
      type: 'Assignment',
      propertyName: 'prop',
      expression: makeNamedRule('TheRuleName'),
    })
  })

  describe('parseJoin', () => {
    parseIt(parseJoin, 'TheRuleName % OtherRule', {
      type: 'Join',
      repetition: 'ZeroOrMore',
      expression: makeNamedRule('TheRuleName'),
      joinWith: makeNamedRule('OtherRule'),
    })
  })

  describe('parseLexeme', () => {
    parseIt(parseLexeme, 'TheRuleName ^ OtherRule', {
      type: 'Lexeme',
      expressions: [makeNamedRule('TheRuleName'), makeNamedRule('OtherRule')],
    })
  })

  describe('parseAsConstant', () => {
    parseIt(parseAsConstant, 'TheRuleName $as "blah"', {
      type: 'AsConstant',
      expression: makeNamedRule('TheRuleName'),
      value: {
        type: 'String',
        value: 'blah',
      },
    })
  })

  describe('parseRepetition', () => {
    parseIt(parseRepetition, '(One ^ Two)+', {
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

    parseIt(parseRepetition, 'Three*', {
      type: 'Repetition',
      repetition: 'ZeroOrMore',
      expression: makeNamedRule('Three'),
    })
  })

  describe('parseExpressionLeaf', () => {
    it('does not match "RuleName <-" due to not-predicate in sequence', () => {
      const p = new Parser('RuleName <-')
      const result = parseExpressionLeaf(p)
      expect(result).toEqual(undefined)
      // rewound to beginning by alternation
      expect(p.next).toEqual('R')
    })
  })

  describe('parseConstant', () => {
    parseIt(parseConstant, '"Pumpy"', {
      type: 'String',
      value: 'Pumpy',
    })
  })

  describe('parseString', () => {
    parseIt(parseString, '"oh \\"beard\\""', {
      type: 'String',
      value: 'oh \\"beard\\"',
    })
  })

  describe('parseSpacingRule', () => {
    parseIt(parseSpacingRule, '~', { type: 'SpacingRule' })
  })

  describe('parseAnyCharacter', () => {
    parseIt(parseAnyCharacter, '.', { type: 'AnyCharacter' })
  })

  describe('parseEscapeCode', () => {
    parseIt(parseEscapeCode, '\\w', { type: 'EscapeCode', code: 'w' })
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
    parseIt(parseEscapeSequence, '\\n', {
      type: 'EscapeSequence',
      value: '\n',
    })

    parseIt(parseEscapeSequence, '\\"', {
      type: 'EscapeSequence',
      value: '"',
    })

    it('does not match \\o', () => {
      const p = new Parser('\\o')
      const result = parseEscapeSequence(p)
      expect(result).toEqual(undefined)
    })
  })

  describe('parseNotCharacter', () => {
    parseIt(parseNotCharacter, '! "."', {
      type: 'NotCharacter',
      character: '.',
    })

    parseIt(parseNotCharacter, '! \\\\', {
      type: 'NotCharacter',
      character: {
        type: 'EscapeSequence',
        value: '\\',
      },
    })
  })

  describe('parseNext', () => {
    parseIt(parseNext, '$next', {
      type: 'Next',
    })
  })

  describe('parseToString', () => {
    parseIt(parseToString, '$string RuleName', {
      type: 'ToString',
      expression: makeNamedRule('RuleName'),
    })
  })

  describe('parseTreeRule', () => {
    parseIt(parseTreeRule, 'Tree <= RuleName |% "Oats"', {
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

  describe('parseTreeJoin', () => {
    parseIt(parseTreeJoin, 'RuleName |% "Oats"', {
      type: 'TreeJoin',
      expression: makeNamedRule('RuleName'),
      joinWith: {
        type: 'String',
        value: 'Oats',
      },
    })
  })

  describe('parseTreeRepetition', () => {
    parseIt(parseTreeRepetition, 'RuleName |+', {
      type: 'TreeRepetition',
      expression: makeNamedRule('RuleName'),
    })
  })

  describe('parseTreeSequence', () => {
    parseIt(parseTreeSequence, 'Oats Eater|?', {
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

  describe('parseTreeOption', () => {
    parseIt(parseTreeOption, 'Snakey|?', {
      type: 'TreeOption',
      option: makeNamedRule('Snakey'),
    })
  })

  describe('parseRule', () => {
    const ruleIt = parseIt.bind(null, parseRule)

    ruleIt('Name <- Other', {
      type: 'Rule',
      name: makeNamedRule('Name'),
      expression: makeNamedRule('Other'),
    })

    ruleIt('Spacing <- \\s^+', {
      type: 'Rule',
      name: {
        type: 'RuleName',
        value: 'Spacing',
      },
      expression: {
        type: 'Repetition',
        expression: {
          type: 'EscapeCode',
          code: 's',
        },
        repetition: 'LexemeOneOrMore',
      },
    })

    ruleIt('Grammar <- (Rule / TreeRule)+', {
      type: 'Rule',
      name: {
        type: 'RuleName',
        value: 'Grammar',
      },
      expression: {
        type: 'Repetition',
        expression: {
          type: 'Group',
          expression: {
            type: 'Alternation',
            expressions: [
              {
                type: 'RuleName',
                value: 'Rule',
              },
              {
                type: 'RuleName',
                value: 'TreeRule',
              },
            ],
          },
        },
        repetition: 'OneOrMore',
      },
    })
  })
})
