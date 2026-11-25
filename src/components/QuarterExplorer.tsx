import { meta, money, predictors, rows, format } from '../lib/model';
export default function QuarterExplorer({ quarter, activeQuarter, onQuarter }: { quarter: number; activeQuarter: number; onQuarter: (q: number) => void }) {
  const row = rows.find(r => r.obs === activeQuarter)!;
  return <section className="quarter-explorer" aria-label="Linked quarter exploration" data-testid="quarter-explorer">
    <div className="quarter-select">
      <label className="eyebrow" htmlFor="quarter">LINKED OBSERVATION</label>
      <select id="quarter" value={quarter} onChange={e => onQuarter(Number(e.target.value))}>
        {rows.map(r => <option key={r.obs} value={r.obs}>Quarter {r.obs}</option>)}
      </select>
      <span className="muted tiny">{activeQuarter !== quarter ? `Previewing quarter ${activeQuarter}` : 'Same quarter, six clusters'}</span>
    </div>
    <div className="quarter-sales"><span className="eyebrow">OBSERVED SALES</span><strong>{money(row.sales)}</strong><span className="muted tiny">Fitted {money(row.fitted)}</span></div>
    <div className="quarter-values">{predictors.map(p => <div key={p.key}><span><i style={{ background: meta[p.key].color }} />{meta[p.key].short}</span><strong>{p.key === 'cold' ? `${row.cold} · ${row.cold ? 'Cold' : 'Warm'}` : `${format(row[p.key], 1)} ${meta[p.key].unit}`}</strong></div>)}</div>
  </section>;
}
