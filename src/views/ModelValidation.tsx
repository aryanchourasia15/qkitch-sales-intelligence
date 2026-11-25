import { useState } from 'react';
import { CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { data, format, money, rows, signed } from '../lib/model';

const grid = '#ffffff09';
const axis = { fontSize: 12, fill: '#97a3b8', fontFamily: 'DM Sans' };
function SalesTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="chart-tooltip"><p className="eyebrow">QUARTER {row.obs}</p><p>Actual <strong>{money(row.sales, 2)}</strong></p><p>Fitted <strong>{money(row.fitted, 2)}</strong></p><p>Residual <strong>{signed(row.residual)}k</strong></p></div>;
}
function ResidualTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return <div className="chart-tooltip"><p className="eyebrow">QUARTER {row.obs}</p><p>Fitted <strong>{money(row.fitted, 2)}</strong></p><p>Residual <strong>{signed(row.residual)}k</strong></p></div>;
}

export default function ModelValidation({ quarter, onQuarter, reduced }: { quarter: number; onQuarter: (q: number) => void; reduced: boolean }) {
  const [residualView, setResidualView] = useState<'time' | 'fitted'>('time');
  const current = rows.find(r => r.obs === quarter)!;
  return <>
    <div className="chapter-heading"><div><p className="eyebrow violet">MODEL VALIDATION</p><h1>A close fit.<br className="mobile-break" /><span className="validation-title-space"> </span><span className="serif-word">An honest lens.</span></h1><p className="chapter-deck">How well does the model explain the sales we have already observed?</p></div><span className="context-badge">IN-SAMPLE FIT · Q2–Q24</span></div>
    <section className="fit-metrics" aria-label="In-sample fit statistics">
      {[
        ['R²', format(data.stats.rSquared,4), 'Historical variance explained'],
        ['Adjusted R²', format(data.stats.adjustedRSquared,4), 'Accounts for six predictors'],
        ['Residual standard error', money(data.stats.residualStandardError,2), '√(residual SS / 16)'],
        ['Observations', String(data.stats.observations), '23 quarters · 16 residual df'],
      ].map(([label,value,note]) => <div key={label}><span className="eyebrow">{label}</span><strong>{value}</strong><span className="muted small">{note}</span></div>)}
    </section>
    <section className="chart-section">
      <div className="section-heading"><div><h2>History, reconstructed.</h2><p className="muted small">Actual and fitted quarterly sales · $ thousands</p></div><div className="chart-legend"><span><i className="legend-line cyan-bg" />Actual</span><span><i className="legend-line violet-bg" />Fitted</span></div></div>
      <div className="sales-chart" data-testid="actual-fitted-chart">
        <ResponsiveContainer width="100%" height="100%"><ComposedChart data={rows} margin={{ left: 0, right: 20, top: 20, bottom: 5 }} onClick={(event: any) => { const obs=Number(event?.activeLabel); if(rows.some(r=>r.obs===obs)) onQuarter(obs); }} accessibilityLayer>
          <CartesianGrid stroke={grid} vertical={false} /><XAxis dataKey="obs" tick={axis} tickLine={false} axisLine={false} tickFormatter={v=>`Q${v}`} minTickGap={20} /><YAxis tick={axis} tickLine={false} axisLine={false} width={48} domain={[0,800]} />
          <Tooltip content={<SalesTooltip />} cursor={{ stroke: '#c1d3ed35', strokeDasharray:'3 5' }} />
          <ReferenceLine x={quarter} stroke="#c1d3ed40" strokeDasharray="3 5" />
          <Line type="linear" dataKey="sales" stroke="#61e4f0" strokeWidth={2.5} dot={{r:3,fill:'#080b12',strokeWidth:1.5}} activeDot={{r:6}} isAnimationActive={!reduced} animationDuration={500} />
          <Line type="linear" dataKey="fitted" stroke="#ae95ff" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={!reduced} animationDuration={500} />
        </ComposedChart></ResponsiveContainer>
      </div>
      <div className="chart-selection"><label htmlFor="validation-quarter">Inspect quarter <select id="validation-quarter" value={quarter} onChange={e=>onQuarter(Number(e.target.value))}>{rows.map(r=><option key={r.obs} value={r.obs}>Q{r.obs}</option>)}</select></label><span>Actual <strong>{money(current.sales,2)}</strong></span><span>Fitted <strong>{money(current.fitted,2)}</strong></span><span>Residual <strong className={current.residual<0?'coral':'cyan'}>{signed(current.residual)}k</strong></span></div>
      <p className="source-ref">Source: 'Regression input'!A2:B24, I2:J24. Fitted values use the same observations that estimated the model.</p>
    </section>
    <div className="validation-bottom">
      <section className="residual-section"><div className="section-heading"><div><h2>What remains unexplained.</h2><p className="muted small">Residual = actual − fitted · $k</p></div><div className="segmented" aria-label="Residual plot type"><button aria-pressed={residualView==='time'} onClick={()=>setResidualView('time')}>Over time</button><button aria-pressed={residualView==='fitted'} onClick={()=>setResidualView('fitted')}>Vs fitted</button></div></div>
        <div className="residual-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:15,right:20,left:0,bottom:10}} accessibilityLayer>
          <CartesianGrid stroke={grid} vertical={false}/><XAxis type="number" dataKey={residualView==='time'?'obs':'fitted'} domain={residualView==='time'?[2,24]:['auto','auto']} tick={axis} axisLine={false} tickLine={false} tickFormatter={v=>residualView==='time'?`Q${v}`:String(Math.round(v))} /><YAxis type="number" dataKey="residual" domain={[-130,100]} tick={axis} axisLine={false} tickLine={false} width={45}/><ReferenceLine y={0} stroke="#ffffff35" strokeDasharray="4 4"/><Tooltip content={<ResidualTooltip/>}/><Scatter data={rows} fill="#91aeff" isAnimationActive={!reduced} onClick={(point: any)=>point.obs && onQuarter(point.obs)} shape={(props: any)=><circle cx={props.cx} cy={props.cy} r={props.payload.obs===quarter?6:3.5} fill={props.payload.obs===quarter?'#61e4f0':'#91aeff'} fillOpacity={.85}/>}/>
        </ScatterChart></ResponsiveContainer></div><p className="muted tiny">{residualView==='time'?'Quarter sequence':'Fitted sales ($k)'} · Patterns can suggest issues; this plot does not establish that assumptions hold.</p>
      </section>
      <aside className="limitation-note"><span className="eyebrow amber">INTERPRET WITH CARE</span><h2>Explanation is not<br />forecast validation.</h2><p>The model explains 90.12% of historical sales variance in this sample. It has not been evaluated on unseen quarters.</p><p>With 23 observations and 6 predictors, uncertainty remains around stability, time dependence, omitted variables and spending endogeneity.</p><p className="muted small">Residual standard error describes fitted residual variation. It is neither a forecast accuracy guarantee nor a prediction interval.</p></aside>
    </div>
    <details className="method-detail"><summary>Historical observations & complete fit statistics</summary><div className="table-scroll"><table><caption>Source: Regression input!A2:J24 · $ thousands</caption><thead><tr><th>Quarter</th><th>Actual</th><th>Fitted</th><th>Residual</th></tr></thead><tbody>{rows.map(r=><tr key={r.obs} className={r.obs===quarter?'table-selected':''}><th><button onClick={()=>onQuarter(r.obs)}>Q{r.obs}</button></th><td>{format(r.sales)}</td><td title={String(r.fitted)}>{format(r.fitted,6)}</td><td title={String(r.residual)}>{signed(r.residual,6)}</td></tr>)}</tbody></table></div><p>Multiple R: {data.stats.multipleR} · F(6,16): {data.stats.fStatistic} · Significance F: {data.stats.significanceF} · Regression SS: {data.stats.regressionSS} · Residual SS: {data.stats.residualSS}. Source: Model output!B5:B13, J9:K9.</p></details>
  </>;
}
