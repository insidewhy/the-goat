# the-goat

[![build status](https://circleci.com/gh/insidewhy/the-goat.png?style=shield)](https://circleci.com/gh/insidewhy/the-goat)
[![Known Vulnerabilities](https://snyk.io/test/github/insidewhy/the-goat/badge.svg)](https://snyk.io/test/github/insidewhy/the-goat)
[![Renovate](https://img.shields.io/badge/renovate-enabled-brightgreen.svg)](https://renovatebot.com)

## Usage

`the-goat` is a typescript PEG parsing library and parser generator based on a PEG variant where the parser produces a statically typed AST derived from the input grammar.

## Example

The following PEG:

```
Spacing    <- \s^+
Grammar    <- Expression+
Expression <- Sum
Sum        <= expressions:$next |% "+"
Product    <= expressions:$next |% "*"
Division   <= expressions:$next |% "/"
Leaf       <- Number | Group
Group      <= expression:Expression
Number     <- value:("-"? ^ [0-9])+
```

Produces the following AST type:

```typescript
type Grammar = Expression[]

type Expression = Sum | Product | Division | Group | string

interface Sum {
  type: 'Sum'
  expressions: Array<Product | Division | Group | string>
}

interface Product {
  type: 'Product'
  expressions: Array<Division | Group | string>
}

interface Division {
  type: 'Division'
  expressions: Array<Group | string>
}

interface Group {
  type: 'Group'
  expression: Expression
}
```

Here are some examples of input texts and the produced ASTs:

Input:

```
4 + 5 + 67
8 * 10
9
```

Output:

```typescript
const tree: Grammar = [
  { type: 'Sum', expressions: ['4', '5', '67'] },
  { type: 'Product', expressions: ['8', '10'] },
  '9',
]
```

Input:

```
8 + 6 * 10 / 3 + 5
```

Output:

```typescript
const tree: Grammar = [
  {
    type: 'Sum',
    expressions: [
      '8',
      {
        type: 'Product',
        expressions: ['6', { type: 'Division', expressions: ['10', '3'] }],
      },
      '5',
    ],
  },
]
```
