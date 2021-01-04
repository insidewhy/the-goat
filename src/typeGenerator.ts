import {
  Grammar,
  TreeRule,
  Rule,
  Expression,
  TreeExpression,
  Repetition,
} from './tbpegByHand'

type AnyRule = Rule | TreeRule
type AnyExpression = Expression | TreeExpression

type ExpressionType =
  | {
      type: 'object'
      code: string
    }
  | {
      type: 'array'
      code: string
    }
  | {
      // the name of another rule
      type: 'grammarType'
      // the symbol representing the rule
      typeName: string
    }
  | {
      type: 'string' | 'character'
    }

interface RuleContext {
  expression: AnyExpression
  // not set until rule has been generated
  type?: ExpressionType
}

type RuleContexts = Map<string, RuleContext>

function genTypesForRepetition(
  ruleContexts: RuleContexts,
  expression: Repetition,
): string {
  const repeatedExpr = expression.expression
  const repeatedType = genExpressionTypes(ruleContexts, repeatedExpr)

  switch (repeatedType.type) {
    case 'character':
      return 'string'

    case 'string':
      return 'string[]'

    case 'grammarType':
      return repeatedType.typeName + '[]'

    case 'object':
    case 'array':
      return `Array<${repeatedType.code}>`
  }
}

function genExpressionTypes(
  ruleContexts: RuleContexts,
  expression: AnyExpression,
): ExpressionType {
  switch (expression.type) {
    case 'Characters':
      return { type: 'string' }

    case 'Repetition':
      // TODO: type should depend on subtype
      return {
        type: 'grammarType',
        typeName: genTypesForRepetition(ruleContexts, expression),
      }

    default:
      throw new Error(`Unsupported expression type ${expression.type}`)
  }
}

export function generateTypes(grammar: Grammar): string {
  const ruleContexts = new Map<string, RuleContext>()
  for (const rule of grammar) {
    ruleContexts.set(rule.name.value, {
      type: undefined,
      expression: rule.expression,
    })
  }

  let output = ''

  for (const rule of grammar) {
    const ruleName = rule.name.value
    if (ruleName === 'Spacing') {
      continue
    }

    const ruleContext = ruleContexts.get(ruleName)!
    const typeDefinition =
      ruleContext.type ?? genExpressionTypes(ruleContexts, rule.expression)

    ruleContext.type = typeDefinition

    switch (typeDefinition.type) {
      case 'grammarType':
        output += `export type ${ruleName} = ${typeDefinition.typeName}\n`
        break

      case 'array':
        output += `export type ${ruleName} = ${typeDefinition.code}\n`
        break

      case 'object':
        output += `export interface ${ruleName} ${typeDefinition.code}\n`
        break

      case 'string':
      case 'character':
        output += `export type ${ruleName} = string\n`
        break
    }
  }

  return output
}
