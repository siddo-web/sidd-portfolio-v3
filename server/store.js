import { readFile, writeFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import seed from '../data/site.json' with { type: 'json' }

const root = resolve(process.cwd(), 'data')
const localSiteFile = resolve(root, '.local-site.json')
const localMessagesFile = resolve(root, '.local-messages.json')
const inVercel = Boolean(process.env.VERCEL)
let sqlPromise
let initialized

async function readJSON(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')) }
  catch (err) { if (err.code === 'ENOENT') return fallback; throw err }
}
async function atomicWrite(file, content) {
  const tmp = `${file}.${randomUUID()}.tmp`
  try { await writeFile(tmp, JSON.stringify(content, null, 2)); await rename(tmp, file) }
  catch (error) { try { await import('node:fs/promises').then(fs => fs.unlink(tmp)) } catch {} throw error }
}
export const databaseConfigured = () => Boolean(process.env.DATABASE_URL)
export const writesConfigured = () => databaseConfigured() || !inVercel
export async function getSeed() { return structuredClone(seed) }

async function database() {
  if (!databaseConfigured()) return null
  if (!sqlPromise) sqlPromise = import('@neondatabase/serverless').then(({ neon }) => neon(process.env.DATABASE_URL))
  const sql = await sqlPromise
  if (!initialized) {
    initialized = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS portfolio_site (id INTEGER PRIMARY KEY, data JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      await sql`CREATE TABLE IF NOT EXISTS portfolio_messages (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, message TEXT NOT NULL, read BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
      const seed = JSON.stringify(await getSeed())
      await sql`INSERT INTO portfolio_site (id, data) VALUES (1, ${seed}::jsonb) ON CONFLICT (id) DO NOTHING`
    })().catch(err => { initialized = null; throw err })
  }
  await initialized
  return sql
}

export async function loadSite() {
  const db = await database()
  if (db) {
    const rows = await db`SELECT data,revision FROM portfolio_site WHERE id=1`
    return { site: rows[0].data, revision: rows[0].revision, persistent: true }
  }
  if (inVercel) return { site: await getSeed(), revision: 0, persistent: false }
  const state = await readJSON(localSiteFile, null)
  return state || { site: await getSeed(), revision: 1, persistent: true }
}

// ETag-style optimistic locking prevents two admin tabs silently overwriting one another.
export async function updateSite(site, expectedRevision) {
  const db = await database()
  if (db) {
    const data = JSON.stringify(site)
    const rows = await db`UPDATE portfolio_site SET data=${data}::jsonb, revision=revision+1, updated_at=now() WHERE id=1 AND revision=${expectedRevision} RETURNING revision`
    return rows[0] ? { revision: rows[0].revision } : null
  }
  if (inVercel) throw Object.assign(new Error('DATABASE_URL is required for persistent writes on Vercel.'), { status: 503 })
  const previous = await loadSite()
  if (previous.revision !== expectedRevision) return null
  const revision = previous.revision + 1
  await atomicWrite(localSiteFile, { site, revision, persistent: true })
  return { revision }
}

export async function addMessage({ name, email, message }) {
  const db = await database()
  const id = randomUUID()
  const createdAt = new Date().toISOString()
  if (db) {
    await db`INSERT INTO portfolio_messages (id,name,email,message) VALUES (${id},${name},${email},${message})`
  } else {
    if (inVercel) throw Object.assign(new Error('Contact inbox is unavailable until DATABASE_URL is configured.'), { status: 503 })
    const messages = await readJSON(localMessagesFile, [])
    messages.unshift({ id, name, email, message, read: false, createdAt })
    await atomicWrite(localMessagesFile, messages)
  }
  return { id, createdAt }
}
export async function listMessages() {
  const db = await database()
  if (db) {
    const rows = await db`SELECT id,name,email,message,read,created_at FROM portfolio_messages ORDER BY created_at DESC LIMIT 500`
    return rows.map(({ created_at: createdAt, ...m }) => ({ ...m, createdAt }))
  }
  if (inVercel) throw Object.assign(new Error('DATABASE_URL is required.'), { status: 503 })
  return readJSON(localMessagesFile, [])
}
export async function setMessageRead(id, read) {
  const db = await database()
  if (db) { const rows = await db`UPDATE portfolio_messages SET read=${read} WHERE id=${id} RETURNING id`; return rows.length > 0 }
  const messages = await listMessages()
  const target = messages.find(x => x.id === id)
  if (!target) return false
  target.read = read
  await atomicWrite(localMessagesFile, messages)
  return true
}
export async function removeMessage(id) {
  const db = await database()
  if (db) { const rows = await db`DELETE FROM portfolio_messages WHERE id=${id} RETURNING id`; return rows.length > 0 }
  const messages = await listMessages()
  if (!messages.some(x => x.id === id)) return false
  await atomicWrite(localMessagesFile, messages.filter(x => x.id !== id))
  return true
}
