type NumberMap = {
  0: 1
  1: 2
  2: 3
  3: 4
  4: 5
  5: 6
  6: 7
  7: 8
  8: 9
  9: 10
  10: 11
  11: 12
  // up to twelve supported
  12: 12
}

// prepending is easy
type Prepend<H, T extends any[]> = ((h: H, ...t: T) => void) extends (
  ...l: infer L
) => void
  ? L
  : never

// but appending is so hard, it needs us to implement Reverse
type Reverse<L extends any[], R extends any[] = []> = {
  0: R
  1: ((...l: L) => void) extends (h: infer H, ...t: infer T) => void
    ? Reverse<T, Prepend<H, R>>
    : never
}[L extends [any, ...any[]] ? 1 : 0]

type Equals<I extends number, L extends number> = I extends L ? 1 : 0

// filter boolean logic from here
type FilterBoolean<T, R extends any[]> = T extends boolean ? R : Prepend<T, R>

type FilterBooleansNext<
  I extends keyof NumberMap,
  T extends any[],
  R extends any[]
> = T extends []
  ? R
  : {
      0: FilterBooleansNext<NumberMap[I], T, FilterBoolean<T[I], R>>
      1: R
    }[Equals<I, T['length']>]

// append is hard/expensive, so keep prepending and reverse the result
export type FilterBooleans<T extends any[]> = Reverse<
  FilterBooleansNext<0, T, []>
>
