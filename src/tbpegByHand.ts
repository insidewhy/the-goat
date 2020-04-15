import { Parser } from './parser'

export type Grammar = Array<TreeRule | Rule>

export interface RuleName {
  type: 'RuleName'
  value: string
}

export interface PropertyName {
  type: 'PropertyName'
  value: string
}

export interface Rule {
  type: 'Rule'
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

export interface Alternation {
  type: 'Alternation'
  expressions: Array<Sequence | Assignment | Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Sequence {
  type: 'Sequence'
  expressions: Array<Assignment | Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Assignment {
  type: 'Assignment'
  propertyName: PropertyName
  expression: Array<Join | Lexeme | Repetition | ExpressionLeaf>
}

export interface Join {
  type: 'Join'
  expressions: Array<Lexeme | Repetition | ExpressionLeaf>
}

export interface Lexeme {
  type: 'Lexeme'
  expressions: Array<Repetition | ExpressionLeaf>
}

export interface Repetition {
  type: 'Repetition'
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

export interface Group {
  type: 'Group'
  expression: Expression
}

export interface String {
  type: 'String'
  value: string
}

export interface EscapeSequence {
  type: 'EscapeSequence'
  value: string
}

export interface SpacingRule {
  type: 'SpacingRule'
}

export type Constant = String | SpacingRule | EscapeSequence

export interface Next {
  type: 'Next'
}

export interface AnyCharacter {
  type: 'AnyCharacter'
}

export interface EscapeCode {
  type: 'EscapeCode'
  code: string
}

export interface Enum {
  type: 'Enum'
  expression: EnumValAssignment[]
}

export interface EnumValAssignment {
  type: 'EnumValAssignment'
  match: Constant
  enumValue: string
}

export interface Characters {
  type: 'Characters'
  matches: Array<CharacterRange | EscapeCode | EscapeSequence>
}

export interface CharacterRange {
  type: 'CharacterRange'
  from: string
  to: string
}

export interface TreeRule {
  type: 'TreeRule'
  name: RuleName
  expression: TreeExpression
}

export type TreeExpression = TreeRepetition | TreeJoin | TreeOptions | Expression

export interface TreeRepetition {
  type: 'TreeRepetition'
  expression: Expression
}

export interface TreeJoin {
  type: 'TreeJoin'
  expression: Expression
  joinWith: Constant
}

export interface TreeOptions {
  type: 'TreeOptions'
  options: Array<Expression | TreeOption>
}

export interface TreeOption {
  type: 'TreeOption'
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
