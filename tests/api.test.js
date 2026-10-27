import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { once } from 'node:events'
import handler from '../server/handler.js'

process.env.ADMIN_EMAIL = 'test@example.com'
process.env.ADMIN_PASSWORD = 'test-password-12345'
process.env.AUTH_SECRET = 'a-very-long-test-secret-for-signed-cookies'
process.env.VERCEL = ''

let server, base
const api = async (path, init = {}) => {
 const response = await fetch(`${base}/api/${path}`, init)
 return { status: response.status, body: await response.json(), headers: response.headers }
}
test.before(async () => {
 server = createServer(handler).listen(0, '127.0.0.1')
 await once(server, 'listening')
 base = `http://127.0.0.1:${server.address().port}`
})
test.after(async () => { await new Promise(resolve => server.close(resolve)); await Promise.all(['data/.local-site.json','data/.local-messages.json'].map(p => unlink(resolve(p)).catch(() => {}))) })

test('public portfolio loads and excludes unpublished projects', async () => {
 const r = await api('public'); assert.equal(r.status, 200); assert.ok(r.body.site.projects.length > 0)
})
test('auth endpoints reject unauthenticated writes', async () => {
 const r = await api('site', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
 assert.equal(r.status, 401)
})
test('admin authenticates with a signed HTTP-only cookie', async () => {
 const wrong = await api('login', { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email:'test@example.com', password:'bad' }) })
 assert.equal(wrong.status, 401)
 const login = await api('login', { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email:'test@example.com', password:'test-password-12345' }) })
 assert.equal(login.status, 200)
 assert.match(login.headers.get('set-cookie'), /HttpOnly/)
 const cookie = login.headers.get('set-cookie').split(';')[0]
 const saved = await api('site', { headers: { Cookie: cookie } })
 assert.equal(saved.status, 200); assert.ok(saved.body.site.services.length)
})
test('contact validation rejects malformed input', async () => {
 const r = await api('contact', { method:'POST', headers: {'Content-Type':'application/json'},body: JSON.stringify({name:'Test',email:'not-an-email',message:'short'}) })
 assert.equal(r.status, 400)
})


test('content publishing, revision conflicts, draft visibility and inbox lifecycle', async () => {
  const login = await api('login', { method:'POST', headers: {'Content-Type':'application/json'},body:JSON.stringify({email:'test@example.com',password:'test-password-12345'}) })
  assert.equal(login.status, 200)
  const cookie = login.headers.get('set-cookie').split(';')[0]
  const auth = { 'Content-Type': 'application/json', Cookie: cookie }
  const current = await api('site', {headers:auth})
  assert.equal(current.status, 200)
  const changed = structuredClone(current.body.site)
  changed.hero.line1 = 'Updated portfolio headline'
  changed.projects[0].published = false
  const put = await api('site', { method:'PUT',headers:auth,body:JSON.stringify({site:changed,expectedRevision:current.body.revision}) })
  assert.equal(put.status, 200)
  const again = await api('site', {method:'PUT',headers:auth,body:JSON.stringify({site:changed,expectedRevision:current.body.revision})})
  assert.equal(again.status, 409)
  const publicResponse = await api('public')
  assert.equal(publicResponse.body.site.hero.line1, 'Updated portfolio headline')
  assert.equal(publicResponse.body.site.projects.some(p => p.id === changed.projects[0].id), false)
  const invalid = await api('site',{method:'PUT',headers:auth,body:JSON.stringify({site:{...changed,brand:''},expectedRevision:put.body.revision})})
  assert.equal(invalid.status, 422)
  const contact = await api('contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Jane Portfolio',email:'jane@example.com',message:'I would love to work together on a React experience.'})})
  assert.equal(contact.status, 201)
  const inbox = await api('messages',{headers:auth})
  assert.ok(inbox.body.messages.some(m => m.id === contact.body.id))
  const read = await api(`messages?id=${contact.body.id}`,{method:'PATCH',headers:auth,body:JSON.stringify({read:true})})
  assert.equal(read.status, 200)
  const inbox2 = await api('messages',{headers:auth})
  assert.equal(inbox2.body.messages.find(m=>m.id===contact.body.id).read, true)
  const deleted = await api(`messages?id=${contact.body.id}`,{method:'DELETE',headers:auth})
  assert.equal(deleted.status, 200)
  const restored = await api('site',{method:'PUT',headers:auth,body:JSON.stringify({site:current.body.site,expectedRevision:put.body.revision})})
  assert.equal(restored.status,200)
})

test('API refuses cross-origin POST requests', async () => {
 const r=await api('contact',{method:'POST', headers: {'Content-Type':'application/json',Origin:'https://unrelated-site.example'},body:JSON.stringify({name:'A',email:'a@b.com',message:'Hello from bad origin'})})
 assert.equal(r.status,403)
})
