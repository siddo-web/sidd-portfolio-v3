import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
try { await readFile('.env.local') } catch { execFileSync(process.execPath, ['scripts/setup.mjs'], { stdio: 'inherit' }) }
const text = await readFile('.env.local', 'utf8')
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const child = [
  spawn(process.execPath, ['server/dev.js'], { stdio: 'inherit', env: process.env }),
  spawn('npm', ['run', 'dev:client'], { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' })
]
function close() { child.forEach(proc => proc.kill('SIGTERM')) }
process.on('SIGINT', close); process.on('SIGTERM', close)
for (const proc of child) proc.on('exit', code => { if (code) { console.error(`Dev process exited with code ${code}`); close(); process.exitCode = code } })
