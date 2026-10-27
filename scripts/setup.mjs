import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
const file = resolve('.env.local')
try { await readFile(file); console.log('Existing .env.local preserved.'); process.exit(0) } catch {}
const password = randomBytes(18).toString('base64url')
const secret = randomBytes(48).toString('hex')
await writeFile(file, `ADMIN_EMAIL=admin@sidd.local\nADMIN_PASSWORD=${password}\nAUTH_SECRET=${secret}\nDATABASE_URL=\n`)
console.log('\nLocal admin credentials — save these somewhere safe:')
console.log('  URL:      http://localhost:5173/admin')
console.log('  Email:    admin@sidd.local')
console.log(`  Password: ${password}`)
console.log('Saved to .env.local (excluded from Git). Do not deploy these development credentials.\n')
