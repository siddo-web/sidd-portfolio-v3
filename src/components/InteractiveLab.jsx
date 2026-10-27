import { useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

const presets = [
  { name: 'NEBULA', hue: 265, density: 44, intensity: 75, speed: 9 },
  { name: 'SOLAR', hue: 25, density: 65, intensity: 82, speed: 13 },
  { name: 'ICE', hue: 190, density: 32, intensity: 60, speed: 16 },
  { name: 'TOXIC', hue: 115, density: 60, intensity: 68, speed: 7 }
]
function useLabState() {
  const [state, setState] = useState(() => {
    try { const value = JSON.parse(localStorage.getItem('sidd-lab-v2') || 'null'); return value && Number.isFinite(value.hue) ? value : presets[0] }
    catch { return presets[0] }
  })
  const update = next => { setState(next); try { localStorage.setItem('sidd-lab-v2',JSON.stringify(next)) } catch {} }
  return [state, update]
}
export default function InteractiveLab() {
  const [values, setValues] = useLabState()
  const [activePreset, setActivePreset] = useState('NEBULA')
  const [running, setRunning] = useState(true)
  const [copied, setCopied] = useState(false)
  const [pointer, setPointer] = useState({ x: 0, y: 0 })
  const reduced = useReducedMotion()
  const scene = useRef(null)
  const dots = useMemo(() => Array.from({length:90},(_,i) => {
    const phi = Math.acos(1-2*(i+.5)/90)
    const theta = Math.PI*(1+Math.sqrt(5))*i
    return { x: Math.sin(phi)*Math.cos(theta), y: Math.sin(phi)*Math.sin(theta), z: Math.cos(phi), delay:(i*7)%11 }
  }),[])
  function change(field, val) { setActivePreset('CUSTOM'); setValues({ ...values, [field]: Number(val) }) }
  function move(e) {
    if (!scene.current || reduced) return
    const rect = scene.current.getBoundingClientRect()
    setPointer({ x: ((e.clientX-rect.left)/rect.width-.5)*15, y: ((e.clientY-rect.top)/rect.height-.5)*15 })
  }
  async function copy() {
    const text = `/* SIDD interaction lab preset */\n--lab-hue: ${values.hue};\n--lab-intensity: ${values.intensity}%;\n--lab-speed: ${values.speed}s;\n--lab-particles: ${values.density};`
    try { await navigator.clipboard.writeText(text); setCopied(true) } catch { setCopied(false) }
  }
  return <section className="lab-section section-wrap" id="lab">
    <div className="section-eyebrow"><span>02 / INTERACTION LAB</span><span>YOU ARE THE CREATIVE DIRECTOR</span></div>
    <div className="lab-intro"><div><div className="lab-pulse-label"><i/> LIVE EXPERIMENT / 001</div><h2>Don't just scroll.<br/><span className="gradient-text">Make something move.</span></h2><p>Manipulate the light, energy and atmosphere. Everything here responds in real time. This is design you can play with.</p></div><span className="lab-counter">EXP.001<br/>/ LIVE</span></div>
    <div className="lab-layout"><div className="lab-canvas" onPointerMove={move} onPointerLeave={() => setPointer({ x:0,y:0 })} ref={scene} style={{ '--lab-hue':values.hue, '--lab-intensity':values.intensity/100, '--lab-spin':`${values.speed}s`, '--lab-play':running && !reduced ? 'running':'paused', '--lab-mx':`${pointer.x}deg`, '--lab-my':`${pointer.y}deg` }}>
      <div className="lab-grid-lines"/><div className="lab-ambient"/><div className="lab-orbit lab-orbit-1"/><div className="lab-orbit lab-orbit-2"/><div className="lab-orbit lab-orbit-3"/>
      <div className="lab-object-wrap"><div className="lab-core"><div className="lab-core-inner"/><div className="lab-core-reflection"/></div><div className="lab-particles">{dots.slice(0,values.density).map((d,i) => <i key={i} style={{'--x':`${d.x*166}px`,'--y':`${d.y*166}px`,'--z':`${d.z*166}px`,'--delay':`${d.delay}s`}}/>)}</div></div>
      <div className="lab-corner lab-corner-tl">✳ SIDD LAB<br/>EXPERIMENT_001</div><div className="lab-corner lab-corner-tr">RUNTIME READY <span>●</span><br/>60 FPS TARGET</div><div className="lab-corner lab-corner-bl">X {String((pointer.x+180).toFixed(1)).padStart(5,'0')}<br/>Y {String((pointer.y+180).toFixed(1)).padStart(5,'0')}</div><div className="lab-corner lab-corner-br">INTERACTIVE PARTICLE FIELD<br/>MOUSE / TOUCH READY</div>
      <span className="lab-stage-caption">REALTIME / PROCEDURAL VISUAL</span>
    </div>
    <div className="lab-panel"><div className="lab-panel-head"><span>✳ CONTROL DECK</span><strong>V1.04</strong></div><div className="lab-panel-intro"><h3>Shape the<br/>atmosphere.</h3><p>Select a preset or tune your own visual system.</p></div><span className="lab-control-caption">ATMOSPHERE PRESETS</span><div className="lab-presets">{presets.map(p => <button key={p.name} type="button" className={activePreset===p.name?'selected':''} onClick={() => {setValues({...p});setActivePreset(p.name)}}><i style={{'--p-hue':p.hue}}/>{p.name}</button>)}</div><div className="lab-sliders">{[['hue','COLOR FREQUENCY',0,360,'°'],['intensity','LUMINOSITY',15,100,'%'],['density','PARTICLE DENSITY',8,90,''],['speed','ORBIT DURATION',4,25,'s']].map(([name,label,min,max,unit]) => <label key={name}><span>{label}<strong>{values[name]}{unit}</strong></span><input type="range" min={min} max={max} value={values[name]} onChange={e => change(name,e.target.value)} style={{accentColor:`hsl(${values.hue} 89% 70%)`}}/></label>)}</div><div className="lab-panel-actions"><button type="button" className="lab-play" aria-pressed={running} onClick={()=>setRunning(s=>!s)}>{running ? 'Ⅱ  PAUSE MOTION':'▷  RESUME MOTION'}</button><button type="button" className="lab-reset" onClick={()=>{setValues({...presets[0]});setActivePreset('NEBULA');setRunning(true)}}>↺ RESET</button></div><button className="lab-copy" onClick={copy} type="button">{copied ? '✓ COPIED CSS VARIABLES' : '</> COPY CSS VARIABLES'} <span>↗</span></button></div></div>
  </section>
}
