import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './admin.css'

async function request(path, options = {}) {
  let response
  try { response = await fetch(`/api/${path}`, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }) }
  catch { throw new Error('Cannot reach the API. Start the local API server or check the Vercel deployment.') }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`)
  return result
}
function Button({ children, className = '', ...props }) { return <button className={`adm-btn ${className}`} {...props}>{children}</button> }
function Field({ label, value, onChange, placeholder, textarea, type = 'text', hint, maxLength }) {
  return <label className="adm-field"><span>{label}</span>{textarea ? <textarea value={value ?? ''} placeholder={placeholder || ''} onChange={e => onChange(e.target.value)} rows={4} maxLength={maxLength || 3500}/> : <input type={type} value={value ?? ''} placeholder={placeholder || ''} onChange={e => onChange(e.target.value)} maxLength={maxLength || 1800} />}{hint && <small>{hint}</small>}</label>
}
const menus = [
  { id: 'overview', icon: '◫', text: 'Overview' }, { id: 'projects', icon: '◈', text: 'Projects' },
  { id: 'services', icon: '✳', text: 'Services' }, { id: 'experience', icon: '◷', text: 'Timeline' },
  { id: 'content', icon: '☷', text: 'Site content' }, { id: 'messages', icon: '✉', text: 'Inbox' },
  { id: 'settings', icon: '⚙', text: 'Settings & SEO' }
]
const clone = o => JSON.parse(JSON.stringify(o))

function Login({ onSuccess }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [loading, setLoading] = useState(false), [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault(); setError(''); setLoading(true)
    try { await request('login', { method: 'POST', body: JSON.stringify({ email, password }) }); onSuccess() }
    catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  return <main className="adm-login"><a className="adm-back" href="/">↖ &nbsp; Back to portfolio</a><div className="adm-login-orb"/><div className="adm-login-frame"><div className="adm-login-icon">✳</div><p className="adm-kicker">SECURE CONTROL CENTER / V1.0</p><h1>Welcome <em>back.</em></h1><p>Manage your projects, content, messages, and more from one place.</p><form onSubmit={submit}><Field label="EMAIL ADDRESS" type="email" value={email} onChange={setEmail} placeholder="you@example.com"/><Field label="PASSWORD" type="password" value={password} onChange={setPassword} placeholder="Your admin password"/><Button className="adm-primary" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Enter dashboard'} <span>↗</span></Button>{error && <p className="adm-alert adm-error" role="alert">{error}</p>}</form><div className="adm-login-footer">Encrypted session cookie · 12-hour session · Server-side authentication</div></div></main>
}

function ProjectForm({ project, onChange, onDelete, onClose }) {
  const set = (key, val) => onChange({ ...project, [key]: val })
  return <div className="adm-edit-panel"><div className="adm-edit-heading"><div><span className="adm-kicker">PROJECT EDITOR</span><h3>{project.name || 'New project'}</h3></div><button type="button" className="adm-icon" onClick={onClose} aria-label="Close project editor">✕</button></div>
    <div className="adm-field-grid"><Field label="PROJECT NAME" value={project.name} onChange={v => set('name', v)} maxLength={130}/><Field label="YEAR" value={project.year} onChange={v => set('year', v)}/></div>
    <div className="adm-field-grid"><Field label="CATEGORY / KIND" value={project.kind} onChange={v => set('kind', v)} placeholder="Web App"/><label className="adm-field"><span>FILTER CATEGORY</span><select value={project.type} onChange={e => set('type', e.target.value)}><option>Design</option><option>Development</option></select></label></div>
    <Field label="SHORT DESCRIPTION" value={project.summary} onChange={v => set('summary', v)} maxLength={350}/><Field label="FULL CASE STUDY" textarea value={project.detail} onChange={v => set('detail', v)}/>
    <Field label="SKILLS / CONTRIBUTIONS" value={(project.contribution || []).join(', ')} onChange={v => set('contribution', v.split(',').map(s => s.trim()).filter(Boolean))} hint="Comma-separated, e.g. React, UI Design, Animation"/>
    <div className="adm-field-grid"><Field label="LIVE WEBSITE URL" value={project.url} onChange={v => set('url', v)} placeholder="https://..."/><Field label="GITHUB REPOSITORY URL" value={project.repo} onChange={v => set('repo', v)} placeholder="https://github.com/..."/></div>
    <Field label="SCREENSHOT URL (OPTIONAL)" value={project.image} onChange={v => set('image', v)} placeholder="https://.../image.webp" hint="Use a publicly accessible image URL. Without one, the original illustrated artwork is used."/>
    <div className="adm-field-grid"><label className="adm-field"><span>ARTWORK STYLE</span><select value={project.variant} onChange={e => set('variant', e.target.value)}>{['astra','orbit','pulse','syntax'].map(v => <option key={v}>{v}</option>)}</select></label><label className="adm-field"><span>PUBLICATION</span><select value={project.published === false ? 'draft' : 'published'} onChange={e => set('published', e.target.value === 'published')}><option value="published">Published</option><option value="draft">Draft / Hidden</option></select></label></div>
    <div className="adm-edit-footer"><Button className="adm-danger" type="button" onClick={onDelete}>Delete project</Button><Button type="button" onClick={onClose}>Done editing ↗</Button></div>
  </div>
}

export default function Admin() {
  const [auth, setAuth] = useState('loading'), [content, setContent] = useState(null), [revision, setRevision] = useState(0)
  const [messages, setMessages] = useState([]), [screen, setScreen] = useState('overview'), [selected, setSelected] = useState(null)
  const [dirty, setDirty] = useState(false), [saving, setSaving] = useState(false), [notice, setNotice] = useState(null), [menuOpen, setMenuOpen] = useState(false)
  const uploadRef = useRef(null)
  const toast = (message, error = false) => { setNotice({ message, error }); }
  const load = useCallback(async () => {
    const [siteData, inbox] = await Promise.all([request('site'), request('messages')])
    setContent(siteData.site); setRevision(siteData.revision); setDirty(false); setMessages(inbox.messages)
  }, [])
  useEffect(() => {
    let running = true
    request('session').then(async session => {
      if (!running) return
      if (!session.authenticated) { setAuth('login'); return }
      try { await load(); if (running) setAuth('ready') } catch (e) { if (running) { setAuth('login'); toast(e.message, true) } }
    }).catch(e => { if (running) { setAuth('login'); toast(e.message, true) } })
    return () => { running = false }
  }, [load])
  useEffect(() => {
    function beforeLeave(e) { if (dirty) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', beforeLeave)
    return () => window.removeEventListener('beforeunload', beforeLeave)
  }, [dirty])
  function change(mutator) { setContent(old => { const next = clone(old); mutator(next); return next }); setDirty(true) }
  function editAt(path, value) { change(data => { let ref = data; for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]]; ref[path.at(-1)] = value }) }
  async function save() {
    if (!dirty) return
    setSaving(true)
    try { const result = await request('site', { method: 'PUT', body: JSON.stringify({ site: content, expectedRevision: revision }) }); setRevision(result.revision); setDirty(false); toast('Changes published successfully!') }
    catch (err) { toast(err.message, true) }
    finally { setSaving(false) }
  }
  async function logout() {
    if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return
    await request('logout', { method:'POST', body: '{}' }); setAuth('login'); setContent(null)
  }
  async function updateMessage(id, read) {
    try { await request(`messages?id=${encodeURIComponent(id)}`, { method:'PATCH', body:JSON.stringify({ read }) }); setMessages(prev => prev.map(m => m.id === id ? { ...m, read } : m)) }
    catch(e) { toast(e.message, true) }
  }
  async function deleteMessage(id) {
    if (!confirm('Delete this message permanently?')) return
    try { await request(`messages?id=${encodeURIComponent(id)}`, { method:'DELETE' }); setMessages(prev => prev.filter(m => m.id !== id)); toast('Message deleted.') }
    catch(e) { toast(e.message, true) }
  }
  const unread = messages.filter(m => !m.read).length
  const published = content?.projects.filter(p => p.published !== false).length || 0
  const activeProject = useMemo(() => content?.projects.find(p => p.id === selected), [selected, content])
  function addProject() {
    const id = `project-${Math.random().toString(36).slice(2,10)}`
    change(site => site.projects.unshift({ id, index: String(site.projects.length+1).padStart(2,'0'), name:'New Project', summary:'Describe the project in one sentence.', detail:'Write a compelling case study here.', type:'Development', kind:'Web Application', year:'2026', contribution:['React'], variant:'astra', published:false, featured:false, image:'', url:'', repo:'' }))
    setSelected(id)
  }
  function removeProject(id) {
    if (!confirm('Delete this project from the portfolio?')) return
    change(site => { site.projects = site.projects.filter(p => p.id !== id) }); setSelected(null)
  }
  function swapProject(index, delta) {
    const j = index + delta; if (j < 0 || j >= content.projects.length) return
    change(site => { [site.projects[index], site.projects[j]] = [site.projects[j], site.projects[index]] })
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(content,null,2)], { type:'application/json' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sidd-portfolio-backup.json'; link.click(); URL.revokeObjectURL(link.href)
  }
  async function importJSON(e) {
    const file = e.target.files?.[0]; if (!file) return
    try { const next = JSON.parse(await file.text()); if (!Array.isArray(next.projects) || !next.hero || !Array.isArray(next.services)) throw new Error('This does not look like a compatible portfolio backup.')
      if (!confirm('Replace the current unsaved editor content with this backup? You must still click Publish changes.')) return
      setContent(next); setDirty(true); toast('Backup imported. Review and click Publish changes.')
    } catch (err) { toast(err.message, true) } finally { e.target.value = '' }
  }
  if (auth === 'loading') return <main className="adm-splash"><div className="adm-spinner"/> Connecting to control center…</main>
  if (auth === 'login') return <Login onSuccess={async () => { setAuth('loading'); try { await load(); setAuth('ready') } catch(e) { setAuth('login'); toast(e.message, true) } }}/>
  const heading = menus.find(x => x.id === screen)?.text
  return <div className="adm-shell">
    <aside className={`adm-sidebar ${menuOpen ? 'adm-menu-open' : ''}`}><a href="/" className="adm-logo"><span>✳</span> sidd<span className="adm-logo-dot">.</span><small>STUDIO OS / 1.0</small></a><div className="adm-nav-label">WORKSPACE</div><nav aria-label="Admin dashboard navigation">{menus.map(item => <button type="button" key={item.id} onClick={() => { setScreen(item.id); setSelected(null); setMenuOpen(false) }} className={`adm-nav-item ${screen === item.id ? 'active' : ''}`}><b>{item.icon}</b>{item.text}{item.id === 'messages' && unread > 0 && <span className="adm-nav-count">{unread}</span>}</button>)}</nav><div className="adm-sidebar-bottom"><div className="adm-session-status"><span className="adm-signal"/> YOU'RE IN CONTROL</div><a href="/" target="_blank" rel="noreferrer">View live portfolio ↗</a><button onClick={logout} type="button">Sign out ↗</button></div></aside>
    <main className="adm-main"><header className="adm-topbar"><button type="button" className="adm-icon adm-hamburger" onClick={() => setMenuOpen(v => !v)}>☰</button><div className="adm-breadcrumb">STUDIO OS <span>/</span> {heading.toUpperCase()}</div><div className="adm-top-actions"><span className={`adm-change-status ${dirty ? 'unsaved' : ''}`}>{dirty ? '● UNSAVED CHANGES' : '✓ ALL CHANGES SAVED'}</span><Button className="adm-primary adm-save" type="button" onClick={save} disabled={!dirty || saving}>{saving ? 'Publishing…' : 'Publish changes ↗'}</Button></div></header>
      <div className="adm-container">{notice && <div role={notice.error ? 'alert' : 'status'} className={`adm-notice ${notice.error ? 'adm-error' : ''}`}>{notice.message}<button type="button" onClick={() => setNotice(null)}>✕</button></div>}
        <div className="adm-page-head"><span className="adm-kicker">PORTFOLIO WORKSPACE / 2026</span><h1>{screen === 'overview' ? <>Your command <em>center.</em></> : <>{heading}<span className="adm-title-dot">.</span></>}</h1><p>{({ overview:'Everything you need to manage your corner of the internet.', projects:'Create, reorder, edit and publish your projects.', services:'Keep your expertise relevant and current.', experience:'Build an honest timeline of your journey.', content:'Write your story, your way. Changes show on the public site.', messages:'Messages sent by visitors arrive here.', settings:'Your visual identity and search appearance.' })[screen]}</p></div>
        {screen === 'overview' && <><div className="adm-stats"><div><span>01 / PROJECTS</span><strong>{published.toString().padStart(2,'0')}</strong><small>{content.projects.length-published} drafts</small></div><div><span>02 / EXPERTISE</span><strong>{String(content.services.length).padStart(2,'0')}</strong><small>active specializations</small></div><div><span>03 / MESSAGES</span><strong>{String(messages.length).padStart(2,'0')}</strong><small>{unread} unread</small></div><div><span>04 / SYSTEM</span><strong className="adm-online">LIVE</strong><small>Content API connected</small></div></div><div className="adm-overview-panels"><section className="adm-surface"><div className="adm-panel-head"><h2>Quick launch</h2><span>WORKSPACE SHORTCUTS</span></div><div className="adm-shortcuts">{[{ id:'projects', symbol:'◈',title:'Manage projects',desc:'Your latest work, in full control.' },{ id:'content',symbol:'☷',title:'Update your story',desc:'Headline, bio, links and contact.' },{ id:'messages',symbol:'✉',title:'Open inbox',desc:'See who wants to connect.' },{ id:'settings',symbol:'⚙',title:'Portfolio settings',desc:'SEO, settings and backup.' }].map(x => <button type="button" key={x.id} onClick={() => setScreen(x.id)}><span>{x.symbol}</span><strong>{x.title}</strong><small>{x.desc}</small><b>↗</b></button>)}</div></section><section className="adm-surface adm-latest"><div className="adm-panel-head"><h2>Latest projects</h2><span>SELECTED WORK</span></div>{content.projects.slice(0,4).map(p => <button key={p.id} type="button" onClick={() => { setScreen('projects');setSelected(p.id) }}><span className="adm-project-symbol">◈</span><span><strong>{p.name}</strong><small>{p.kind} · {p.year}</small></span><span className={p.published === false ? 'adm-status draft' : 'adm-status'}>{p.published === false ? 'DRAFT' : 'LIVE'}</span></button>)}</section></div></>}
        {screen === 'projects' && <div className="adm-work-area"><section className="adm-surface"><div className="adm-panel-head"><h2>All projects <span className="adm-count">{content.projects.length}</span></h2><Button className="adm-primary" onClick={addProject}>+ Add project</Button></div><p className="adm-hint">Click to edit. Use arrows to change the order they appear in the portfolio.</p>{content.projects.map((p,i) => <div key={p.id} className={`adm-project-row ${selected === p.id ? 'selected' : ''}`}><div className="adm-project-thumb">{p.image && /^https?:\/\//.test(p.image) ? <img src={p.image} alt=""/> : '◈'}</div><button type="button" onClick={() => setSelected(p.id)}><strong>{p.name}</strong><small>{p.kind} · {p.year}</small></button><span className={p.published === false ? 'adm-status draft' : 'adm-status'}>{p.published === false ? 'DRAFT' : 'LIVE'}</span><div className="adm-order"><button type="button" title="Move up" aria-label={`Move ${p.name} up`} disabled={!i} onClick={() => swapProject(i,-1)}>↑</button><button type="button" title="Move down" aria-label={`Move ${p.name} down`} disabled={i===content.projects.length-1} onClick={() => swapProject(i,1)}>↓</button></div></div>)}</section>{activeProject && <ProjectForm project={activeProject} onClose={() => setSelected(null)} onChange={updated => change(site => { const i = site.projects.findIndex(p => p.id === selected); site.projects[i] = updated })} onDelete={() => removeProject(selected)}/>}</div>}
        {screen === 'services' && <div className="adm-list-editor"><div className="adm-panel-head"><h2>Expertise blocks</h2><Button onClick={() => change(site => site.services.push({ number: String(site.services.length+1).padStart(2,'0'),symbol:'✳',title:'New expertise',description:'Describe what you offer.',tags:['React'] }))}>+ Add expertise</Button></div><div className="adm-editor-grid">{content.services.map((s,i) => <section key={i} className="adm-surface adm-item-editor"><div className="adm-editor-heading"><span>BLOCK / {String(i+1).padStart(2,'0')}</span><button type="button" onClick={() => { if(confirm('Remove this expertise?')) change(site => site.services.splice(i,1)) }}>Remove ×</button></div><Field label="SYMBOL" value={s.symbol} onChange={v => editAt(['services',i,'symbol'],v)}/><Field label="TITLE" value={s.title} onChange={v => editAt(['services',i,'title'],v)}/><Field label="DESCRIPTION" textarea value={s.description} onChange={v => editAt(['services',i,'description'],v)}/><Field label="SKILL TAGS" value={s.tags.join(', ')} onChange={v => editAt(['services',i,'tags'],v.split(',').map(x=>x.trim()).filter(Boolean))}/></section>)}</div></div>}
        {screen === 'experience' && <div className="adm-list-editor"><div className="adm-panel-head"><h2>Your journey</h2><Button onClick={() => change(site => site.experience.unshift({id:`exp-${Date.now()}`,period:'2026 — NOW',title:'New milestone',company:'Project / Company',description:'Describe this milestone.'}))}>+ Add milestone</Button></div><div className="adm-editor-grid">{content.experience.map((x,i) => <section key={x.id} className="adm-surface adm-item-editor"><div className="adm-editor-heading"><span>MILESTONE / {String(i+1).padStart(2,'0')}</span><button type="button" onClick={() => { if(confirm('Remove this entry?')) change(site => site.experience.splice(i,1)) }}>Remove ×</button></div><Field label="PERIOD" value={x.period} onChange={v=>editAt(['experience',i,'period'],v)}/><Field label="ROLE / TITLE" value={x.title} onChange={v=>editAt(['experience',i,'title'],v)}/><Field label="COMPANY / FOCUS" value={x.company} onChange={v=>editAt(['experience',i,'company'],v)}/><Field label="DESCRIPTION" textarea value={x.description} onChange={v=>editAt(['experience',i,'description'],v)}/></section>)}</div></div>}
        {screen === 'content' && <div className="adm-content-grid"><section className="adm-surface adm-item-editor"><div className="adm-panel-head"><h2>Hero section</h2><span>FIRST IMPRESSION</span></div><Field label="BRAND NAME" value={content.brand} onChange={v=>editAt(['brand'],v)}/><Field label="ROLE / LABEL" value={content.role} onChange={v=>editAt(['role'],v)}/><Field label="EYEBROW" value={content.hero.eyebrow} onChange={v=>editAt(['hero','eyebrow'],v)}/><Field label="HEADLINE LINE 1" value={content.hero.line1} onChange={v=>editAt(['hero','line1'],v)}/><Field label="HEADLINE LINE 2" value={content.hero.line2} onChange={v=>editAt(['hero','line2'],v)}/><Field label="INTRODUCTION" textarea value={content.hero.description} onChange={v=>editAt(['hero','description'],v)}/><Field label="PRIMARY BUTTON LABEL" value={content.hero.cta} onChange={v=>editAt(['hero','cta'],v)}/></section><section className="adm-surface adm-item-editor"><div className="adm-panel-head"><h2>About & contact</h2><span>YOUR STORY</span></div><Field label="ABOUT HEADLINE" value={content.about.headline} onChange={v=>editAt(['about','headline'],v)}/><Field label="ABOUT PARAGRAPH 1" textarea value={content.about.paragraph1} onChange={v=>editAt(['about','paragraph1'],v)}/><Field label="ABOUT PARAGRAPH 2" textarea value={content.about.paragraph2} onChange={v=>editAt(['about','paragraph2'],v)}/><Field label="CONTACT HEADLINE" value={content.contact.heading} onChange={v=>editAt(['contact','heading'],v)}/><Field label="PUBLIC EMAIL (OPTIONAL)" type="email" value={content.contact.email} onChange={v=>editAt(['contact','email'],v)}/><Field label="AVAILABILITY" value={content.contact.availability} onChange={v=>editAt(['contact','availability'],v)}/></section><section className="adm-surface adm-item-editor adm-content-wide"><div className="adm-panel-head"><h2>Social links & resume</h2><span>YOUR NETWORK</span></div><div className="adm-field-grid">{Object.keys(content.socials).map(key => <Field key={key} label={`${key.toUpperCase()} URL`} value={content.socials[key]} onChange={v=>editAt(['socials',key],v)} placeholder="https://..."/>)}</div></section></div>}
        {screen === 'messages' && <section className="adm-surface adm-inbox"><div className="adm-panel-head"><h2>Incoming messages <span className="adm-count">{messages.length}</span></h2><Button onClick={async () => { try { const result=await request('messages');setMessages(result.messages);toast('Inbox refreshed.') } catch(e){toast(e.message,true)} }}>Refresh ↻</Button></div>{!messages.length ? <div className="adm-empty"><span>✉</span><h3>No messages yet</h3><p>When visitors use your contact form, you’ll see their messages here.</p></div> : messages.map(m => <article key={m.id} className={`adm-message ${m.read ? '' : 'unread'}`}><div className="adm-message-head"><div><span className="adm-avatar">{m.name[0]?.toUpperCase()}</span><span><strong>{m.name}</strong><small>{m.email}</small></span></div><time>{new Date(m.createdAt).toLocaleString()}</time></div><p>{m.message}</p><div className="adm-message-actions"><a href={`mailto:${m.email}?subject=${encodeURIComponent('Re: Your portfolio message')}`}>Reply by email ↗</a><button type="button" onClick={() => updateMessage(m.id,!m.read)}>{m.read ? 'Mark unread' : 'Mark read ✓'}</button><button type="button" onClick={() => deleteMessage(m.id)}>Delete</button></div></article>)}</section>}
        {screen === 'settings' && <div className="adm-content-grid"><section className="adm-surface adm-item-editor"><div className="adm-panel-head"><h2>Search & identity</h2><span>SEO</span></div><Field label="BROWSER TITLE" value={content.settings.siteTitle} onChange={v=>editAt(['settings','siteTitle'],v)}/><Field label="META DESCRIPTION" textarea value={content.settings.metaDescription} onChange={v=>editAt(['settings','metaDescription'],v)} maxLength={300}/><label className="adm-switch"><span><strong>Interactive lab</strong><small>Display the interactive lab section on your portfolio.</small></span><input type="checkbox" checked={content.settings.showLab !== false} onChange={e=>editAt(['settings','showLab'],e.target.checked)}/></label><label className="adm-field"><span>THEME ACCENT</span><select value={content.settings.accent || 'violet'} onChange={e=>editAt(['settings','accent'],e.target.value)}><option value="violet">Cosmic violet</option><option value="cyan">Electric cyan</option><option value="lime">Acid lime</option></select></label></section><section className="adm-surface adm-item-editor"><div className="adm-panel-head"><h2>Backup & restore</h2><span>DATA PORTABILITY</span></div><p className="adm-backup-info">Export your projects, services, timeline, social links and page content in a portable JSON file. Importing a backup changes the editor and must be published separately.</p><Button onClick={exportJSON}>↓ Download full content backup</Button><Button onClick={() => uploadRef.current?.click()}>↑ Import backup JSON</Button><input ref={uploadRef} type="file" accept="application/json,.json" hidden onChange={importJSON}/><div className="adm-backup-note">Keep private backups of your site content. Database secrets are never included in the exported file.</div></section></div>}
        <footer className="adm-footer">SIDD STUDIO OS · {new Date().getFullYear()} <span>CRAFTED FOR CONTINUOUS ITERATION</span></footer>
      </div>
    </main>
  </div>
}
