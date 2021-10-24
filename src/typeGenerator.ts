import {
  Grammar,
  Expression,
  TreeExpression,
  Repetition,
  Lexeme,
  Alternation,
} from './tbpegByHand'

type AnyExpression = Expression | TreeExpression

// stack of the pending rules currently being generated
type Stack = string[]

type NonUnionType = {
  // 'complex' is used for type that does not represent an interface e.g. array of interfaces
  // and 'object' is used for a type that represents an interface i.e. result of a tree rule
  type: 'complex' | 'object' | 'string' | 'character'
  // the typescript code for the type
  code: string
}

interface UnionType {
  type: 'union'
  types: NonUnionType[]
  code?: string
}

type ExpressionType = NonUnionType | UnionType

const getCodeForUnionType = (union: UnionType): string =>
  union.types.map((subType) => subType.code).join(' | ')

interface RuleContext {
  expression: AnyExpression
  // not set until rule has been generated
  type?: ExpressionType
}

type RuleContexts = Map<string, RuleContext>

interface Context {
  rules: RuleContexts
  // needed to resolve $next
  ruleOrder: Array<{
    name: string
    context: RuleContext
  }>
}

const currentRule = (stack: Stack): string => stack[stack.length - 1]

const isLexemeRepetition = (expression: Repetition) =>
  expression.repetition === 'LexemeOneOrMore' ||
  expression.repetition === 'LexemeZeroOrMore'

function genTypesForRepetition(
  stack: Stack,
  context: Context,
  ruleIdx: number,
  expression: Repetition,
): ExpressionType {
  const repeatedExpr = expression.expression
  const repeatedType = genExpressionTypes(stack, context, ruleIdx, repeatedExpr)

  switch (repeatedType.type) {
    case 'character':
      return isLexemeRepetition(expression)
        ? // stringLexemeAtLeastOne parser
          { type: 'string', code: 'string' }
        : // atLeastOne parser
          { type: 'complex', code: 'string[]' }

    case 'string':
    case 'object':
      return isLexemeRepetition(expression)
        ? // lexemeAtLeastOne parser
          { type: 'string', code: 'string' }
        : // atLeastOne parser
          {
            type: 'complex',
            code: `${repeatedType.code}[]`,
          }

    case 'union':
      return {
        type: 'complex',
        code: `Array<${getCodeForUnionType(repeatedType)}>`,
      }

    case 'complex':
      return {
        type: 'complex',
        code: `Array<${repeatedType.code}>`,
      }
  }
}

function genTypesForLexeme(
  stack: Stack,
  context: Context,
  ruleIdx: number,
  expression: Lexeme,
): ExpressionType {
  for (const subExpression of expression.expressions) {
    const subType = genExpressionTypes(stack, context, ruleIdx, subExpression)
    if (subType.type !== 'string' && subType.type !== 'character') {
      // TODO: this rule should be allowed when the type contains property assignments
      throw new Error(
        `${currentRule(
          stack,
        )}: lexmes may only contain subexpressions that return strings`,
      )
    }
  }

  // can return a complex type when subexpressions use property assignments
  return { type: 'string', code: 'string' }
}

// Ensure that:
//  * There is at most one string in the union
//  * There can not be a character in the union if there is a string in the union
//  * Nested unions are expanded into the union
//  * No duplicate types in the union (although duplicate aliases for the same type
//    are allowed to improve readability)
function genTypesForAlternation(
  stack: Stack,
  context: Context,
  ruleIdx: number,
  expression: Alternation,
): ExpressionType {
  const types: NonUnionType[] = []
  const seenCode = new Set<string>()

  for (const subExpression of expression.expressions) {
    const subType = genExpressionTypes(stack, context, ruleIdx, subExpression)
    switch (subType.type) {
      case 'union': {
        for (const subUnionType of subType.types) {
          const { code } = subUnionType
          if (!seenCode.has(code)) {
            types.push(subUnionType)
            seenCode.add(code)
          }
        }
        break
      }

      default: {
        const { code } = subType
        if (!seenCode.has(code)) {
          types.push(subType)
          seenCode.add(code)
        }
      }
    }
  }

  // erase string type when it is also supplied by a reference to a rule
  let stringIdx = -1
  let hasString = false
  for (let i = 0; i < types.length; ++i) {
    const typeDef = types[i]
    if (typeDef.type === 'string' || typeDef.type === 'character') {
      if (typeDef.code === 'string') {
        if (hasString) {
          types.splice(i, 1)
          // there can be at most one due to the checks against seenCode above
          break
        } else {
          stringIdx = i
          hasString = true
        }
      } else if (stringIdx !== -1) {
        types.splice(stringIdx, 1)
        break
      } else {
        hasString = true
      }
    }
  }

  if (types.length === 1) {
    return types[0]
  } else {
    return { type: 'union', types }
  }
}

function getNextStack(stack: Stack, ruleName: string): string[] {
  const nextRuleStack = [...stack, ruleName]
  if (stack.includes(ruleName)) {
    throw new Error(
      `Detected recursively dependent rules: ${nextRuleStack.join(' -> ')}`,
    )
  }
  return nextRuleStack
}

function genExpressionTypes(
  stack: Stack,
  context: Context,
  ruleIdx: number,
  expression: AnyExpression,
): ExpressionType {
  switch (expression.type) {
    case 'Characters':
      return { type: 'character', code: 'string' }

    case 'Repetition':
      return genTypesForRepetition(stack, context, ruleIdx, expression)

    case 'Lexeme':
      return genTypesForLexeme(stack, context, ruleIdx, expression)

    case 'Alternation':
      return genTypesForAlternation(stack, context, ruleIdx, expression)

    case 'RuleName': {
      const ruleName = expression.value
      const ruleContext = context.rules.get(ruleName)!
      if (ruleContext.type) {
        return { ...ruleContext.type, code: ruleName }
      } else {
        const nextRuleStack = getNextStack(stack, ruleName)
        const nextRuleIdx = context.ruleOrder.findIndex(
          ({ name }) => name === ruleName,
        )
        const typeDefinition = genExpressionTypes(
          nextRuleStack,
          context,
          nextRuleIdx,
          ruleContext.expression,
        )
        ruleContext.type = typeDefinition
        return { ...typeDefinition, code: ruleName }
      }
    }

    case 'Next': {
      const nextRuleIdx = ruleIdx + 1
      const next = context.ruleOrder[nextRuleIdx]
      const ruleName = next.name
      const ruleContext = next.context
      if (ruleContext.type) {
        return { ...ruleContext.type, code: ruleName }
      } else {
        const nextRuleStack = getNextStack(stack, ruleName)
        const typeDefinition = genExpressionTypes(
          nextRuleStack,
          context,
          nextRuleIdx,
          ruleContext.expression,
        )
        ruleContext.type = typeDefinition
        return { ...typeDefinition, code: ruleName }
      }
    }

    default:
      throw new Error(`Unsupported expression type ${expression.type}`)
  }
}

export function generateTypes(grammar: Grammar): string {
  const context: Context = {
    rules: new Map(),
    ruleOrder: [],
  }
  for (const rule of grammar) {
    const ruleContext = {
      type: undefined,
      expression: rule.expression,
    }
    context.rules.set(rule.name.value, ruleContext)
    context.ruleOrder.push({
      name: rule.name.value,
      context: ruleContext,
    })
  }

  const output: string[] = []

  for (let ruleIdx = 0; ruleIdx < grammar.length; ++ruleIdx) {
    const rule = grammar[ruleIdx]
    const ruleName = rule.name.value
    if (ruleName === 'Spacing') {
      continue
    }

    const stack = [ruleName]
    const ruleContext = context.rules.get(ruleName)!
    const typeDefinition =
      ruleContext.type ??
      genExpressionTypes(stack, context, ruleIdx, rule.expression)

    ruleContext.type = { ...typeDefinition, code: ruleName }

    switch (typeDefinition.type) {
      case 'complex':
      case 'string':
      case 'character':
        output.push(`export type ${ruleName} = ${typeDefinition.code}`)
        break

      case 'object':
        output.push(`export interface ${ruleName} ${typeDefinition.code}`)
        break

      case 'union':
        output.push(
          `export type ${ruleName} = ${getCodeForUnionType(typeDefinition)}`,
        )
        break
    }
  }

  return output.join('\n')
}
