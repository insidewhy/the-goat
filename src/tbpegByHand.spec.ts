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
import { alternation } from './operators'

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
    it('matches [a-z]', () => {
      const p = new Parser('[a-z]')
      const result = parseCharacters(p)
      expect(result).toEqual({
        type: 'Characters',
        matches: [{ type: 'CharacterRange', from: 'a', to: 'z' }],
      })
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

  // Has each of the rules in tbpeg.tbpeg in the order they appear in that file
  describe('parse expression', () => {
    const parseRuleOrTreeRule = alternation(parseRule, parseTreeRule)
    const ruleIt = parseIt.bind(null, parseRuleOrTreeRule)

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

    ruleIt('RuleName <= value:([A-Z] ^ [a-zA-Z0-9_]^+)', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'RuleName',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'value',
            expression: {
              type: 'Group',
              expression: {
                type: 'Lexeme',
                expressions: [
                  {
                    type: 'Characters',
                    matches: [
                      {
                        type: 'CharacterRange',
                        from: 'A',
                        to: 'Z',
                      },
                    ],
                  },
                  {
                    type: 'Repetition',
                    expression: {
                      type: 'Characters',
                      matches: [
                        {
                          type: 'CharacterRange',
                          from: 'a',
                          to: 'z',
                        },
                        {
                          type: 'CharacterRange',
                          from: 'A',
                          to: 'Z',
                        },
                        {
                          type: 'CharacterRange',
                          from: '0',
                          to: '9',
                        },
                        '_',
                      ],
                    },
                    repetition: 'LexemeOneOrMore',
                  },
                ],
              },
            },
          },
        ],
      },
    })

    ruleIt('PropertyName <- [a-z_] ^ [a-zA-Z0-9_]^+', {
      type: 'Rule',
      name: {
        type: 'RuleName',
        value: 'PropertyName',
      },
      expression: {
        type: 'Lexeme',
        expressions: [
          {
            type: 'Characters',
            matches: [
              {
                type: 'CharacterRange',
                from: 'a',
                to: 'z',
              },
              '_',
            ],
          },
          {
            type: 'Repetition',
            expression: {
              type: 'Characters',
              matches: [
                {
                  type: 'CharacterRange',
                  from: 'a',
                  to: 'z',
                },
                {
                  type: 'CharacterRange',
                  from: 'A',
                  to: 'Z',
                },
                {
                  type: 'CharacterRange',
                  from: '0',
                  to: '9',
                },
                '_',
              ],
            },
            repetition: 'LexemeOneOrMore',
          },
        ],
      },
    })

    ruleIt('Rule <= name:RuleName "<-" expression:Expression', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Rule',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'name',
            expression: {
              type: 'RuleName',
              value: 'RuleName',
            },
          },
          {
            type: 'String',
            value: '<-',
          },
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'RuleName',
              value: 'Expression',
            },
          },
        ],
      },
    })

    ruleIt('Expression <- $next', {
      type: 'Rule',
      name: {
        type: 'RuleName',
        value: 'Expression',
      },
      expression: {
        type: 'Next',
      },
    })

    ruleIt('Alternation <= expressions:$next |% "/"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Alternation',
      },
      expression: {
        type: 'TreeJoin',
        expression: {
          type: 'Assignment',
          propertyName: 'expressions',
          expression: {
            type: 'Next',
          },
        },
        joinWith: {
          type: 'String',
          value: '/',
        },
      },
    })

    ruleIt('Sequence <= expressions:($next / Predicate)|+', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Sequence',
      },
      expression: {
        type: 'TreeRepetition',
        expression: {
          type: 'Assignment',
          propertyName: 'expressions',
          expression: {
            type: 'Group',
            expression: {
              type: 'Alternation',
              expressions: [
                {
                  type: 'Next',
                },
                {
                  type: 'RuleName',
                  value: 'Predicate',
                },
              ],
            },
          },
        },
      },
    })

    ruleIt(
      `Join <= expression:$next (
        repetition:("%+" $as "OneOrMore" / "%" $as "ZeroOrMore")
        joinWith:$next
      )|?`,
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'Join',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'Assignment',
              propertyName: 'expression',
              expression: {
                type: 'Next',
              },
            },
            {
              type: 'TreeOption',
              option: {
                type: 'Group',
                expression: {
                  type: 'Sequence',
                  expressions: [
                    {
                      type: 'Assignment',
                      propertyName: 'repetition',
                      expression: {
                        type: 'Group',
                        expression: {
                          type: 'Alternation',
                          expressions: [
                            {
                              type: 'AsConstant',
                              expression: {
                                type: 'String',
                                value: '%+',
                              },
                              value: {
                                type: 'String',
                                value: 'OneOrMore',
                              },
                            },
                            {
                              type: 'AsConstant',
                              expression: {
                                type: 'String',
                                value: '%',
                              },
                              value: {
                                type: 'String',
                                value: 'ZeroOrMore',
                              },
                            },
                          ],
                        },
                      },
                    },
                    {
                      type: 'Assignment',
                      propertyName: 'joinWith',
                      expression: {
                        type: 'Next',
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    )

    ruleIt('Lexeme <= expressions:$next |% "^"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Lexeme',
      },
      expression: {
        type: 'TreeJoin',
        expression: {
          type: 'Assignment',
          propertyName: 'expressions',
          expression: {
            type: 'Next',
          },
        },
        joinWith: {
          type: 'String',
          value: '^',
        },
      },
    })

    ruleIt('Assignment <= (propertyName:PropertyName ":")|? expression:$next', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Assignment',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'TreeOption',
            option: {
              type: 'Group',
              expression: {
                type: 'Sequence',
                expressions: [
                  {
                    type: 'Assignment',
                    propertyName: 'propertyName',
                    expression: {
                      type: 'RuleName',
                      value: 'PropertyName',
                    },
                  },
                  {
                    type: 'String',
                    value: ':',
                  },
                ],
              },
            },
          },
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'Next',
            },
          },
        ],
      },
    })

    ruleIt(
      'AsConstant <= expression:$next (~ "$as" ~ value:(String / EscapeSequence))|?',
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'AsConstant',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'Assignment',
              propertyName: 'expression',
              expression: {
                type: 'Next',
              },
            },
            {
              type: 'TreeOption',
              option: {
                type: 'Group',
                expression: {
                  type: 'Sequence',
                  expressions: [
                    {
                      type: 'SpacingRule',
                    },
                    {
                      type: 'String',
                      value: '$as',
                    },
                    {
                      type: 'SpacingRule',
                    },
                    {
                      type: 'Assignment',
                      propertyName: 'value',
                      expression: {
                        type: 'Group',
                        expression: {
                          type: 'Alternation',
                          expressions: [
                            {
                              type: 'RuleName',
                              value: 'String',
                            },
                            {
                              type: 'RuleName',
                              value: 'EscapeSequence',
                            },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
      },
    )

    ruleIt(
      `Repetition <= expression:$next repetition:(
        "+" $as "OneOrMore" /
        "*" $as "ZeroOrMore" /
        "^+" $as "LexemeOneOrMore" /
        "^*" $as "LexemeZeroOrMore"
      )|?`,
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'Repetition',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'Assignment',
              propertyName: 'expression',
              expression: {
                type: 'Next',
              },
            },
            {
              type: 'TreeOption',
              option: {
                type: 'Assignment',
                propertyName: 'repetition',
                expression: {
                  type: 'Group',
                  expression: {
                    type: 'Alternation',
                    expressions: [
                      {
                        type: 'AsConstant',
                        expression: {
                          type: 'String',
                          value: '+',
                        },
                        value: {
                          type: 'String',
                          value: 'OneOrMore',
                        },
                      },
                      {
                        type: 'AsConstant',
                        expression: {
                          type: 'String',
                          value: '*',
                        },
                        value: {
                          type: 'String',
                          value: 'ZeroOrMore',
                        },
                      },
                      {
                        type: 'AsConstant',
                        expression: {
                          type: 'String',
                          value: '^+',
                        },
                        value: {
                          type: 'String',
                          value: 'LexemeOneOrMore',
                        },
                      },
                      {
                        type: 'AsConstant',
                        expression: {
                          type: 'String',
                          value: '^*',
                        },
                        value: {
                          type: 'String',
                          value: 'LexemeZeroOrMore',
                        },
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    )

    ruleIt(
      `ExpressionLeaf <-
        Group /
        RuleName &!"<" /
        Constant /
        AnyCharacter /
        EscapeCode /
        Characters /
        NotCharacter /
        Next /
        ToString`,
      {
        type: 'Rule',
        name: {
          type: 'RuleName',
          value: 'ExpressionLeaf',
        },
        expression: {
          type: 'Alternation',
          expressions: [
            {
              type: 'RuleName',
              value: 'Group',
            },
            {
              type: 'Sequence',
              expressions: [
                {
                  type: 'RuleName',
                  value: 'RuleName',
                },
                {
                  type: 'Predicate',
                  predicate: 'NotPredicate',
                  expression: {
                    type: 'String',
                    value: '<',
                  },
                },
              ],
            },
            {
              type: 'RuleName',
              value: 'Constant',
            },
            {
              type: 'RuleName',
              value: 'AnyCharacter',
            },
            {
              type: 'RuleName',
              value: 'EscapeCode',
            },
            {
              type: 'RuleName',
              value: 'Characters',
            },
            {
              type: 'RuleName',
              value: 'NotCharacter',
            },
            {
              type: 'RuleName',
              value: 'Next',
            },
            {
              type: 'RuleName',
              value: 'ToString',
            },
          ],
        },
      },
    )

    ruleIt('ToString <= "$string" ExpressionLeaf', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'ToString',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'String',
            value: '$string',
          },
          {
            type: 'RuleName',
            value: 'ExpressionLeaf',
          },
        ],
      },
    })

    ruleIt(
      'Predicate <= predicate:("&!" $as "NotPredicate" / "&" $as "AndPredicate") expression:ExpressionLeaf',
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'Predicate',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'Assignment',
              propertyName: 'predicate',
              expression: {
                type: 'Group',
                expression: {
                  type: 'Alternation',
                  expressions: [
                    {
                      type: 'AsConstant',
                      expression: {
                        type: 'String',
                        value: '&!',
                      },
                      value: {
                        type: 'String',
                        value: 'NotPredicate',
                      },
                    },
                    {
                      type: 'AsConstant',
                      expression: {
                        type: 'String',
                        value: '&',
                      },
                      value: {
                        type: 'String',
                        value: 'AndPredicate',
                      },
                    },
                  ],
                },
              },
            },
            {
              type: 'Assignment',
              propertyName: 'expression',
              expression: {
                type: 'RuleName',
                value: 'ExpressionLeaf',
              },
            },
          ],
        },
      },
    )

    ruleIt('Group <= "(" expression:Expression ")"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Group',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'String',
            value: '(',
          },
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'RuleName',
              value: 'Expression',
            },
          },
          {
            type: 'String',
            value: ')',
          },
        ],
      },
    })

    ruleIt('String <= \\" ^ value:($string EscapeSequence / ! \\")^+ ^ \\"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'String',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Lexeme',
            expressions: [
              {
                type: 'EscapeSequence',
                value: '"',
              },
              {
                type: 'Assignment',
                propertyName: 'value',
                expression: {
                  type: 'Repetition',
                  expression: {
                    type: 'Group',
                    expression: {
                      type: 'Alternation',
                      expressions: [
                        {
                          type: 'ToString',
                          expression: {
                            type: 'RuleName',
                            value: 'EscapeSequence',
                          },
                        },
                        {
                          type: 'NotCharacter',
                          character: {
                            type: 'EscapeSequence',
                            value: '"',
                          },
                        },
                      ],
                    },
                  },
                  repetition: 'LexemeOneOrMore',
                },
              },
              {
                type: 'EscapeSequence',
                value: '"',
              },
            ],
          },
        ],
      },
    })

    ruleIt(
      'EscapeSequence <= \\\\ ^ value:(\\\\ / "n" $as \\n / \\" / \\[ / \\])',
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'EscapeSequence',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'Lexeme',
              expressions: [
                {
                  type: 'EscapeSequence',
                  value: '\\',
                },
                {
                  type: 'Assignment',
                  propertyName: 'value',
                  expression: {
                    type: 'Group',
                    expression: {
                      type: 'Alternation',
                      expressions: [
                        {
                          type: 'EscapeSequence',
                          value: '\\',
                        },
                        {
                          type: 'AsConstant',
                          expression: {
                            type: 'String',
                            value: 'n',
                          },
                          value: {
                            type: 'EscapeSequence',
                            value: '\n',
                          },
                        },
                        {
                          type: 'EscapeSequence',
                          value: '"',
                        },
                        {
                          type: 'EscapeSequence',
                          value: '[',
                        },
                        {
                          type: 'EscapeSequence',
                          value: ']',
                        },
                      ],
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    )

    ruleIt('SpacingRule <= "~"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'SpacingRule',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'String',
            value: '~',
          },
        ],
      },
    })

    ruleIt('Constant <- String / SpacingRule / EscapeSequence', {
      type: 'Rule',
      name: {
        type: 'RuleName',
        value: 'Constant',
      },
      expression: {
        type: 'Alternation',
        expressions: [
          {
            type: 'RuleName',
            value: 'String',
          },
          {
            type: 'RuleName',
            value: 'SpacingRule',
          },
          {
            type: 'RuleName',
            value: 'EscapeSequence',
          },
        ],
      },
    })

    ruleIt('Next <= "$next"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'Next',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'String',
            value: '$next',
          },
        ],
      },
    })

    ruleIt('ToString <= "$string" expression:ExpressionLeaf', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'ToString',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'String',
            value: '$string',
          },
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'RuleName',
              value: 'ExpressionLeaf',
            },
          },
        ],
      },
    })

    ruleIt('AnyCharacter <= "."', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'AnyCharacter',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'String',
            value: '.',
          },
        ],
      },
    })

    ruleIt(
      'NotCharacter <= "!" (character:EscapeSequence / \\" ^ character:(! \\") ^ \\")',
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'NotCharacter',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'String',
              value: '!',
            },
            {
              type: 'Group',
              expression: {
                type: 'Alternation',
                expressions: [
                  {
                    type: 'Assignment',
                    propertyName: 'character',
                    expression: {
                      type: 'RuleName',
                      value: 'EscapeSequence',
                    },
                  },
                  {
                    type: 'Lexeme',
                    expressions: [
                      {
                        type: 'EscapeSequence',
                        value: '"',
                      },
                      {
                        type: 'Assignment',
                        propertyName: 'character',
                        expression: {
                          type: 'Group',
                          expression: {
                            type: 'NotCharacter',
                            character: {
                              type: 'EscapeSequence',
                              value: '"',
                            },
                          },
                        },
                      },
                      {
                        type: 'EscapeSequence',
                        value: '"',
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      },
    )

    ruleIt('EscapeCode <= \\\\ ^ code:("w" / "s")', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'EscapeCode',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Lexeme',
            expressions: [
              {
                type: 'EscapeSequence',
                value: '\\',
              },
              {
                type: 'Assignment',
                propertyName: 'code',
                expression: {
                  type: 'Group',
                  expression: {
                    type: 'Alternation',
                    expressions: [
                      {
                        type: 'String',
                        value: 'w',
                      },
                      {
                        type: 'String',
                        value: 's',
                      },
                    ],
                  },
                },
              },
            ],
          },
        ],
      },
    })

    ruleIt(
      'Characters <= "[" ^ matches:(CharacterRange / EscapeCode / EscapeSequence / ! \\])^+ ^ "]"',
      {
        type: 'TreeRule',
        name: {
          type: 'RuleName',
          value: 'Characters',
        },
        expression: {
          type: 'TreeSequence',
          expressions: [
            {
              type: 'Lexeme',
              expressions: [
                {
                  type: 'String',
                  value: '[',
                },
                {
                  type: 'Assignment',
                  propertyName: 'matches',
                  expression: {
                    type: 'Repetition',
                    expression: {
                      type: 'Group',
                      expression: {
                        type: 'Alternation',
                        expressions: [
                          {
                            type: 'RuleName',
                            value: 'CharacterRange',
                          },
                          {
                            type: 'RuleName',
                            value: 'EscapeCode',
                          },
                          {
                            type: 'RuleName',
                            value: 'EscapeSequence',
                          },
                          {
                            type: 'NotCharacter',
                            character: {
                              type: 'EscapeSequence',
                              value: ']',
                            },
                          },
                        ],
                      },
                    },
                    repetition: 'LexemeOneOrMore',
                  },
                },
                {
                  type: 'String',
                  value: ']',
                },
              ],
            },
          ],
        },
      },
    )

    ruleIt('CharacterRange <= from:\\w ^ "-" ^ to:\\w', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'CharacterRange',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Lexeme',
            expressions: [
              {
                type: 'Assignment',
                propertyName: 'from',
                expression: {
                  type: 'EscapeCode',
                  code: 'w',
                },
              },
              {
                type: 'String',
                value: '-',
              },
              {
                type: 'Assignment',
                propertyName: 'to',
                expression: {
                  type: 'EscapeCode',
                  code: 'w',
                },
              },
            ],
          },
        ],
      },
    })

    ruleIt('TreeRule <= name:RuleName "<=" expression:TreeExpression', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'TreeRule',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'name',
            expression: {
              type: 'RuleName',
              value: 'RuleName',
            },
          },
          {
            type: 'String',
            value: '<=',
          },
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'RuleName',
              value: 'TreeExpression',
            },
          },
        ],
      },
    })

    ruleIt('TreeExpression <- TreeRepetition / TreeJoin / TreeSequence', {
      type: 'Rule',
      name: {
        type: 'RuleName',
        value: 'TreeExpression',
      },
      expression: {
        type: 'Alternation',
        expressions: [
          {
            type: 'RuleName',
            value: 'TreeRepetition',
          },
          {
            type: 'RuleName',
            value: 'TreeJoin',
          },
          {
            type: 'RuleName',
            value: 'TreeSequence',
          },
        ],
      },
    })

    ruleIt('TreeRepetition <= expression:Expression "|+"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'TreeRepetition',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'RuleName',
              value: 'Expression',
            },
          },
          {
            type: 'String',
            value: '|+',
          },
        ],
      },
    })

    ruleIt('TreeJoin <= expression:Expression "|%" joinWith:Constant', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'TreeJoin',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'expression',
            expression: {
              type: 'RuleName',
              value: 'Expression',
            },
          },
          {
            type: 'String',
            value: '|%',
          },
          {
            type: 'Assignment',
            propertyName: 'joinWith',
            expression: {
              type: 'RuleName',
              value: 'Constant',
            },
          },
        ],
      },
    })

    ruleIt('TreeSequence <= expressions:(TreeOption / Join / Predicate)+', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'TreeSequence',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'expressions',
            expression: {
              type: 'Repetition',
              expression: {
                type: 'Group',
                expression: {
                  type: 'Alternation',
                  expressions: [
                    {
                      type: 'RuleName',
                      value: 'TreeOption',
                    },
                    {
                      type: 'RuleName',
                      value: 'Join',
                    },
                    {
                      type: 'RuleName',
                      value: 'Predicate',
                    },
                  ],
                },
              },
              repetition: 'OneOrMore',
            },
          },
        ],
      },
    })

    ruleIt('TreeOption <= option:Join "|?"', {
      type: 'TreeRule',
      name: {
        type: 'RuleName',
        value: 'TreeOption',
      },
      expression: {
        type: 'TreeSequence',
        expressions: [
          {
            type: 'Assignment',
            propertyName: 'option',
            expression: {
              type: 'RuleName',
              value: 'Join',
            },
          },
          {
            type: 'String',
            value: '|?',
          },
        ],
      },
    })
  })
})
