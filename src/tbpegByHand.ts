/* eslint-disable @typescript-eslint/no-use-before-define */
import { Parser, Ast } from './parser'
import {
  alternation,
  atLeastOne,
  constant,
  object,
  property,
  lexeme,
  characterRange,
  lexemeAtLeastOne,
  sequence,
  notPredicate,
  sequenceCustom,
  treeJoin,
  appendProperty,
  treeRepetition,
  treeOptional,
  treeSequenceCustom,
  asConstant,
} from './operators'

export type Grammar = Array<TreeRule | Rule>

export class GrammarParser extends Parser {
  skipSpacing(): void {
    for (
      const { next } = this;
      this.hasData() && (next === ' ' || next === '\t' || next === '\n');
      this.advance()
    ) {}
  }

  parse(): Grammar | undefined {
    this.skipSpacing()
    return parseGrammar(this)
  }
}

export interface RuleName extends Ast<'RuleName'> {
  value: string
}

export interface PropertyName extends Ast<'PropertyName'> {
  value: string
}

export interface Rule extends Ast<'Rule'> {
  name: RuleName
  expression: Expression
}

export type Expression =
  | Alternation
  | Sequence
  | Assignment
  | Join
  | Lexeme
  | Repetition
  | ExpressionLeaf

export interface Alternation extends Ast<'Alternation'> {
  expressions: Array<
    Sequence | Assignment | Join | Lexeme | Repetition | ExpressionLeaf
  >
}

export interface Sequence extends Ast<'Sequence'> {
  expressions: Array<Assignment | Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Assignment extends Ast<'Assignment'> {
  propertyName: PropertyName
  expression: Join | Lexeme | Repetition | ExpressionLeaf
}

export interface Join extends Ast<'Join'> {
  expression: Lexeme | Repetition | ExpressionLeaf
  repetition: 'OneOrMore' | 'ZeroOrMore'
  joinWith: Lexeme | Repetition | ExpressionLeaf
}

export interface Lexeme extends Ast<'Lexeme'> {
  expressions: Array<Repetition | ExpressionLeaf>
}

export interface Repetition extends Ast<'Repetition'> {
  expression: ExpressionLeaf
  repetition:
    | 'OneOrMore'
    | 'ZeroOrMore'
    | 'LexemeOneOrMore'
    | 'LexemeZeroOrMore'
}

export type ExpressionLeaf =
  | Group
  | RuleName
  | SpacingRule
  | EscapeSequence
  | AnyCharacter
  | EscapeCode
  | Enum
  | Characters
  | Next
  | Predicate

export interface Group extends Ast<'Group'> {
  expression: Expression
}

export interface Predicate extends Ast<'Predicate'> {
  expression: Expression
}

export interface String extends Ast<'String'> {
  value: string
}

export interface EscapeSequence extends Ast<'EscapeSequence'> {
  value: string
}

export type SpacingRule = Ast<'SpacingRule'>

export type Constant = String | SpacingRule | EscapeSequence

export type Next = Ast<'Next'>

export type AnyCharacter = Ast<'AnyCharacter'>

export interface EscapeCode extends Ast<'EscapeCode'> {
  code: string
}

export interface Enum extends Ast<'Enum'> {
  expression: EnumValAssignment[]
}

export interface EnumValAssignment extends Ast<'EnumValAssignment'> {
  match: Constant
  enumValue: string
}

export interface Characters extends Ast<'Characters'> {
  matches: Array<CharacterRange | EscapeCode | EscapeSequence>
}

export interface CharacterRange extends Ast<'CharacterRange'> {
  from: string
  to: string
}

export interface TreeRule extends Ast<'TreeRule'> {
  name: RuleName
  expression: TreeExpression
}

export type TreeExpression =
  | TreeRepetition
  | TreeJoin
  | TreeOptions
  | Expression

export interface TreeRepetition extends Ast<'TreeRepetition'> {
  expression: Expression
}

export interface TreeJoin extends Ast<'TreeJoin'> {
  expression: Expression
  joinWith: Constant
}

export interface TreeOptions extends Ast<'TreeOptions'> {
  options: Array<Expression | TreeOption>
}

export interface TreeOption extends Ast<'TreeOption'> {
  option: Assignment | Join | Lexeme | Repetition | ExpressionLeaf
}

const makeRuleName = (): RuleName => ({ type: 'RuleName' } as RuleName)

export const parseRuleName = object(
  makeRuleName,
  property(
    'value',
    lexeme(
      characterRange('A', 'Z'),
      lexemeAtLeastOne(
        alternation(
          characterRange('a', 'z'),
          characterRange('A', 'Z'),
          characterRange('0', '9'),
          constant('_'),
        ),
      ),
    ),
  ),
)

export const parsePropertyName = lexeme(
  alternation(characterRange('a', 'z'), constant('_')),
  lexemeAtLeastOne(
    alternation(
      characterRange('a', 'z'),
      characterRange('A', 'Z'),
      characterRange('0', '9'),
      constant('_'),
    ),
  ),
)

const makeGroup = (): Group => ({ type: 'Group' } as Group)

export const parseGroup = object(
  makeGroup,
  sequence(
    constant('('),
    // must use forwarding function due to cyclic dependency between group and expression
    property('expression', (p: Parser): Expression | undefined =>
      parseExpression(p),
    ),
    constant(')'),
  ),
)

export const parseExpressionLeaf = alternation(
  parseGroup,
  sequenceCustom<RuleName>()(parseRuleName, notPredicate(constant('<'))),
  // TODO: more
)

const makeRepetition = (): Repetition => ({ type: 'Repetition' } as Repetition)

export const parseRepetition = treeSequenceCustom<Repetition['expression']>()(
  makeRepetition,
  property('expression', parseExpressionLeaf),
  treeOptional(
    property(
      'repetition',
      alternation(
        asConstant(constant('+'), 'OneOrMore'),
        asConstant(constant('*'), 'ZeroOrMore'),
        asConstant(constant('^+'), 'LexemeOneOrMore'),
        asConstant(constant('^*'), 'LexemeZeroOrMore'),
      ),
    ),
  ),
)

const makeLexeme = (): Lexeme => ({ type: 'Lexeme', expressions: [] } as Lexeme)

export const parseLexeme = treeJoin(
  makeLexeme,
  appendProperty('expressions', parseRepetition),
  constant('^'),
)

const makeJoin = (): Join => ({ type: 'Join' } as Join)

export const parseJoin = treeSequenceCustom<Join['expression']>()(
  makeJoin,
  property('expression', parseLexeme),
  treeOptional(
    sequence(
      property(
        'repetition',
        alternation(
          asConstant(constant('%+'), 'OneOrMore'),
          asConstant(constant('%'), 'ZeroOrMore'),
        ),
      ),
      property('joinWith', parseLexeme),
    ),
  ),
)

const makeAssignment = (): Assignment => ({ type: 'Assignment' } as Assignment)

export const parseAssignment = treeSequenceCustom<Assignment['expression']>()(
  makeAssignment,
  treeOptional(
    sequence(property('propertyName', parsePropertyName), constant(':')),
  ),
  property('expression', parseJoin),
)

export const parseSequence = treeRepetition(
  (): Sequence => ({ type: 'Sequence', expressions: [] } as Sequence),
  appendProperty('expressions', parseAssignment),
)

const makeAlternation = (): Alternation =>
  ({ type: 'Alternation', expressions: [] } as Alternation)

export const parseAlternation = treeJoin(
  makeAlternation,
  appendProperty('expressions', parseSequence),
  constant('/'),
)

export const parseExpression = parseAlternation

const makeRule = (): Rule => ({ type: 'Rule' } as Rule)

export const parseRule = object(
  makeRule,
  sequence(
    property('name', parseRuleName),
    constant('<-'),
    property('expression', parseExpression),
  ),
)

const makeTreeRule = (): TreeRule => ({ type: 'TreeRule' } as TreeRule)

// TODO:
export const parseTreeExpression = parseExpressionLeaf

export const parseTreeRule = object(
  makeTreeRule,
  sequence(
    property('name', parseRuleName),
    constant('<='),
    property('expression', parseTreeExpression),
  ),
)

const parseGrammar = atLeastOne(alternation(parseRule, parseTreeRule))
