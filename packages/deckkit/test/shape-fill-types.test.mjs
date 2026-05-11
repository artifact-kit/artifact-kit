import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

test('core shape fill rejects pro-only fill fields without pro types', () => {
	const tempDir = '.typecheck-tmp'
	const tempFile = join(tempDir, 'shape-fill-without-pro.ts')

	rmSync(tempDir, { force: true, recursive: true })
	mkdirSync(tempDir)
	writeFileSync(tempFile, readFileSync('test-types/shape-fill-without-pro.ts.fixture', 'utf8'))

	const result = spawnSync('tsc', ['--noEmit', '--module', 'esnext', '--moduleResolution', 'bundler', '--target', 'es2022', '--strict', tempFile], {
		encoding: 'utf8',
		stdio: 'pipe',
	})

	rmSync(tempDir, { force: true, recursive: true })

	const output = `${result.stdout}\n${result.stderr}`
	assert.notEqual(result.status, 0, 'expected pro-only fill fields to fail without pro types')
	assert.match(output, /'stops'/)
})
