import { Parser } from './parser'

type ReturnTypeUnion<T extends any[]> = ReturnType<T[number]>

type ParserOp<T> = (p: Parser, obj?: any) => T | undefined

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

export const parseAlternation = <T extends any[]>(...rules: T) => <O>(
  p: Parser,
  obj?: O,
): ReturnTypeUnion<T> | undefined => {
  const { index: initialIndex } = p
  for (const rule of rules) {
    const ruleAst = rule(p, obj)
    if (ruleAst !== undefined) {
      return ruleAst
    }
    // backtrack if a rule didn't match
    p.index = initialIndex
  }
  return undefined
}

export const parseAtLeastOne = <T>(rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): T[] | undefined => {
  const ast: T[] = []
  while (p.hasData()) {
    const ruleAst = rule(p, obj)
    if (ruleAst) {
      ast.push(ruleAst)
      p.skipSpacing()
    }
  }
  return ast.length ? ast : undefined
}

export const parseProperty = <T>(propName: string, rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): T | undefined => {
  const result = rule(p, obj)
  if (!result) {
    return undefined
  }
  ;(obj as any)[propName] = result
  return result
}
