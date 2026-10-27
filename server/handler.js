import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
import { databaseConfigured, writesConfigured, loadSite, updateSite, listMessages, addMessage, setMessageRead, removeMessage } from './store.js'

const SESSION_NAME = 'sidd_admin'
const MAX_BODY = 75_000
const loginAttempts = new Map()
const contactAttempts = new Map()
const send = (res, status, value, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers })
  res.end(JSON.stringify(value))
}
const fail = (status, error) => ({ status, error })
function cookieToken(req) {
  return (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(`${SESSION_NAME}=`))?.split('=').slice(1).join('=') || ''
}
function signature(payload) { return createHmac('sha256', process.env.AUTH_SECRET || '').update(payload).digest('base64url') }
function isAuthenticated(req) {
  if (!process.env.AUTH_SECRET || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_EMAIL) return false
  const token = cookieToken(req)
  const [data, mac] = token.split('.')
  if (!data || !mac) return false
  const expected = signature(data)
  if (mac.length !== expected.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return false
  try { const session = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')); return session.email === process.env.ADMIN_EMAIL && session.exp > Date.now() }
  catch { return false }
}
function setCookie(res, token, req, clear = false) {
  const secure = req.headers['x-forwarded-proto'] === 'https' || Boolean(process.env.VERCEL)
  res.setHeader('Set-Cookie', `${SESSION_NAME}=${token}; HttpOnly; Path=/api; SameSite=Strict; ${secure ? 'Secure; ' : ''}Max-Age=${clear ? 0 : 60 * 60 * 12}`)
}
function isSameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true // CLI requests (browser fetch POST includes Origin)
  const expected = req.headers['x-forwarded-host'] || req.headers.host
  try { return new URL(origin).host.toLowerCase() === String(expected).toLowerCase() } catch { return false }
}
function rateLimit(map, key, limit, periodMs) {
  const now = Date.now()
  const current = map.get(key)
  if (!current || now - current.start > periodMs) { map.set(key, { count: 1, start: now }); return false }
  current.count++
  return current.count > limit
}
async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body // Vercel parses JSON before invoking functions
  let size = 0
  const buffers = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY) throw fail(413, 'Request payload is too large.')
    buffers.push(chunk)
  }
  try { return JSON.parse(Buffer.concat(buffers).toString('utf8') || '{}') }
  catch { throw fail(400, 'Invalid JSON body.') }
}
const validText = (v, max = 3000) => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= max
const validUrl = (v) => !v || (typeof v === 'string' && /^https?:\/\//i.test(v) && v.length <= 1800)
function validateSite(site) {
  if (!site || typeof site !== 'object' || Array.isArray(site)) return 'Site must be an object.'
  if (!site.hero || !site.about || !site.contact || !site.socials || !site.settings) return 'Portfolio sections are missing.'
  if (!validText(site.brand, 50) || !validText(site.hero.line1, 100) || !validText(site.hero.line2, 100)) return 'Brand and hero headings are required.'
  if (!Array.isArray(site.projects) || site.projects.length > 80) return 'Maximum 80 projects are allowed.'
  if (!Array.isArray(site.services) || site.services.length > 20) return 'Maximum 20 services are allowed.'
  if (!Array.isArray(site.experience) || site.experience.length > 40) return 'Maximum 40 experience entries are allowed.'
  for (const p of site.projects) {
    if (!/^[a-z0-9_-]{2,70}$/.test(p.id || '') || !validText(p.name, 130) || !validText(p.summary, 350) || !validText(p.detail, 3500)) return 'Projects require a valid ID, title, summary and description.'
    if (!validUrl(p.url) || !validUrl(p.repo) || !validUrl(p.image)) return 'Project URLs must begin with http:// or https://.'
    if (!Array.isArray(p.contribution) || p.contribution.length > 15) return 'Invalid project contribution list.'
  }
  if (new Set(site.projects.map(p => p.id)).size !== site.projects.length) return 'Duplicate project IDs detected.'
  for (const key of ['github', 'linkedin', 'instagram', 'resume']) if (!validUrl(site.socials[key])) return 'Social URLs must start with https://.'
  if (JSON.stringify(site).length > 60000) return 'Portfolio content is too large.'
  return null
}
async function notifyEmail({ name, email, message }) {
  if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL || !process.env.RESEND_FROM_EMAIL) return false
  try {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to: [process.env.NOTIFICATION_EMAIL], reply_to: email, subject: `New portfolio message from ${name}`, text: `From: ${name} <${email}>\n\n${message}` }), signal: AbortSignal.timeout(6000) })
    if (!response.ok) console.error('Resend delivery failed:', response.status)
    return response.ok
  } catch (error) { console.error('Email notification unavailable:', error?.message); return false }
}

export default async function handler(req, res) {
  const path = new URL(req.url || '/', 'http://localhost').pathname.split('/').pop()
  const method = req.method || 'GET'
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
  try {
    if (!['GET', 'HEAD'].includes(method) && !isSameOrigin(req)) return send(res, 403, { error: 'Cross-origin request rejected.' })
    if (path === 'health' && method === 'GET') return send(res, 200, { ok: true, storage: databaseConfigured() ? 'neon-postgres' : (writesConfigured() ? 'local-json' : 'unconfigured'), adminConfigured: Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET) })
    if (path === 'public' && method === 'GET') {
      const { site, persistent } = await loadSite()
      return send(res, 200, { site: { ...site, projects: site.projects.filter(p => p.published !== false) }, persistent })
    }
    if (path === 'contact' && method === 'POST') {
      if (rateLimit(contactAttempts, ip, 5, 60_000)) return send(res, 429, { error: 'Too many messages. Try again in a minute.' })
      const body = await readBody(req)
      if (body.website) return send(res, 200, { ok: true }) // honeypot for basic bots
      const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), message = String(body.message || '').trim()
      if (!validText(name, 100) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180 || !validText(message, 3000) || message.length < 10) return send(res, 400, { error: 'Please enter a valid name, email and message (at least 10 characters).' })
      const record = await addMessage({ name, email, message })
      await notifyEmail({ name, email, message })
      return send(res, 201, { ok: true, id: record.id })
    }
    if (path === 'login' && method === 'POST') {
      if (rateLimit(loginAttempts, ip, 8, 15 * 60_000)) return send(res, 429, { error: 'Too many attempts. Please try later.' })
      if (!(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD && process.env.AUTH_SECRET)) return send(res, 503, { error: 'Admin environment variables are not configured.' })
      const body = await readBody(req)
      const digest = value => createHmac('sha256', process.env.AUTH_SECRET).update(String(value)).digest()
      if (!timingSafeEqual(digest(body.email?.toLowerCase()), digest(process.env.ADMIN_EMAIL.toLowerCase())) || !timingSafeEqual(digest(body.password), digest(process.env.ADMIN_PASSWORD))) return send(res, 401, { error: 'Invalid email or password.' })
      const payload = Buffer.from(JSON.stringify({ email: process.env.ADMIN_EMAIL, exp: Date.now() + 12 * 60 * 60_000, id: randomUUID() })).toString('base64url')
      setCookie(res, `${payload}.${signature(payload)}`, req)
      return send(res, 200, { ok: true, email: process.env.ADMIN_EMAIL })
    }
    if (path === 'logout' && method === 'POST') { setCookie(res, '', req, true); return send(res, 200, { ok: true }) }
    if (path === 'session' && method === 'GET') return send(res, 200, { authenticated: isAuthenticated(req), email: isAuthenticated(req) ? process.env.ADMIN_EMAIL : null })
    if (!['site', 'messages'].includes(path)) return send(res, 404, { error: 'API route not found.' })
    if (!isAuthenticated(req)) return send(res, 401, { error: 'Please sign in to access this endpoint.' })
    if (path === 'site') {
      if (method === 'GET') return send(res, 200, await loadSite())
      if (method === 'PUT') {
        const body = await readBody(req)
        const message = validateSite(body.site)
        if (message) return send(res, 422, { error: message })
        if (!Number.isSafeInteger(body.expectedRevision)) return send(res, 400, { error: 'expectedRevision must be an integer.' })
        const updated = await updateSite(body.site, body.expectedRevision)
        return updated ? send(res, 200, { ok: true, ...updated }) : send(res, 409, { error: 'The site was updated in another tab. Refresh to get the latest version.' })
      }
    }
    if (path === 'messages') {
      if (method === 'GET') return send(res, 200, { messages: await listMessages() })
      const id = new URL(req.url, 'http://localhost').searchParams.get('id')
      if (!id || !/^[0-9a-f-]{36}$/.test(id)) return send(res, 400, { error: 'Valid message id required.' })
      if (method === 'PATCH') { const body = await readBody(req); if (typeof body.read !== 'boolean') return send(res, 400, { error: 'read must be boolean.' }); return send(res, (await setMessageRead(id, body.read)) ? 200 : 404, { ok: true }) }
      if (method === 'DELETE') return send(res, (await removeMessage(id)) ? 200 : 404, { ok: true })
    }
    return send(res, 405, { error: 'Method not allowed.' }, { Allow: path === 'site' ? 'GET, PUT' : 'GET, PATCH, DELETE' })
  } catch (e) {
    const status = e.status || 500
    if (status >= 500) console.error('API error:', e)
    return send(res, status, { error: status === 500 ? 'Unexpected server error. Check server logs.' : (e.error || e.message) })
  }
}
