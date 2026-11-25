import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import SalesNetwork from './views/SalesNetwork';
const ModelValidation = lazy(()=>import('./views/ModelValidation'));
const DecisionSimulator = lazy(()=>import('./views/DecisionSimulator'));
import ModelNotes from './components/ModelNotes';
import { baseline } from './lib/model';
import type { Inputs } from './types/model';
import { chapters, type SimulatorMode } from './lib/presentation';
import BusinessQuestion from './views/BusinessQuestion';
import StrategicInsights from './views/StrategicInsights';

export default function App() {
  const [chapter,setChapter]=useState(0);
  const [quarter,setQuarter]=useState(24);
  const [presentation,setPresentation]=useState(false);
  const [notes,setNotes]=useState(false);
  const [systemReduced,setSystemReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [paused,setPaused]=useState(false);
  const [scenario,setScenario]=useState<Inputs>({...baseline});
  const [simulatorMode,setSimulatorMode]=useState<SimulatorMode>('advanced');
  const [fullscreenError,setFullscreenError]=useState('');
  const shell=useRef<HTMLDivElement>(null);
  const notesTrigger=useRef<HTMLButtonElement>(null);
  const reduced=systemReduced || paused;
  useEffect(()=>{
    const navigation=shell.current?.querySelector('nav');
    const active=navigation?.querySelector<HTMLElement>('[aria-current="page"]');
    if(navigation && active && navigation.scrollWidth>navigation.clientWidth) {
      const offset=active.getBoundingClientRect().left-navigation.getBoundingClientRect().left+navigation.scrollLeft;
      navigation.scrollTo({left:offset-(navigation.clientWidth-active.clientWidth)/2,behavior:reduced?'instant':'smooth'});
    }
  },[chapter,reduced]);
  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler=()=>setSystemReduced(media.matches);
    media.addEventListener('change',handler);
    return ()=>media.removeEventListener('change',handler);
  },[]);
  function navigate(next:number) {
    setChapter(Math.max(0,Math.min(chapters.length-1,next)));
    window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
    shell.current?.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
  }
  async function togglePresentation() {
    if(presentation) {setPresentation(false);if(document.fullscreenElement) await document.exitFullscreen();}
    else {setSimulatorMode('presentation');setPresentation(true);setFullscreenError('');try {await shell.current?.requestFullscreen();} catch {setFullscreenError('Browser fullscreen is unavailable. Distraction-free presentation is active.');}}
  }
  useEffect(()=>{
    const handle=()=>{if(!document.fullscreenElement) setPresentation(false);};
    document.addEventListener('fullscreenchange',handle);
    return ()=>document.removeEventListener('fullscreenchange',handle);
  },[]);
  useEffect(()=>{
    function key(event:KeyboardEvent) {
      if(event.key==='Escape') {
        if(notes) {setNotes(false);return;}
        if(presentation) {setPresentation(false);if(document.fullscreenElement) void document.exitFullscreen();}
        return;
      }
      if(notes || event.altKey || event.ctrlKey || event.metaKey || (event.target as HTMLElement).closest('input,select,textarea,summary,[role="button"],.scenario-controls,.simulator-mode-bar')) return;
      if(['ArrowRight','PageDown'].includes(event.key)) {event.preventDefault();navigate(chapter+1);}
      if(['ArrowLeft','PageUp'].includes(event.key)) {event.preventDefault();navigate(chapter-1);}
      if(['1','2','3','4','5'].includes(event.key)) navigate(Number(event.key)-1);
      if(event.key.toLowerCase()==='f') {event.preventDefault();void togglePresentation();}
    }
    window.addEventListener('keydown',key);
    return ()=>window.removeEventListener('keydown',key);
  });
  useEffect(()=>{
    if(!notes) return;
    const oldOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const dialog=document.querySelector<HTMLElement>('.source-modal')!;
    const close=dialog.querySelector<HTMLElement>('button')!;
    close.focus();
    function trap(event:KeyboardEvent) {
      if(event.key!=='Tab') return;
      const items=Array.from(dialog.querySelectorAll<HTMLElement>('button,a[href],input,select,summary,[tabindex="0"]'));
      const first=items[0], last=items[items.length-1];
      if(event.shiftKey && document.activeElement===first) {event.preventDefault();last.focus();}
      else if(!event.shiftKey && document.activeElement===last) {event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',trap);
    return ()=>{document.body.style.overflow=oldOverflow;document.removeEventListener('keydown',trap);notesTrigger.current?.focus();};
  },[notes]);
  return <div className={`app-shell ${presentation?'presenting':''} ${reduced?'reduce-motion':''}`} ref={shell}>
    <a className="skip-link" href="#chapter-content">Skip to chapter</a>
    <header className="app-header"><button className="brand" onClick={()=>navigate(0)} aria-label="QKitch — Draft home"><span className="brand-mark">Q<span /></span><span>QKitch <span className="brand-draft">— Draft</span></span></button><nav aria-label="Chapters">{chapters.map(({name},i)=><button key={name} onClick={()=>navigate(i)} className={chapter===i?'active':''} aria-current={chapter===i?'page':undefined}><span className="chapter-index">0{i+1}</span>{name}</button>)}</nav><button className="present-button" onClick={()=>void togglePresentation()} aria-pressed={presentation}><svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7 2H2v5m11-5h5v5M2 13v5h5m11-5v5h-5" stroke="currentColor" strokeWidth="1.3"/></svg>{presentation?'Exit presentation':'Present'}</button></header>
    {fullscreenError && <p className="fullscreen-notice" role="status">{fullscreenError}</p>}
    <main id="chapter-content" className="main-content" tabIndex={-1}>
      <div className="presentation-route"><span>6:30 guided story</span><span>{chapters[chapter].name} · {chapters[chapter].time} suggested</span></div>
      <div className="chapter-transition" key={chapter}>
        {chapter===0 && <BusinessQuestion onExplore={()=>navigate(1)}/>}
        {chapter===1 && <SalesNetwork quarter={quarter} onQuarter={setQuarter} reduced={reduced} onSimulate={()=>navigate(3)}/>}
        <Suspense fallback={<p className="muted small">Preparing chapter…</p>}>
        {chapter===2 && <ModelValidation quarter={quarter} onQuarter={setQuarter} reduced={reduced} presentation={presentation}/>}
        {chapter===3 && <DecisionSimulator inputs={scenario} setInputs={setScenario} mode={simulatorMode} onMode={setSimulatorMode} onInsights={()=>navigate(4)}/>}
        </Suspense>
        {chapter===4 && <StrategicInsights onSimulate={()=>navigate(3)}/>}
        {!presentation && chapter>0 && <div className="chapter-continue"><button className="text-button" onClick={()=>navigate(chapter-1)}>Previous chapter</button>{chapter<chapters.length-1 && <button className="primary-action" onClick={()=>navigate(chapter+1)}>Continue to {chapters[chapter+1].name}</button>}</div>}
      </div>
    </main>
    <footer className="app-footer"><div className="footer-provenance"><span className="footer-symbol">Q</span><span>HISTORICAL EVIDENCE. INFORMED QUESTIONS.</span></div><div className="footer-actions"><button onClick={()=>setPaused(p=>!p)} aria-pressed={reduced} disabled={systemReduced}>{systemReduced?'Reduced motion':paused?'Resume motion':'Pause motion'}</button><button ref={notesTrigger} onClick={()=>setNotes(true)}>Model & sources</button><span className="keyboard-hint"><kbd>←</kbd><kbd>→</kbd> chapters <kbd>F</kbd> present</span></div></footer>
    {presentation && <div className="presentation-dock" aria-label="Presentation chapter controls"><button disabled={chapter===0} onClick={()=>navigate(chapter-1)}>Previous</button><span>{chapter+1} / {chapters.length} <i>·</i> {chapters[chapter].name} <small>{chapters[chapter].time}</small></span><button disabled={chapter===chapters.length-1} onClick={()=>navigate(chapter+1)}>Next</button></div>}
    <span className="sr-only" aria-live="polite">Chapter {chapter+1}: {chapters[chapter].name}</span>
    {notes && <ModelNotes onClose={()=>setNotes(false)}/>}
  </div>;
}
