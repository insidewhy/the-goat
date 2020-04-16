import { Parser } from './parser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReturnTypeUnion<T extends any[]> = ReturnType<T[number]>

export const parseConstant = (value: string) => (
  p: Parser,
): string | undefined => {
  if (p.data.slice(p.index, p.index + value.length) === value) {
    p.index += value.length
    return value
  } else {
    return undefined
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseAlternation = <T extends any[]>(...rules: T) => (
  p: Parser,
): ReturnTypeUnion<T> | undefined => {
  for (const rule of rules) {
    const ruleAst = rule(p)
    if (ruleAst !== undefined) {
      return ruleAst
    }
  }
  return undefined
}

export const parseAtLeastOne = <T>(rule: (p: Parser) => T | undefined) => (
  p: Parser,
): T[] | undefined => {
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
