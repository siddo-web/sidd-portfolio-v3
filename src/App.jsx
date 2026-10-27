import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { defaultSite } from './data/portfolio'

const Admin = lazy(() => import('./admin/Admin.jsx'))
const STORAGE = 'sidd-rewind-favorites-v1'
const INTRO = 'sidd-rewind-intro-seen'
const pad = value => String(value).padStart(2, '0')
const safeLink = value => /^https:\/\/[^\s]+$/i.test(value || '') ? value : null
const getSaved = () => { try { const a = JSON.parse(localStorage.getItem(STORAGE) || '[]'); return Array.isArray(a) ? a.map(String) : [] } catch { return [] } }

function Glyph({ type, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', stroke: 'currentColor', fill: 'none', strokeWidth: 1.65, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }
  const g = {
    arrow: <><path d="M5 19 19 5M8 5h11v11"/></>,
    play: <path d="m8 5 12 7-12 7z"/>,
    pause: <><path d="M8 5v14M16 5v14"/></>,
    next: <><path d="m4 5 9 7-9 7zM14 5l7 7-7 7z"/></>,
    previous: <><path d="m20 5-9 7 9 7zM10 5l-7 7 7 7z"/></>,
    grid: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
    list: <><path d="M9 6h12M9 12h12M9 18h12"/><path d="M3 6h2M3 12h2M3 18h2"/></>,
    scroll: <><path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4"/></>,
    star: <path d="m12 3 2.7 5.6 6.2.9-4.5 4.4 1.1 6.2L12 17.2l-5.5 2.9 1.1-6.2-4.5-4.4 6.2-.9z"/>,
    x: <path d="M5 5 19 19M19 5 5 19"/>,
    menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
    external: <><path d="M13 4h7v7M20 4l-9 9"/><path d="M20 14v6H4V4h6"/></>,
    volume: <><path d="M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 0 1 0 6"/></>,
    muted: <><path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6m0-6-5 6"/></>,
    search: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></>,
    check: <path d="m4 12 5 5L20 6"/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="1"/><path d="m4 7 8 6 8-6"/></>
  }
  return <svg {...common}>{g[type] || g.arrow}</svg>
}

function TapeArt({ project, number, large = false }) {
  const variant = ['astra','orbit','pulse','syntax'].includes(project.variant) ? project.variant : 'astra'
  return <div className={`tape-art art-${variant} ${large ? 'art-large' : ''}`}>
    {safeLink(project.image) ? <img src={project.image} alt={`${project.name} project screenshot`} loading="lazy"/> : <>
      <div className="tape-art-noise"/>
      <div className="art-deco art-deco-one"/><div className="art-deco art-deco-two"/><div className="art-deco art-deco-three"/>
      <span className="art-archive">SIDD / DESIGN ARCHIVE <span>#{pad(number)}</span></span>
      <span className="art-object">{variant === 'astra' ? '◉' : variant === 'orbit' ? '✳' : variant === 'pulse' ? '◌' : '⌘'}</span>
      <div className="art-type"><span>STUDY NO. {pad(number)} / {project.year}</span><strong>{project.name}</strong></div>
      <div className="art-bottom"><span>{project.kind}</span><span>EST. {project.year} ↗</span></div>
    </>}
  </div>
}

function Cassette({ project, number, playing, onClick, small = false }) {
  return <button type="button" onClick={onClick} aria-label={`Open ${project.name}`} className={`cassette ${small ? 'cassette-small' : ''}`}>
    <span className="cassette-label-top"><span>SIDDFORM®</span><span>HI-FI / 90</span></span>
    <span className="cassette-sticker"><span>ORIGINAL PROJECT RECORDINGS</span><strong>{project.name}</strong><span className="cassette-code">VOL. {pad(number)} <span>TYPE II · 2026</span></span></span>
    <span className="cassette-window"><span className={`tape-reel ${playing ? 'reel-spinning' : ''}`}><i/></span><span className="cassette-tape-line"/><span className={`tape-reel ${playing ? 'reel-spinning' : ''}`}><i/></span></span>
    <span className="cassette-lower"><span>◂ STEREO ▸</span><span>DESIGN / CODE / CULTURE</span><span>◉</span></span>
    <span className="cassette-corner corner-a"/><span className="cassette-corner corner-b"/>
  </button>
}

function StartScreen({ onStart }) {
  const [ready, setReady] = useState(false)
  useEffect(() => { const timer = setTimeout(() => setReady(true), 330); return () => clearTimeout(timer) }, [])
  return <motion.div className="intro-screen" initial={{ opacity: 1 }} exit={{ y: '-110%', transition: { duration: .9, ease: [.76, 0, .24, 1] } }}>
    <div className="intro-top"><span>SIDDFORM / ARCHIVE SYSTEM</span><button onClick={onStart} type="button">SKIP INTRO ↗</button></div>
    <div className="intro-center">
      <div className="intro-overline"><span className="signal"/> SIGNAL FOUND — CH. 001</div>
      <div className="intro-title">PRESS<br/><i>PLAY</i><span className="intro-title-star">✳</span></div>
      <p>A collection of things imagined, designed, and brought to life on the web.</p>
      <button type="button" className="insert-action" onClick={onStart} disabled={!ready}><span>▶</span> INSERT THE TAPE <span>↗</span></button>
    </div>
    <div className="intro-footer"><span>NO. 001 — THE PORTFOLIO TAPES</span><span>SCROLL · DISCOVER · REWIND</span><span>© 2026</span></div>
  </motion.div>
}

function Nav({ setView, view, favoritesCount, openFavorites, projectCount, mobileOpen, setMobileOpen, brand }) {
  return <header className="main-nav"><a href="#top" className="logo-mark" aria-label="Back to home"><span>{(brand || 'sidd.').replace(/\.$/, '').toUpperCase()}</span><b>®</b><small>FORM</small></a>
    <div className="nav-center"><span className="rec-flash"/> NOW SHOWING <strong>THE PORTFOLIO TAPES</strong><span className="nav-slash">/</span><span>2026</span></div>
    <div className={`nav-actions ${mobileOpen ? 'nav-actions-open' : ''}`}>
      <a href="#work" onClick={() => {setView('scroll');setMobileOpen(false)}}>WORK <span>{pad(projectCount)}</span></a>
      <a href="#about" onClick={() => setMobileOpen(false)}>ABOUT</a>
      <a href="#contact" onClick={() => setMobileOpen(false)}>CONTACT</a>
      <button type="button" className="nav-save" onClick={() => {openFavorites();setMobileOpen(false)}} aria-label={`Saved projects ${favoritesCount}`}><Glyph type="star" size={16}/> MY LIST <b>{favoritesCount}</b></button>
    </div>
    <button type="button" className="nav-hamburger" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMobileOpen(!mobileOpen)}><Glyph type={mobileOpen ? 'x' : 'menu'}/></button>
  </header>
}

function Deck({ active, total, playing, togglePlaying, prev, next, sound, setSound, progress }) {
  return <div className="deck-shell"><div className="deck-controls"><span className="deck-counter">TAPE {pad(active + 1)} <em>/ {pad(total)}</em></span>
    <button type="button" title="Previous project (←)" onClick={prev} aria-label="Previous project"><Glyph type="previous" size={17}/></button>
    <button type="button" title="Play or pause (space)" className="control-main" onClick={togglePlaying} aria-label={playing ? 'Pause auto advance' : 'Play auto advance'}><Glyph type={playing ? 'pause' : 'play'} size={16}/></button>
    <button type="button" title="Next project (→)" onClick={next} aria-label="Next project"><Glyph type="next" size={17}/></button>
    <span className="deck-meter"><span style={{ width: `${progress}%` }}/></span>
    <span className="deck-time">SP {`00:${pad(active + 1)}:00`}</span>
    <button type="button" className="sound-btn" onClick={() => setSound(!sound)} title="Toggle interface sounds" aria-label={sound ? 'Mute interface sounds' : 'Enable interface sounds'}><Glyph type={sound ? 'volume' : 'muted'} size={17}/></button>
  </div><div className="deck-bottom"><span><span className="rec-flash"/> PLAYBACK SYSTEM ONLINE</span><span>PRESS ← → TO SKIP TRACKS</span><span>60 FPS / INTERACTIVE EDITION</span></div></div>
}

function ViewTabs({ view, setView }) {
  return <div className="view-tabs" role="group" aria-label="Choose projects view">{[['scroll','scroll','Scroll'],['shelf','grid','Shelf'],['list','list','List']].map(([v, icon, label]) => <button type="button" key={v} aria-pressed={view === v} className={view === v ? 'active' : ''} onClick={() => setView(v)}><Glyph type={icon} size={14}/>{label}</button>)}</div>
}

function ProjectActions({ project, isSaved, toggleSave, openProject }) {
  return <div className="project-actions"><button type="button" className="cta-border" onClick={() => openProject(project)}>OPEN CASE STUDY <Glyph size={15}/></button><button type="button" className={`favorite-button ${isSaved ? 'favorite-active' : ''}`} onClick={() => toggleSave(project.id)} aria-pressed={isSaved} aria-label={`${isSaved ? 'Remove' : 'Save'} ${project.name} ${isSaved ? 'from' : 'to'} my list`}><Glyph type="star" size={17}/></button></div>
}

function ScrollScene({ project, number, total, isSaved, toggleSave, openProject, playing, setActive, setView }) {
  const root = useRef(null)
  useEffect(() => {
    const element = root.current
    if (!element || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => { if(entries[0].isIntersecting) setActive(number - 1) }, { rootMargin: '-33% 0px -33% 0px', threshold: 0.02 })
    observer.observe(element); return () => observer.disconnect()
  },[number,setActive])
  return <section className="project-scene" id={`project-${project.id}`} ref={root} aria-label={`${project.name} project`}>
    <div className="scene-track"><span className="scene-number">{pad(number)}<span> / {pad(total)}</span></span><span className="scene-line"/><span className="scene-aside">PROJECT ARCHIVE / {project.year}</span></div>
    <div className="scene-grid"><div className="scene-copy"><div className="scene-status"><span className="rec-flash"/> PLAY ▶ <span>SP</span> <span>0:{pad(number)}:00</span></div><div className="scene-kicker">REEL {pad(number)} / {project.kind}</div><h3>{project.name}</h3><p className="scene-summary">{project.summary}</p><p className="scene-description">{project.detail}</p><div className="scene-metadata"><div><small>ROLE / FOCUS</small><strong>{(project.contribution || []).slice(0,2).join(' + ') || project.type}</strong></div><div><small>RELEASED</small><strong>{project.year}</strong></div></div><ProjectActions project={project} isSaved={isSaved} toggleSave={toggleSave} openProject={openProject}/></div>
      <div className="scene-visual"><div className="scene-visual-inner"><div className="poster-surround"><div className="poster-chip">SIDE {number % 2 ? 'A' : 'B'} / VOL. {pad(number)}</div><TapeArt project={project} number={number} large/></div><Cassette project={project} number={number} playing={playing} onClick={() => openProject(project)}/></div><button type="button" className="scene-bottom-link" onClick={() => {setView('shelf');document.querySelector('#work')?.scrollIntoView({behavior:'smooth'})}}>BROWSE THE COLLECTION <Glyph size={14}/></button></div></div>
  </section>
}

function Shelf({ projects, favorites, toggleSave, openProject, active, setActive, playing }) {
  return <div className="shelf-view"><div className="shelf-hero"><div><span className="shelf-label">THE COMPLETE COLLECTION</span><h3>Pick a <em>tape.</em></h3><p>Every tape is a different experiment. Select a sleeve to explore the story behind it.</p></div><span>{pad(projects.length)} ENTRIES / SIDD ARCHIVE</span></div>
    <div className="shelf-featured"><TapeArt project={projects[active]} number={active+1} large/><div className="shelf-featured-copy"><span>NOW SELECTED / VOL. {pad(active+1)}</span><h4>{projects[active].name}</h4><p>{projects[active].summary}</p><ProjectActions project={projects[active]} isSaved={favorites.includes(projects[active].id)} toggleSave={toggleSave} openProject={openProject}/></div></div>
    <div className="tape-shelf">{projects.map((p,i) => <div key={p.id} className={`shelf-item ${active === i ? 'selected' : ''}`}><Cassette project={p} number={i+1} playing={playing && active === i} onClick={() => setActive(i)} small/><div><span>VOL. {pad(i+1)}</span><strong>{p.name}</strong></div></div>)}</div></div>
}

function ListView({ projects, favorites, toggleSave, openProject }) {
  const [query, setQuery] = useState('')
  const filtered = projects.filter(p => `${p.name} ${p.kind} ${p.summary} ${(p.contribution || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  return <div className="list-view"><div className="list-top"><div><span className="shelf-label">THE ARCHIVE / INDEX</span><h3>All the <em>tracks.</em></h3></div><label className="search-field"><Glyph type="search" size={17}/><span className="sr-only">Search projects</span><input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="SEARCH THE ARCHIVE..."/></label></div><div className="list-head"><span>NO.</span><span>PROJECT / ENTRY</span><span>FORMAT</span><span>YEAR</span><span>SAVE</span></div>
    {filtered.length ? filtered.map(p => <div className="track-row" key={p.id}><span>{pad(projects.indexOf(p)+1)}</span><button type="button" className="track-name" onClick={() => openProject(p)}><span>{p.name}</span><small>{p.summary}</small></button><span>{p.kind}</span><span>{p.year}</span><button type="button" aria-label={`${favorites.includes(p.id) ? 'Remove' : 'Save'} ${p.name}`} aria-pressed={favorites.includes(p.id)} className={`track-fav ${favorites.includes(p.id) ? 'favorite-active' : ''}`} onClick={() => toggleSave(p.id)}><Glyph type="star" size={18}/></button></div>) : <div className="no-results">NO MATCHING TRACKS. TRY ANOTHER SEARCH.</div>}
  </div>
}

function Modal({ project, close, number, saved, toggleSave }) {
  useEffect(() => { const previous = document.body.style.overflow; document.body.style.overflow = 'hidden'; const onKey = e => { if(e.key === 'Escape') close() }; document.addEventListener('keydown',onKey);return () => {document.body.style.overflow = previous;document.removeEventListener('keydown',onKey)} },[close])
  const url=safeLink(project.url), repo=safeLink(project.repo)
  return <motion.div className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => {if(e.target===e.currentTarget) close()}}><motion.div role="dialog" aria-modal="true" aria-labelledby="modal-heading" className="project-modal" initial={{scale:.96,y:25,opacity:0}} animate={{scale:1,y:0,opacity:1}} exit={{scale:.97,opacity:0}} transition={{duration:.25}}><div className="modal-heading"><span>PLAYBACK / {pad(number)} — PROJECT CASE STUDY</span><button type="button" aria-label="Close case study" onClick={close}><Glyph type="x"/></button></div><div className="modal-body"><div className="modal-poster"><TapeArt project={project} number={number} large/></div><div className="modal-copy"><div className="section-kicker">DIGITAL ARTIFACT / {project.year}</div><h2 id="modal-heading">{project.name}</h2><p className="modal-lead">{project.summary}</p><p>{project.detail}</p><div className="modal-tags">{(project.contribution || []).map(t => <span key={t}>{t}</span>)}</div><div className="modal-actions">{url && <a href={url} target="_blank" rel="noreferrer">VIEW LIVE PROJECT <Glyph type="external" size={15}/></a>}{repo && <a href={repo} target="_blank" rel="noreferrer">SOURCE CODE <Glyph type="external" size={15}/></a>}<button type="button" onClick={() => toggleSave(project.id)}><Glyph type="star" size={15}/>{saved ? 'REMOVE FROM LIST' : 'ADD TO MY LIST'}</button></div></div></div></motion.div></motion.div>
}

function FavoritesDrawer({ projects, favorites, close, openProject, toggleSave }) {
  useEffect(() => { const listener=e=>{if(e.key==='Escape')close()}; window.addEventListener('keydown',listener);return ()=>window.removeEventListener('keydown',listener) },[close])
  const selected=projects.filter(p => favorites.includes(p.id))
  return <motion.div className="drawer-overlay" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e=>{if(e.target===e.currentTarget)close()}}><motion.aside role="dialog" aria-modal="true" aria-label="My saved projects" className="favorites-drawer" initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{duration:.35,ease:[.22,1,.36,1]}}><div className="drawer-top"><span>MY LIST / THE ONES TO KEEP</span><button type="button" onClick={close} aria-label="Close my list"><Glyph type="x"/></button></div><h2>Your <em>favorites.</em></h2><p>{selected.length} SAVED {selected.length === 1 ? 'PROJECT' : 'PROJECTS'} / STORED IN THIS BROWSER</p><div className="drawer-list">{selected.length ? selected.map(p=><div className="drawer-item" key={p.id}><TapeArt project={p} number={projects.indexOf(p)+1}/><div><strong>{p.name}</strong><span>{p.kind}</span><button type="button" onClick={()=>{close();openProject(p)}}>OPEN PROJECT ↗</button></div><button type="button" className="drawer-remove" onClick={()=>toggleSave(p.id)} aria-label={`Remove ${p.name}`}><Glyph type="x" size={15}/></button></div>) : <div className="drawer-empty">✳<br/>THE SHELF IS EMPTY.<br/><span>STAR PROJECTS TO SAVE THEM HERE.</span></div>}</div><button type="button" onClick={close} className="drawer-done">BACK TO THE ARCHIVE ↗</button></motion.aside></motion.div>
}

function Contact({ site }) {
  const [state, setState] = useState({name:'',email:'',message:'',website:''})
  const [busy,setBusy] = useState(false),[response,setResponse]=useState(null)
  async function submit(e) { e.preventDefault();if(busy)return;setBusy(true);setResponse(null)
    try { const res=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});let data={};try{data=await res.json()}catch{};if(!res.ok)throw new Error(data.error||'Message could not be saved. Please try again.');setResponse({success:true,message:'Transmission received. Thanks for reaching out!'});setState({name:'',email:'',message:'',website:''}) }
    catch(err){setResponse({success:false,message:err.message})}finally{setBusy(false)} }
  return <section className="contact-section" id="contact"><div className="contact-left"><span className="section-kicker">SIDE B / 03 — LET'S CONNECT</span><h2>LET'S MAKE<br/><em>NOISE.</em></h2><p>Have an interesting project in mind? I’d love to hear what you’re building.</p><div className="contact-availability"><span className="rec-flash"/>{site.contact?.availability || 'OPEN FOR NEW WORK'}</div>{site.contact?.email && <a className="contact-email" href={`mailto:${site.contact.email}`}>{site.contact.email} ↗</a>}</div><div className="contact-right"><div className="contact-form-header"><span>RECORD A MESSAGE / FORM 001</span><span>ENCRYPTED? NO · STORED SECURELY</span></div><form onSubmit={submit}><div className="contact-fields"><label>YOUR NAME<input autoComplete="name" required maxLength={90} placeholder="Name" value={state.name} onChange={e=>setState(s=>({...s,name:e.target.value}))}/></label><label>YOUR EMAIL<input autoComplete="email" type="email" required maxLength={160} placeholder="you@example.com" value={state.email} onChange={e=>setState(s=>({...s,email:e.target.value}))}/></label></div><label className="message-label">TELL ME THE IDEA<textarea required rows={5} minLength={10} maxLength={5000} value={state.message} placeholder="Tell me what you're dreaming up..." onChange={e=>setState(s=>({...s,message:e.target.value}))}/></label><div className="trap-field" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={state.website} onChange={e=>setState(s=>({...s,website:e.target.value}))}/></label></div><button className="submit-btn" type="submit" disabled={busy}>{busy ? 'TRANSMITTING…' : 'SEND TRANSMISSION'} <Glyph type="arrow" size={18}/></button>{response && <p role="status" className={`form-message ${response.success?'success':''}`}>{response.message}</p>}</form></div></section>
}

function MainPortfolio() {
  const reduced=useReducedMotion()
  const [site,setSite]=useState(defaultSite)
  const [intro,setIntro]=useState(()=>{try {return sessionStorage.getItem(INTRO)!=='yes'} catch{return true}})
  const [view,setView]=useState('scroll')
  const [active,setActive]=useState(0)
  const [playing,setPlaying]=useState(false)
  const [sound,setSound]=useState(false)
  const [favorites,setFavorites]=useState(getSaved)
  const [selected,setSelected]=useState(null)
  const [drawer,setDrawer]=useState(false)
  const [mobileOpen,setMobileOpen]=useState(false)
  const [scrollPos,setScrollPos]=useState(0)
  const projects=useMemo(()=>site.projects.filter(p=>p.published!==false),[site])
  const line1 = (site.hero?.line1 || 'Great work').trim().split(/\s+/)
  const line2 = site.hero?.line2 || 'In motion.'
  const safeActive=Math.min(Math.max(0,active),Math.max(0,projects.length-1))
  const total=projects.length
  const soundRef=useRef(null)
  useEffect(()=>{let mounted=true;fetch('/api/public').then(r=>r.ok?r.json():Promise.reject()).then(({site:next})=>{if(mounted&&next)setSite(next)}).catch(()=>{});return()=>{mounted=false}},[])
  useEffect(()=>{document.title=site.settings?.siteTitle || 'SIDD / THE PORTFOLIO TAPES';const desc=document.querySelector('meta[name=description]');if(desc)desc.content=site.settings?.metaDescription || 'SIDD interactive portfolio archive.'},[site])
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(favorites))}catch{}},[favorites])
  useEffect(()=>{const listener=()=>{const doc=document.documentElement;setScrollPos(doc.scrollHeight-doc.clientHeight>0?Math.min(100,window.scrollY/(doc.scrollHeight-doc.clientHeight)*100):0)};window.addEventListener('scroll',listener,{passive:true});listener();return()=>window.removeEventListener('scroll',listener)},[])
  const clickSound=useCallback(()=>{if(!sound)return;try{const AudioCtx=window.AudioContext || window.webkitAudioContext;if(!AudioCtx)return;const ctx=soundRef.current || (soundRef.current=new AudioCtx());if(ctx.state==='suspended')ctx.resume();const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(440,ctx.currentTime);osc.frequency.exponentialRampToValueAtTime(150,ctx.currentTime+.07);gain.gain.setValueAtTime(.025,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.09);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.09)}catch{}},[sound])
  function chooseView(v){clickSound();setView(v);setPlaying(false)}
  const toggleSave=(id)=>{clickSound();setFavorites(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id])}
  const goTo=useCallback((i)=>{if(!total)return;const n=(i+total)%total;setActive(n);if(view==='scroll'){document.getElementById(`project-${projects[n].id}`)?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'center'})}else{document.querySelector('#work')?.scrollIntoView({behavior:reduced?'auto':'smooth',block:'start'})}},[projects,reduced,total,view])
  const next=useCallback(()=>{clickSound();goTo(safeActive+1)},[clickSound,goTo,safeActive])
  const prev=useCallback(()=>{clickSound();goTo(safeActive-1)},[clickSound,goTo,safeActive])
  useEffect(()=>{if(!playing||!total||selected||drawer||intro)return;const timer=setInterval(()=>goTo(safeActive+1),5600);return()=>clearInterval(timer)},[playing,total,selected,drawer,intro,safeActive,goTo])
  useEffect(()=>{const onKey=e=>{const t=e.target?.tagName?.toLowerCase();if(['input','textarea','select','button'].includes(t)||e.metaKey||e.ctrlKey||e.altKey||selected||drawer||intro)return;if(e.key==='ArrowRight'){e.preventDefault();next()}else if(e.key==='ArrowLeft'){e.preventDefault();prev()}else if(e.code==='Space'){e.preventDefault();setPlaying(v=>!v)}else if(e.key.toLowerCase()==='f'){setDrawer(true)}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[next,prev,intro,selected,drawer])
  const dismissIntro=()=>{try{sessionStorage.setItem(INTRO,'yes')}catch{};setIntro(false)}
  return <div className="website" id="top" style={{'--page-progress':`${scrollPos}%`}}>
    <div className="film-grain" aria-hidden="true"/>
    <AnimatePresence>{intro && <StartScreen onStart={dismissIntro}/>}</AnimatePresence>
    <div className="scroll-progress"><span/></div>
    <Nav setView={chooseView} view={view} favoritesCount={favorites.length} openFavorites={()=>setDrawer(true)} projectCount={total} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} brand={site.brand}/>
    <main><section className="hero" aria-labelledby="hero-title"><div className="hero-rail"><span><span className="rec-flash"/> REC · SP / 2026</span><span>PREMIERE COLLECTION</span><span>STEREO / HQ</span></div>
      <div className="hero-main"><div className="hero-copy"><div className="eyebrow">A PERSONAL ARCHIVE OF WEB EXPERIMENTS <span>✳</span></div><h1 id="hero-title">{line1[0]}{line1.length > 1 && <><br/><span>{line1.slice(1).join(' ')}</span></>}<br/><i>{line2}</i></h1><div className="hero-description"><div className="hero-vertical-number">REEL / 001</div><p>{site.hero?.description}</p></div><div className="hero-buttons"><a className="hero-primary" href="#work" onClick={()=>chooseView('scroll')}>EXPLORE THE TAPES <Glyph type="arrow" size={19}/></a><button className="hero-outline" type="button" onClick={()=>setDrawer(true)}><Glyph type="star" size={16}/> SAVED WORK <span>{pad(favorites.length)}</span></button></div></div>
        <div className="hero-product"><div className="hero-glow"/><div className="hero-ring hero-ring-one"/><div className="hero-ring hero-ring-two"/><div className="floating-index">CLASSIFIED / SIDD ARCHIVE<br/><span>ART DIRECTION + DEVELOPMENT</span></div><div className="hero-cassette"><div className="hero-cassette-top">SIDE A · MASTER RECORDINGS</div><div className="hero-cassette-main"><span>SIDD.</span><strong>THE<br/>PORTFOLIO<br/>TAPES</strong><small>DESIGNED TO BE PLAYED</small></div><div className="hero-cassette-bottom"><div className="hero-spools"><i/><i/></div><span>90 MIN HIGH BIAS TAPE</span></div></div><div className="hero-sticker">EST. 2026 <span>✳</span></div></div></div>
      <div className="hero-footer"><span>AN EXPERIENCE, NOT JUST A RESUME.</span><a href="#work">SCROLL TO PRESS PLAY <span>↓</span></a><span>CRAFTED IN CODE / 2026</span></div>
    </section>
    <div className="ticker" aria-hidden="true"><div>{Array.from({length:4},(_,i)=><span key={i}>FRONTEND DEVELOPMENT <b>✳</b> INTERACTIVE DESIGN <b>✳</b> CREATIVE ENGINEERING <b>✳</b> MOTION & EXPERIMENTS <b>✳</b></span>)}</div></div>
    <section className="archive-section" id="work"><div className="archive-heading"><div><span className="section-kicker">SIDE A / 01 — THE COLLECTION</span><h2>SELECTED <em>WORK.</em></h2><p>Projects, ideas, experiments. Each one has a story worth pressing play on.</p></div><div className="archive-tools"><div className="archive-count"><strong>{pad(total)}</strong><span>TAPES IN<br/>THE ARCHIVE</span></div><ViewTabs view={view} setView={chooseView}/></div></div>
      {!total ? <div className="archive-empty">NO PUBLISHED PROJECTS YET. ADD THEM FROM <a href="/admin">/ADMIN</a>.</div> : view==='scroll' ? <div className="scenes">{projects.map((p,i)=><ScrollScene key={p.id} project={p} number={i+1} total={total} isSaved={favorites.includes(p.id)} toggleSave={toggleSave} openProject={setSelected} playing={playing&&safeActive===i} setActive={setActive} setView={chooseView}/>)}</div> : view==='shelf' ? <Shelf projects={projects} favorites={favorites} toggleSave={toggleSave} openProject={setSelected} active={safeActive} setActive={setActive} playing={playing}/> : <ListView projects={projects} favorites={favorites} toggleSave={toggleSave} openProject={setSelected}/>}</section>
    <div className="interlude"><span>INTERMISSION / SIDE B</span><strong>MAKE IT<br/><i>MEAN</i> SOMETHING.</strong><span>DESIGN. BUILD. REWIND. REPEAT.</span></div>
    <section className="about-section" id="about"><div className="about-heading"><span className="section-kicker">SIDE B / 02 — THE PERSON BEHIND THE WORK</span><h2>THE HUMAN<br/>BEHIND <i>THE CODE.</i></h2></div><div className="about-grid"><div className="about-cover"><div className="about-gridlines"/><div className="about-sigil">✳</div><span>SIDD/01<br/>PERSONAL EDITION</span><strong>THINK<br/>CREATE<br/>REPEAT</strong><small>ENDLESSLY CURIOUS / NEVER FINISHED</small></div><div className="about-text"><div className="about-series">SIDE B / ARTIST NOTES</div><h3>{site.about?.headline}</h3><p>{site.about?.paragraph1}</p><p>{site.about?.paragraph2}</p><div className="about-meta"><div><span>MY TOOLKIT</span><strong>REACT / JAVASCRIPT / 3D / VERCEL</strong></div><div><span>FOCUS</span><strong>DESIGN × DEVELOPMENT × MOTION</strong></div></div><div className="about-social">{[['github','GITHUB'],['linkedin','LINKEDIN'],['instagram','INSTAGRAM'],['resume','RESUME']].map(([key,label])=>safeLink(site.socials?.[key])&&<a key={key} target="_blank" rel="noreferrer" href={site.socials[key]}>{label}<Glyph size={15}/></a>)}</div></div></div></section>
    <section className="services-section"><div className="services-intro"><span className="section-kicker">BONUS TRACKS / WHAT I DO</span><h2>MADE TO<br/><em>BUILD.</em></h2></div><div className="service-rows">{site.services.map((s,i)=><div className="service-row" key={`${s.number}-${i}`}><span>{pad(i+1)}.</span><div><h3>{s.title}</h3><p>{s.description}</p><div className="service-tags">{(s.tags||[]).map(t=><span key={t}>{t}</span>)}</div></div><span className="service-symbol">{s.symbol || '✳'}</span></div>)}</div></section>
    <Contact site={site}/>
    </main><footer className="site-footer"><a href="#top" className="footer-logo">SIDD<span>®</span></a><span>© 2026 / THE PORTFOLIO TAPES</span><div><a href="/admin">ADMIN ↗</a><button type="button" className="footer-replay" onClick={()=>setIntro(true)}>REPLAY INTRO ↺</button><a href="#top">REWIND TO TOP ↑</a></div></footer>
    {total>0&&!intro&&<Deck active={safeActive} total={total} playing={playing} togglePlaying={()=>{clickSound();setPlaying(v=>!v)}} prev={prev} next={next} sound={sound} setSound={setSound} progress={((safeActive+1)/total)*100}/>}
    <AnimatePresence>{selected && <Modal key={selected.id} project={selected} number={projects.findIndex(p=>p.id===selected.id)+1} close={()=>setSelected(null)} saved={favorites.includes(selected.id)} toggleSave={toggleSave}/>}</AnimatePresence>
    <AnimatePresence>{drawer && <FavoritesDrawer projects={projects} favorites={favorites} close={()=>setDrawer(false)} openProject={setSelected} toggleSave={toggleSave}/>}</AnimatePresence>
    <span className="sr-only" aria-live="polite">{playing?'Automatic playback on':'Automatic playback paused'}</span>
  </div>
}

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <Suspense fallback={<div className="admin-loading">LOADING ADMIN STUDIO…</div>}><Admin/></Suspense> : <MainPortfolio/>
}
