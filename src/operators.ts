import { Parser } from './parser'
// import { FilterBooleans } from './filterBooleans'

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

export const appendProperty = <T>(propName: string, rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): T | undefined => {
  const result = rule(p, obj)
  if (!result) {
    return undefined
  }
  ;(obj as any)[propName].push(result)
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
 * Same as parseSequence but when a custom return type is needed. We can filter
 * the booleans from the tuple, but doing so uses a lot of CPU due since typescript
 * doesn't have a sensible way to filter tuples.
 * See https://github.com/insidewhy/the-goat/commit/1caab09191b49586727d65da918e471e4687cc24
 * for the implementation, wish it could be used.
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
  // see comment above :(
  // sequenceCustom<FilterBooleans<SequenceReturnTypes<T>>>()(...rules)
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

const joinHelper = <A extends boolean, T>(
  atLeastOne: A,
  rule: ParserOp<T>,
  joinRule: ParserOp<T>,
) => <O>(
  p: Parser,
  obj?: O,
):
  | (A extends true ? undefined : never)
  | Array<WithoutUndefined<ReturnType<ParserOp<T>>>> => {
  const values: Array<WithoutUndefined<ReturnType<ParserOp<T>>>> = []
  const firstValue = rule(p, obj)
  if (!firstValue) {
    // typescript doesn't understand atLeastOne is bound by A
    return atLeastOne ? (undefined as any) : []
  }

  // typescript shouldn't need this cast, it already knows firstValue is T
  values.push(firstValue as WithoutUndefined<T>)

  while (!p.atEof()) {
    const beforeJoinIndex = p.index
    p.skipSpacing()
    if (!joinRule(p)) {
      p.restoreIndex(beforeJoinIndex)
      break
    }

    p.skipSpacing()
    const nextValue = rule(p, obj)
    if (!nextValue) {
      p.restoreIndex(beforeJoinIndex)
      break
    }

    values.push(nextValue as WithoutUndefined<T>)
  }

  return values
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const join = <T>(rule: ParserOp<T>, joinRule: ParserOp<T>) =>
  joinHelper(false, rule, joinRule)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const joinMany = <T>(rule: ParserOp<T>, joinRule: ParserOp<T>) =>
  joinHelper(true, rule, joinRule)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const treeJoin = <T, O>(
  makeObject: () => O,
  rule: ParserOp<T>,
  joinRule: ParserOp<T>,
) => {
  const parseJoin = joinMany(rule, joinRule)

  return (
    p: Parser,
  ): WithoutUndefined<ReturnType<ParserOp<T>>> | O | undefined => {
    const obj = makeObject()
    const values = parseJoin(p, obj)
    if (!values) {
      return undefined
    } else {
      return values.length > 1 ? obj : values[0]
    }
  }
}
