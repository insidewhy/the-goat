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

export const notChar = (char: string) => (p: Parser): string | undefined => {
  const { next } = p
  if (next === char || p.atEof()) {
    return undefined
  } else {
    p.advance()
    return next
  }
}

export const anyChar = () => (p: Parser): string | undefined => {
  if (p.atEof()) {
    return undefined
  } else {
    const { next } = p
    p.advance()
    return next
  }
}

export const wordChar = () => (p: Parser): string | undefined => {
  if (p.atEof()) {
    return undefined
  }

  // TODO: unicode support etc.
  const { next } = p
  if (
    (next >= '0' && next <= '9') ||
    (next >= 'a' && next <= 'z') ||
    (next >= 'A' && next <= 'Z')
  ) {
    p.advance()
    return next
  } else {
    return undefined
  }
}

export const spacing = () => (p: Parser): boolean | undefined => {
  const { index } = p
  p.skipSpacing()
  return p.index > index ? true : undefined
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

export const asConstant = <T, K extends string>(
  rule: ParserOp<T>,
  constVal: K,
) => (p: Parser): K | undefined => {
  return rule(p) === undefined ? undefined : constVal
}

export const zeroOrMore = <T>(rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): T[] => {
  const ast: T[] = []
  let backupIndex = p.index
  while (p.hasData()) {
    const ruleAst = rule(p, obj)
    if (ruleAst !== undefined) {
      ast.push(ruleAst)
      backupIndex = p.index
      p.skipSpacing()
    } else {
      p.restoreIndex(backupIndex)
      break
    }
  }

  // restore to before final space skip
  p.restoreIndex(backupIndex)
  return ast
}

export const optional = <T>(rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): T | string => {
  const startIndex = p.index
  const ruleAst = rule(p, obj)
  if (ruleAst === undefined) {
    p.index = startIndex
    // maybe should return null?
    return ''
  } else {
    return ruleAst
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const atLeastOne = <T>(rule: ParserOp<T>) => {
  const parseZeroOrMore = zeroOrMore(rule)

  return <O>(p: Parser, obj?: O): T[] | undefined => {
    const result = parseZeroOrMore(p, obj)
    return result.length > 0 ? result : undefined
  }
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
    if (rule(p, obj) === undefined) {
      return undefined
    }
  }
  return p.data.slice(start, p.index)
}

/**
 * Like lexemeAtLeastOne but always return a string AST element.
 */
export const stringLexemeAtLeastOne = <T>(rule: ParserOp<T>) => <O>(
  p: Parser,
  obj?: O,
): string | undefined => {
  const startIndex = p.index
  while (p.hasData() && rule(p, obj) !== undefined) {}
  return p.index === startIndex ? undefined : p.data.slice(startIndex, p.index)
}

export const lexemeAtLeastOne = <T>(rule: ParserOp<T>) => {
  return <O>(p: Parser, obj?: O): T[] | undefined => {
    const ast: T[] = []
    let backupIndex = p.index
    while (p.hasData()) {
      const ruleAst = rule(p, obj)
      if (ruleAst !== undefined) {
        ast.push(ruleAst)
        backupIndex = p.index
      } else {
        p.restoreIndex(backupIndex)
        break
      }
    }

    return ast.length > 0 ? ast : undefined
  }
}

export const property = <K extends string, T>(
  propName: K,
  rule: ParserOp<T>,
) => <O extends Record<K, T>>(p: Parser, obj: O): T | undefined => {
  const result = rule(p, obj)
  if (result === undefined) {
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
  if (result === undefined) {
    return undefined
  }
  ;(obj as any)[propName].push(result)
  return result
}

export const object = <T extends any[], O>(factory: () => O, ...rules: T) => (
  p: Parser,
): O | undefined => {
  const obj = factory()
  const rule = rules.length === 1 ? rules[0] : sequenceHelper(...rules)
  return rule(p, obj) === undefined ? undefined : obj
}

type WithoutUndefined<T> = T extends undefined ? never : T

type ReturnTypeWithoutUndefined<T> = T extends (...args: any[]) => any
  ? WithoutUndefined<ReturnType<T>>
  : never

type SequenceReturnType<T extends any[]> = WithoutUndefined<
  ReturnTypeWithoutUndefined<T[number]>
>

/**
 * Like sequence, but returns a type. This can only be used when one of the
 * subparsers is a storing parser.
 */
export const sequence = <T extends any[]>(...rules: T) => <O>(
  p: Parser,
  obj?: O,
): SequenceReturnType<T> | undefined => {
  let ret: SequenceReturnType<T> | undefined
  let indexBackup = p.index

  const { length } = rules
  for (let i = 0; i < length; ++i) {
    const ruleValue = rules[i](p, obj)
    // predicate or mismatch
    if (typeof ruleValue === 'boolean') {
      // restore before predicate
      p.restoreIndex(indexBackup)
      if (ruleValue === false) {
        return undefined
      }
      // don't store predicates
    } else {
      if (ruleValue === undefined) {
        return undefined
      } else {
        ret = ruleValue
        if (ruleValue.length === 0) {
          // for optional matches that didn't match, erase the whitspace skip
          p.restoreIndex(indexBackup)
        }
      }
    }

    if (i < length - 1) {
      indexBackup = p.index
      p.skipSpacing()
    }
  }
  return ret
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const sequenceHelper = <T extends any[]>(...rules: T) => <O>(
  p: Parser,
  obj?: O,
): 'something' | undefined => {
  let indexBackup = p.index

  const { length } = rules
  for (let i = 0; i < length; ++i) {
    const ruleValue = rules[i](p, obj)
    // predicate or mismatch
    if (typeof ruleValue === 'boolean') {
      // restore before predicate
      p.restoreIndex(indexBackup)
      if (ruleValue === false) {
        return undefined
      }
      // don't store predicates
    } else {
      if (ruleValue === undefined) {
        return undefined
      } else {
        if (ruleValue.length === 0) {
          // for optional matches that didn't match, erase the whitspace skip
          p.restoreIndex(indexBackup)
        }
      }
    }

    if (i < length - 1) {
      indexBackup = p.index
      p.skipSpacing()
    }
  }
  return 'something'
}

export const andPredicate = <T>(rule: ParserOp<T>) => (
  p: Parser,
): boolean | undefined => {
  const { index } = p
  const result = rule(p)
  p.restoreIndex(index)
  return result !== undefined
}

export const notPredicate = <T>(rule: ParserOp<T>) => (
  p: Parser,
): boolean | undefined => {
  const { index } = p
  const result = rule(p)
  p.restoreIndex(index)
  return result === undefined
}

const joinHelper = <A extends boolean, T, U>(
  requireOne: A,
  rule: ParserOp<T>,
  joinRule: ParserOp<U>,
) => <O>(
  p: Parser,
  obj?: O,
):
  | (A extends true ? undefined : never)
  | Array<WithoutUndefined<ReturnType<ParserOp<T>>>> => {
  const values: Array<WithoutUndefined<ReturnType<ParserOp<T>>>> = []
  const firstValue = rule(p, obj)
  if (firstValue === undefined) {
    // typescript doesn't understand requireOne is bound by A
    return requireOne ? (undefined as any) : []
  }

  // typescript shouldn't need this cast, it already knows firstValue is T
  values.push(firstValue as WithoutUndefined<T>)

  while (!p.atEof()) {
    const beforeJoinIndex = p.index
    p.skipSpacing()
    if (joinRule(p) === undefined) {
      p.restoreIndex(beforeJoinIndex)
      break
    }

    p.skipSpacing()
    const nextValue = rule(p, obj)
    if (nextValue === undefined) {
      p.restoreIndex(beforeJoinIndex)
      break
    }

    values.push(nextValue as WithoutUndefined<T>)
  }

  return values
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const join = <T, U>(rule: ParserOp<T>, joinRule: ParserOp<U>) =>
  joinHelper(false, rule, joinRule)

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const joinMany = <T, U>(rule: ParserOp<T>, joinRule: ParserOp<U>) =>
  joinHelper(true, rule, joinRule)

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const treeJoin = <T, U, O>(
  makeObject: () => O,
  rule: ParserOp<T>,
  joinRule: ParserOp<U>,
) => {
  const parseJoin = joinMany(rule, joinRule)

  return (
    p: Parser,
  ): WithoutUndefined<ReturnType<ParserOp<T>>> | O | undefined => {
    // TODO: reuse a cached object until a successful object parse, but to do that a way
    // to reset the object state is needed
    const obj = makeObject()
    const values = parseJoin(p, obj)
    if (values === undefined) {
      return undefined
    } else {
      return values.length > 1 ? obj : values[0]
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const treeRepetition = <T, O>(
  makeObject: () => O,
  rule: ParserOp<T>,
) => {
  const parseAtLeastOne = atLeastOne(rule)

  return (p: Parser): T | O | undefined => {
    const obj = makeObject()
    const values = parseAtLeastOne(p, obj)
    if (values === undefined) {
      return undefined
    } else {
      return values.length > 1 ? obj : values[0]
    }
  }
}

export const treeSequenceCustom = <R>() => <O, T extends any[]>(
  makeObject: () => O,
  ...rules: T
) => (p: Parser): R | O | undefined => {
  const obj = makeObject()
  const ret: any[] = []
  let hasTreeOption = false
  let indexBackup = p.index

  const { length } = rules
  for (let i = 0; i < length; ++i) {
    const ruleValue = rules[i](p, obj)
    if (typeof ruleValue === 'boolean') {
      // restore before space skip for predicates
      p.restoreIndex(indexBackup)
      if (ruleValue === false) {
        return undefined
      }
      // don't store predicates
    } else {
      if (ruleValue === undefined) {
        return undefined
      } else if (ruleValue.length === 0) {
        // for optional matches that didn't match, erase the whitspace skip
        p.restoreIndex(indexBackup)
      } else {
        if (!hasTreeOption && rules[i].isTreeOption && ruleValue !== '') {
          hasTreeOption = true
        }
        ret.push(ruleValue)
      }
    }

    if (i < length - 1) {
      indexBackup = p.index
      p.skipSpacing()
    }
  }

  if (hasTreeOption) {
    return obj
  } else {
    return ((ret.length === 1 ? ret[0] : ret) as unknown) as R
  }
}

export const treeLexeme = <R>() => <O, T extends any[]>(
  makeObject: () => O,
  ...rules: T
) => (p: Parser): R | O | undefined => {
  const obj = makeObject()
  const ret: any[] = []
  let hasTreeOption = false

  const { length } = rules
  for (let i = 0; i < length; ++i) {
    const ruleValue = rules[i](p, obj)
    if (typeof ruleValue === 'boolean') {
      if (ruleValue === false) {
        return undefined
      }
      // don't store predicates
    } else {
      if (ruleValue === undefined) {
        return undefined
      } else if (ruleValue.length !== 0) {
        if (!hasTreeOption && rules[i].isTreeOption && ruleValue !== '') {
          hasTreeOption = true
        }
        ret.push(ruleValue)
      }
    }
  }

  if (hasTreeOption) {
    return obj
  } else {
    return ((ret.length === 1 ? ret[0] : ret) as unknown) as R
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const treeSequence = <O, T extends any[]>(
  makeObject: () => O,
  ...rules: T
) => treeSequenceCustom<SequenceReturnType<T>>()(makeObject, ...rules)

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const treeOptional = <T extends any[]>(...rules: T) => {
  const operator = optional(
    rules.length === 1 ? rules[0] : sequenceHelper(...rules),
  )
  ;(operator as any).isTreeOption = true
  return operator
}
