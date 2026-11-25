import { useState } from 'react';
import { baseline, contributions, data, format, meta, money, predict, predictors, signed } from '../lib/model';
import type { Inputs, Predictor } from '../types/model';
import { presentationInputs, type SimulatorMode } from '../lib/presentation';

const groups: { title: string; caption: string; keys: Predictor[]; className: string }[] = [
  { title: 'Management inputs', caption: 'Spending decisions for this quarter', keys: ['prom','adv'], className: 'management' },
  { title: 'Historical inputs', caption: 'Previous-quarter spend · context, not a current action', keys: ['prom_lag1','adv_lag1'], className: 'historical' },
  { title: 'External conditions', caption: 'Market and season · conditions, not management levers', keys: ['index','cold'], className: 'external' },
];

function InputControl({ name, value, onChange }: { name: Predictor; value: number; onChange: (key: Predictor, value: number) => void }) {
  const p = predictors.find(p=>p.key===name)!;
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const min=p.min, max=p.max;
  function commit() {
    const n=Number(draft);
    if (draft!==null && (draft.trim()==='' || !Number.isFinite(n) || n<min || n>max)) {
      setError(`Enter ${min}–${max}.`); setDraft(null); return;
    }
    if(draft!==null) onChange(name,n);
    setDraft(null); setError('');
  }
  if(name==='cold') return <div className="input-control"><label id="cold-label">Cold-quarter indicator</label><div className="season-toggle" role="group" aria-labelledby="cold-label"><button aria-pressed={value===0} onClick={()=>onChange(name,0)}>0 · Q2 / Q3</button><button aria-pressed={value===1} onClick={()=>onChange(name,1)}>1 · Q1 / Q4</button></div><span className="muted tiny">1 in Q1 or Q4, otherwise 0</span></div>;
  return <div className="input-control"><div className="input-label"><label htmlFor={`input-${name}`}>{name==='prom' || name==='adv' ? meta[name].short : meta[name].label}</label><div className="number-field"><input id={`input-${name}`} aria-label={meta[name].label} type="number" min={min} max={max} step={name==='index'?1:.1} value={draft ?? value} onChange={e=>setDraft(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter') {commit();e.currentTarget.blur();}}}/><span>{meta[name].unit}</span></div></div><input className="range-control" aria-label={`${meta[name].label} slider`} type="range" min={min} max={max} step={name==='index'?1:.1} value={value} style={{'--fill':`${(value-min)/(max-min)*100}%`,'--range-accent':meta[name].color} as React.CSSProperties} onChange={e=>{onChange(name,Number(e.target.value));setDraft(null);setError('');}}/><div className="range-labels"><span>{min}</span><span>{max}</span></div>{error && <span className="input-error" role="alert">{error}</span>}</div>;
}

export default function DecisionSimulator({ inputs, setInputs, mode, onMode, onInsights }: { inputs: Inputs; setInputs: React.Dispatch<React.SetStateAction<Inputs>>; mode: SimulatorMode; onMode: (mode: SimulatorMode) => void; onInsights: () => void }) {
  const [resetKey, setResetKey] = useState(0);
  const simple=mode==='presentation';
  const effectiveInputs=simple?presentationInputs(inputs):inputs;
  const result=predict(effectiveInputs), reference=predict(baseline), delta=result-reference;
  const bridge=contributions(effectiveInputs);
  const maxDelta=Math.max(50,...bridge.map(c=>Math.abs(c.delta)));
  const dirty=predictors.some(c=>effectiveInputs[c.key]!==baseline[c.key]);
  function update(key: Predictor, value: number) {setInputs(previous=>({...previous,[key]:value}));}
  function reset() {setInputs({...baseline});setResetKey(k=>k+1);}
  return <div className={`simulator-view ${simple?'simple-simulator':''}`}>
    <div className="chapter-heading"><div><p className="eyebrow emerald">DECISION SIMULATOR</p><h1>Explore the <span className="serif-word">possibilities.</span></h1><p className="chapter-deck">Change assumptions. Trace the arithmetic. Frame the next question to test.</p></div><span className="context-badge">MODEL-BASED SCENARIO</span></div>
    <div className="simulator-mode-bar"><div className="segmented" role="group" aria-label="Simulator interface mode"><button aria-pressed={simple} onClick={()=>onMode('presentation')}>Presentation mode</button><button aria-pressed={!simple} onClick={()=>onMode('advanced')}>Advanced mode</button></div><p>{simple?'Two spending controls; all other inputs fixed at Quarter 24.':'All six model inputs. Advanced assumptions are retained when switching modes.'}</p></div>
    <div className="simulator-layout">
      <section className="scenario-controls" aria-label="Scenario inputs" key={`${mode}-${resetKey}`}>
        <div className="section-heading"><h2>Define your scenario</h2><button className="text-button" onClick={reset}>Reset to Q24</button></div>
        {(simple?groups.slice(0,1):groups).map(g=><fieldset className={`input-group ${g.className}`} key={g.title}><legend>{g.title}</legend><p className="muted small">{g.caption}</p><div className="input-pair">{g.keys.map(k=><InputControl key={k} name={k} value={effectiveInputs[k]} onChange={update}/>)}</div></fieldset>)}
        {simple && <><p className="fixed-context" data-testid="fixed-context"><strong>Fixed Quarter 24 context</strong>Prior promotion {baseline.prom_lag1}k · Prior advertising {baseline.adv_lag1}k · Market index {baseline.index} · Cold-quarter flag {baseline.cold}<span>Other inputs stay fixed. Observed ranges do not establish support for every scenario.</span></p><div className="current-effects"><h3>Current-quarter interpretation</h3>{predictors.filter(p=>p.key==='prom'||p.key==='adv').map(p=><p key={p.key}><strong>{meta[p.key].short}:</strong> {money(p.coefficient,4)} higher modeled sales per additional $1k this quarter, other inputs fixed.</p>)}<p className="source-ref">Model output!B17:B18. Conditional associations, not proven incremental returns.</p></div></>}
        <p className="muted small scenario-range-note">Controls use observed Q2–Q24 ranges. A combination of individually observed values may still be historically unsupported.{!simple && ' Historical controls describe an alternate history.'}</p>
      </section>
      <section className="scenario-result" aria-label="Model scenario result" data-testid="scenario-result" data-mode={mode} data-prom-lag1={effectiveInputs.prom_lag1} data-adv-lag1={effectiveInputs.adv_lag1} data-index={effectiveInputs.index} data-cold={effectiveInputs.cold}>
        <span className="eyebrow emerald">SIMULATED QUARTERLY SALES</span><div className="scenario-sales" data-testid="scenario-sales" data-value={result}>{money(result,2)}</div><div className={`scenario-delta ${delta<0?'coral':'emerald'}`} data-testid="scenario-delta">{signed(delta,2)}k <span>({signed(delta/reference*100,2)}%) vs baseline</span></div>
        <p className="scenario-warning">Model-based scenario, not a guaranteed causal result. No out-of-sample forecast validation.</p>
        <div className="baseline-definition"><span className="eyebrow">REFERENCE · QUARTER 24</span><strong>{money(reference,2)} fitted sales</strong><p>Promotion 11.4 · Advertising 39<br />Prior promotion 42.3 · Prior advertising 36<br />Index 114 · Cold 1</p><p className="muted tiny">Differences compare two model predictions. Q24’s observed sales were {money(baseline.sales,2)}.</p></div>
        {!simple && <div className="bridge"><h3>Where the difference comes from</h3><p className="muted tiny">Additive model contributions: b × change in input</p>{bridge.map(c=><div className="bridge-row" key={c.key}><span>{meta[c.key].short}</span><div className="bridge-track"><i className={c.delta<0?'negative':'positive'} style={{width:`${Math.abs(c.delta)/maxDelta*50}%`}}/></div><strong>{signed(c.delta,2)}k</strong></div>)}<div className="bridge-total"><span>Combined difference</span><strong>{signed(delta,2)}k</strong></div></div>}
        {!dirty && <p className="muted small">Start with a current spending input to explore a change.</p>}
        {result<0 && <p className="input-error">The linear model implies negative sales for this input combination. Treat this as evidence of model limitations, not a feasible sales forecast.</p>}
        <details className="precision-details"><summary>Full-precision prediction</summary><p data-testid="precise-prediction">{result} ($k). Intercept: {data.coefficients[0].coefficient}. Every coefficient comes directly from Model output!B16:B22.</p></details>
      </section>
    </div>
    <section className="decision-effects"><div className="section-heading"><div><p className="eyebrow amber">THE TWO-QUARTER LENS</p><h2>Separate two-quarter interpretation.</h2></div><p className="muted small">A separate workbook calculation.<br />These are not the scenario’s total sales.</p></div><div className="effect-columns">{[
      {label:'Advertising',effect:data.decision.advertisingTwoQuarter,margin:data.decision.advertisingBreakEvenMargin,current:data.coefficients[2].coefficient,lag:data.coefficients[4].coefficient,source:'B18+B20; B26; B28'},
      {label:'Promotion',effect:data.decision.promotionTwoQuarter,margin:data.decision.promotionBreakEvenMargin,current:data.coefficients[1].coefficient,lag:data.coefficients[3].coefficient,source:'B17+B19; B27; B29'},
    ].map(e=><article key={e.label}><h3>{e.label}</h3><div className="effect-numbers"><div><strong>{format(e.effect,4)}×</strong><span>Net two-quarter sales association<br />per $1k incremental spend</span></div><div><strong>{format(e.margin*100,2)}%</strong><span>Break-even<br />gross margin</span></div></div><p className="muted small">{format(e.current,4)} current {e.lag<0?'−':'+'} {format(Math.abs(e.lag),4)} next quarter = {format(e.effect,4)} ($k sales per $1k spend).</p><p className="source-ref">Model output!{e.source}</p></article>)}</div><details className="method-detail"><summary>Assumptions behind the break-even thresholds</summary><p>A one-quarter $1k spending increment is associated with a current-quarter change and a next-quarter change through the one-quarter lag. The two coefficients are summed, holding other inputs fixed and assuming the fitted linear relation applies. This does not independently specify future market conditions or future baseline sales.</p><p>Break-even gross margin = 1 / net two-quarter sales per dollar spent. This assumes incremental gross profit = gross margin × incremental sales − spending, with no other incremental costs or discounting. The workbook gives no gross margin; these thresholds do not establish profit or ROI. Uncertainty for the sum of coefficients is not supplied.</p></details></section>
    {simple && <p className="two-quarter-caveat">One-quarter spending increment, current and lagged coefficients summed; other inputs fixed. Thresholds assume no additional incremental costs or discounting. The workbook supplies no actual gross margin or uncertainty for these sums.</p>}
    {!simple && <section className="management-question"><span className="eyebrow">A MANAGEMENT QUESTION TO TEST</span><p>Does advertising’s positive lagged association persist in a controlled test, and does the actual gross margin clear the modeled threshold?</p><span className="muted small">Also examine promotion timing and possible next-quarter displacement. The workbook does not establish an optimal budget allocation.</span></section>}
    <div className="simulator-conclude"><button className="text-button" onClick={onInsights}>Conclude with Strategic Insights</button></div>
  </div>;
}
