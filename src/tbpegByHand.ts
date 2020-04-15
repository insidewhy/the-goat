import { Parser } from './parser'

export type Grammar = Array<TreeRule | Rule>

export interface Ast<T extends string> {
  type: T
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
  expressions: Array<Sequence | Assignment | Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Sequence extends Ast<'Sequence'> {
  expressions: Array<Assignment | Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Assignment extends Ast<'Assignment'> {
  propertyName: PropertyName
  expression: Array<Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Join extends Ast<'Join'> {
  expressions: Array<Lexeme | Repetition | ExpressionLeaf>
}

export interface Lexeme extends Ast<'Lexeme'> {
  expressions: Array<Repetition | ExpressionLeaf>
}

export interface Repetition extends Ast<'Repetition'> {
  expression: ExpressionLeaf
  repetition: 'OneOrMore' | 'ZeroOrMore'
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

export interface Group extends Ast<'Group'> {
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

export type TreeExpression = TreeRepetition | TreeJoin | TreeOptions | Expression

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

function parseSpacing(parser: Parser): void {
  for (
    const { next } = parser;
    next === ' ' || next === '\t' || next === '\n';
    parser.advance()
  ) {}
}

export function parseGrammar(parser: Parser): Grammar {
  // TODO:
  return []
}