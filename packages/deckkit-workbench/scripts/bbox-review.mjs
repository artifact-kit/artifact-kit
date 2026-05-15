#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = resolve(__dirname, '..')

const cliArgs = process.argv[2] === 'bbox-review' ? process.argv.slice(3) : process.argv.slice(2)
const args = parseArgs(cliArgs)
if (args.help || !args.input || !args.output) {
  printHelp()
  process.exit(args.help ? 0 : 1)
}

const invocationCwd = process.env.INIT_CWD ?? process.cwd()
const inputPath = resolve(invocationCwd, args.input)
const outputPath = resolve(invocationCwd, args.output)
const port = args.port ?? '3000'
const hostname = args.hostname ?? '127.0.0.1'

if (!existsSync(inputPath)) {
  console.error(`Input file does not exist: ${inputPath}`)
  process.exit(1)
}

console.log(`DeckKit Workbench bbox review`)
console.log(`Input:  ${inputPath}`)
console.log(`Output: ${outputPath}`)
console.log(`URL:    http://${hostname}:${port}/bbox-review`)

const child = spawn('next', ['dev', '--hostname', hostname, '--port', port], {
  cwd: packageRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    DECKKIT_WORKBENCH_MODE: 'bbox-review',
    DECKKIT_WORKBENCH_INPUT: inputPath,
    DECKKIT_WORKBENCH_OUTPUT: outputPath,
  },
})

child.on('exit', code => {
  process.exit(code ?? 0)
})

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') {
      result.help = true
    } else if (arg === '-i' || arg === '--input') {
      result.input = argv[++index]
    } else if (arg === '-o' || arg === '--output') {
      result.output = argv[++index]
    } else if (arg === '--port' || arg === '-p') {
      result.port = argv[++index]
    } else if (arg === '--hostname') {
      result.hostname = argv[++index]
    } else {
      console.error(`Unknown argument: ${arg}`)
      result.help = true
    }
  }
  return result
}

function printHelp() {
  console.log(`
Usage:
  pnpm --filter @artifact-kit/deckkit-workbench bbox-review -i input.bbox.json -o final.bbox.json

Options:
  -i, --input <file>      Input bbox review JSON
  -o, --output <file>     Output JSON written on save/complete
  -p, --port <port>       Dev server port, defaults to 3000
  --hostname <host>       Dev server hostname, defaults to 127.0.0.1
`)
}
