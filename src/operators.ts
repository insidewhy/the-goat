import { Parser } from './parser'

type ReturnTypeUnion<T extends any[]> = ReturnType<T[number]>

type ParserOp<T> = (p: Parser, obj?: any) => T | undefined

export const constant = (value: string) => (p: Parser): string | undefined => {
  if (p.data.slice(p.index, p.index + value.length) === value) {
    p.index += value.length
    return value
  } else {
    return undefined
  }
}

export const alternation = <T extends any[]>(...rules: T) => <O>(
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
    p.restoreIndex(initialIndex)
  }
  return undefined
}

export const atLeastOne = <T>(rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): T[] | undefined => {
  const ast: T[] = []
  let backupIndex = p.index
  while (p.hasData()) {
    const ruleAst = rule(p, obj)
    if (ruleAst) {
      ast.push(ruleAst)
      backupIndex = p.index
      p.skipSpacing()
    } else {
      p.restoreIndex(backupIndex)
      break
    }
  }
  return ast.length ? ast : undefined
}

export const characterRange = (from: string, to: string) => (
  p: Parser,
): string | undefined => {
  const { next } = p
  if (next >= from && next <= to) {
    p.advance()
    return next
  } else {
    return undefined
  }
}

export const lexeme = <T extends any[]>(...rules: T) => <O>(
  p: Parser,
  obj?: O,
): string | undefined => {
  const start = p.index
  for (const rule of rules) {
    if (!rule(p, obj)) {
      return undefined
    }
  }
  return p.data.slice(start, p.index)
}

export const lexemeAtLeastOne = <T>(rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): string | undefined => {
  const startIndex = p.index
  while (p.hasData() && rule(p, obj)) {}
  return p.index === startIndex ? undefined : p.data.slice(startIndex, p.index)
}

export const property = <T>(propName: string, rule: ParserOp<T>) => <O>(
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

export const object = <T, O>(factory: () => O, rule: ParserOp<T>) => (
  p: Parser,
): O | undefined => {
  const obj = factory()
  return rule(p, obj) ? obj : undefined
}

type WithoutUndefined<T> = T extends undefined ? never : T

type SequenceReturnType<T> = T extends (...args: any[]) => any
  ? WithoutUndefined<ReturnType<T>>
  : string
type SequenceReturnTypes<T extends any[]> = {
  [K in keyof T]: SequenceReturnType<T[K]>
}

/**
 * Same as parseSequence but when a custom return type is needed.  TypeScript
 * won't allow filtering a type out of a tuple type otherwise this wouldn't be
 * needed. The extra function is needed due to TypeScript's all-or-nothing
 * inference of generics.
 */
export const sequenceCustom = <R>() => <T extends any[]>(...rules: T) => <O>(
  p: Parser,
  obj?: O,
): R | undefined => {
  const ret: any[] = []
  for (const rule of rules) {
    const ruleValue = rule(p, obj)
    if (!ruleValue) {
      return undefined
    }

    if (typeof ruleValue !== 'boolean') {
      // don't store predicates
      ret.push(ruleValue)
    }
    p.skipSpacing()
  }
  return ((ret.length === 1 ? ret[0] : ret) as unknown) as R
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const sequence = <T extends any[]>(...rules: T) =>
  sequenceCustom<SequenceReturnTypes<T>>()(...rules)

export const andPredicate = <T>(rule: ParserOp<T>) => (
  p: Parser,
): boolean | undefined => {
  const { index } = p
  const result = rule(p)
  p.restoreIndex(index)
  return !!result
}

export const notPredicate = <T>(rule: ParserOp<T>) => (
  p: Parser,
): boolean | undefined => {
  const { index } = p
  const result = rule(p)
  p.restoreIndex(index)
  return !result
}
