import * as yargs from 'yargs'
import { GrammarParser } from './tbpegByHand'

export async function run(): Promise<void> {
  const argBuilder = yargs
    .strict()
    .option('ast', {
      alias: 'a',
      describe: 'dump AST instead of parser',
      type: 'boolean',
    })
    .option('string', {
      alias: 's',
      describe: 'intrepret positional argument as tbpeg rather than file path',
      type: 'boolean',
    })
    .alias('h', 'help')
    .help()

  const cfg = argBuilder.strict().argv
  const positionals = cfg._

  if (!positionals.length) {
    if (cfg.string) {
      throw new Error('Must supply tbpeg source to parse for -s argument')
    } else {
      throw new Error('Must supply filename')
    }
  }

  if (!cfg.string || !cfg.ast) {
    throw new Error('Must use -s and -a arguments currently')
  }

  positionals.forEach((str) => {
    const p = new GrammarParser(str)
    const ast = p.parse()
    if (ast === undefined) {
      throw new Error(`Failed to parse: ${str}`)
    }
    console.log(JSON.stringify(ast, null, 2))

    p.skipSpacing()
    if (!p.atEof()) {
      console.warn(`Partial match up to ${p.index} for: ${str}`)
    }
  })
}

export async function main(): Promise<void> {
  try {
    await run()
  } catch (e) {
    console.warn(e.message)
    process.exit(1)
  }
}
