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
  notChar,
  spacing,
  wordChar,
} from './operators'

export type Grammar = Array<TreeRule | Rule>

export class GrammarParser extends Parser {
  skipSpacing(): void {
    for (
      let { next } = this;
      this.hasData() && (next === ' ' || next === '\t' || next === '\n');
      this.advance(), next = this.next
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
  | Predicate
  | Join
  | Lexeme
  | Assignment
  | AsConstant
  | Repetition
  | ExpressionLeaf

export interface Alternation extends Ast<'Alternation'> {
  expressions: Array<
    | Sequence
    | Join
    | Lexeme
    | Assignment
    | AsConstant
    | Repetition
    | ExpressionLeaf
    | Predicate
  >
}

export interface Sequence extends Ast<'Sequence'> {
  expressions: Array<
    | Join
    | Lexeme
    | Assignment
    | AsConstant
    | Repetition
    | ExpressionLeaf
    | Predicate
  >
}

export interface Join extends Ast<'Join'> {
  expression: Lexeme | Assignment | AsConstant | Repetition | ExpressionLeaf
  repetition: 'OneOrMore' | 'ZeroOrMore'
  joinWith: Lexeme | Assignment | AsConstant | Repetition | ExpressionLeaf
}

export interface Lexeme extends Ast<'Lexeme'> {
  expressions: Array<Assignment | AsConstant | Repetition | ExpressionLeaf>
}

export interface Assignment extends Ast<'Assignment'> {
  propertyName: PropertyName
  expression: AsConstant | Repetition | ExpressionLeaf
}

export interface AsConstant extends Ast<'AsConstant'> {
  expression: Repetition | ExpressionLeaf
  value: String | EscapeSequence
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
  | Constant
  | SpacingRule
  | EscapeSequence
  | AnyCharacter
  | NotCharacter
  | EscapeCode
  | Characters
  | Next
  | ToString

export interface Group extends Ast<'Group'> {
  expression: Expression
}

export interface Predicate extends Ast<'Predicate'> {
  predicate: 'AndPredicate' | 'NotPredicate'
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

export interface ToString extends Ast<'ToString'> {
  expression: ExpressionLeaf
}

export type AnyCharacter = Ast<'AnyCharacter'>

export interface NotCharacter extends Ast<'NotCharacter'> {
  character: string | EscapeSequence
}

export interface EscapeCode extends Ast<'EscapeCode'> {
  code: string
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

export type TreeExpression = TreeRepetition | TreeJoin | TreeSequence

export interface TreeRepetition extends Ast<'TreeRepetition'> {
  expression: Expression
}

export interface TreeJoin extends Ast<'TreeJoin'> {
  expression: Expression
  joinWith: Constant
}

export interface TreeSequence extends Ast<'TreeSequence'> {
  expressions: Array<
    | Join
    | Lexeme
    | Assignment
    | AsConstant
    | Repetition
    | ExpressionLeaf
    | Predicate
    | TreeOption
  >
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

const makeEscapeSequence = (): EscapeSequence =>
  ({ type: 'EscapeSequence' } as EscapeSequence)

export const parseEscapeSequence = object(
  makeEscapeSequence,
  lexeme(
    constant('\\'),
    property(
      'value',
      alternation(
        constant('\\'),
        asConstant(constant('n'), '\n'),
        constant('"'),
      ),
    ),
  ),
)

const makeString = (): String => ({ type: 'String' } as String)

export const parseString = object(
  makeString,
  lexeme(
    constant('"'),
    property(
      'value',
      lexemeAtLeastOne(alternation(parseEscapeSequence, notChar('"'))),
    ),
    constant('"'),
  ),
)

export const parseSpacingRule = object(
  () => ({ type: 'SpacingRule' }),
  constant('~'),
)

export const parseAnyCharacter = object(
  (): AnyCharacter => ({ type: 'AnyCharacter' }),
  constant('.'),
)

export const parseEscapeCode = object(
  (): EscapeCode => ({ type: 'EscapeCode' } as EscapeCode),
  lexeme(
    constant('\\'),
    property('code', alternation(constant('w'), constant('s'))),
  ),
)

export const parseCharacterRange = object(
  (): CharacterRange => ({ type: 'CharacterRange' } as CharacterRange),
  lexeme(
    property('from', wordChar()),
    constant('-'),
    property('to', wordChar()),
  ),
)

const makeCharacters = (): Characters => ({ type: 'Characters', matches: [] })

export const parseCharacters = object(
  makeCharacters,
  lexeme(
    constant('['),
    property(
      'matches',
      // TODO: this currently matches as a string
      lexemeAtLeastOne(
        alternation(parseCharacterRange, parseEscapeCode, parseEscapeSequence),
      ),
    ),
    constant(']'),
  ),
)

export const parseNotCharacter = object(
  (): NotCharacter => ({ type: 'NotCharacter' } as NotCharacter),
  sequenceCustom<string>()(
    constant('!'),
    alternation(
      property('character', parseEscapeSequence),
      lexeme(constant('"'), property('character', notChar('"')), constant('"')),
    ),
  ),
)

export const parseNext = object(
  (): Next => ({ type: 'Next' }),
  constant('$next'),
)

export const parseToString = object(
  (): ToString => ({ type: 'ToString' } as ToString),
  sequence(
    constant('$string'),
    property(
      'expression',
      (p: Parser): ExpressionLeaf | undefined =>
        parseExpressionLeaf(p) as ExpressionLeaf | undefined,
    ),
  ),
)

export const parseConstant = alternation(
  parseString,
  parseSpacingRule,
  parseEscapeSequence,
)

export const parseExpressionLeaf = alternation(
  parseGroup,
  sequenceCustom<RuleName>()(parseRuleName, notPredicate(constant('<'))),
  parseConstant,
  parseAnyCharacter,
  parseEscapeCode,
  parseCharacters,
  parseNotCharacter,
  parseNext,
  parseToString,
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

const makeAsConstant = (): AsConstant => ({ type: 'AsConstant' } as AsConstant)

// disable automatic whitespace skipping due to use of `spacing`
export const parseAsConstant = treeSequenceCustom<AsConstant['expression']>(
  false,
)(
  makeAsConstant,
  property('expression', parseRepetition),
  treeOptional(
    sequenceCustom(false)(
      spacing(),
      constant('$as'),
      spacing(),
      property('value', alternation(parseString, parseEscapeSequence)),
    ),
  ),
)

const makeAssignment = (): Assignment => ({ type: 'Assignment' } as Assignment)

export const parseAssignment = treeSequenceCustom<Assignment['expression']>()(
  makeAssignment,
  treeOptional(
    sequence(property('propertyName', parsePropertyName), constant(':')),
  ),
  property('expression', parseAsConstant),
)

const makeLexeme = (): Lexeme => ({ type: 'Lexeme', expressions: [] } as Lexeme)

export const parseLexeme = treeJoin(
  makeLexeme,
  appendProperty('expressions', parseAssignment),
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

const makePredicate = (): Predicate => ({ type: 'Predicate' } as Predicate)

export const parsePredicate = object(
  makePredicate,
  sequence(
    property(
      'predicate',
      alternation(
        asConstant(constant('&!'), 'NotPredicate'),
        asConstant(constant('&'), 'AndPredicate'),
      ),
    ),
    property('expression', parseExpressionLeaf),
  ),
)

export const parseSequence = treeRepetition(
  (): Sequence => ({ type: 'Sequence', expressions: [] } as Sequence),
  appendProperty('expressions', alternation(parseJoin, parsePredicate)),
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

const makeTreeOption = (): TreeOption => ({ type: 'TreeOption' } as TreeOption)

export const parseTreeOption = object(
  makeTreeOption,
  sequenceCustom<Assignment | Assignment['expression']>()(
    property('option', parseAssignment),
    constant('|?'),
  ),
)

const makeTreeSequence = (): TreeSequence => ({
  type: 'TreeSequence',
  expressions: [],
})

export const parseTreeSequence = object(
  makeTreeSequence,
  atLeastOne(
    appendProperty(
      'expressions',
      alternation(parseTreeOption, parseJoin, parsePredicate),
    ),
  ),
)

const makeTreeJoin = (): TreeJoin => ({ type: 'TreeJoin' } as TreeJoin)

export const parseTreeJoin = object(
  makeTreeJoin,
  sequenceCustom<[string, string]>()(
    property('expression', parseExpression),
    constant('|%'),
    property('joinWith', parseConstant),
  ),
)

const makeTreeRepetition = (): TreeRepetition =>
  ({ type: 'TreeRepetition' } as TreeRepetition)

export const parseTreeRepetition = object(
  makeTreeRepetition,
  sequenceCustom<Expression>()(
    property('expression', parseExpression),
    constant('|+'),
  ),
)

export const parseTreeExpression = alternation(
  parseTreeRepetition,
  parseTreeJoin,
  parseTreeSequence,
)

const makeTreeRule = (): TreeRule => ({ type: 'TreeRule' } as TreeRule)

export const parseTreeRule = object(
  makeTreeRule,
  sequence(
    property('name', parseRuleName),
    constant('<='),
    property('expression', parseTreeExpression),
  ),
)

const parseGrammar = atLeastOne(alternation(parseRule, parseTreeRule))
