import { Parser } from './parser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReturnTypeUnion<T extends any[]> = ReturnType<T[number]>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAlternation<T extends any[]>(
  p: Parser,
  ...rules: T
): ReturnTypeUnion<T> | undefined {
  for (const rule of rules) {
    const ruleAst = rule(p)
    if (ruleAst !== undefined) {
      p.skipSpacing()
      return ruleAst
    }
  }
  return undefined
}

export function parseAtLeastOne<T>(
  p: Parser,
  rule: (p: Parser) => T | undefined,
): T[] | undefined {
  const ast: T[] = []
  while (p.hasData()) {
    const ruleAst = rule(p)
    if (ruleAst) {
      ast.push(ruleAst)
      p.skipSpacing()
    }
  }
  return ast.length ? ast : undefined
}
