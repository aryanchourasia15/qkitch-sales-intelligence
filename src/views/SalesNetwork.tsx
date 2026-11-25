import { useState } from 'react';
import { data, format, intercept, meta, pValue, predictors, signed } from '../lib/model';
import type { Predictor } from '../types/model';
import Network from '../components/Network';
import QuarterExplorer from '../components/QuarterExplorer';
import { researchQuestion } from '../lib/presentation';

export default function SalesNetwork({ quarter, onQuarter, reduced, onSimulate }: { quarter: number; onQuarter: (q: number) => void; reduced: boolean; onSimulate: () => void }) {
  const [selected, setSelected] = useState<Predictor>('prom');
  const [hovered, setHovered] = useState<number | null>(null);
  const c = predictors.find(p => p.key === selected)!;
  const details = meta[selected];
  return <>
    <div className="chapter-heading network-heading">
      <div><p className="eyebrow cyan">THE SALES NETWORK</p><h1>Sales, <span className="serif-word">connected.</span></h1><p className="chapter-deck">{researchQuestion}</p></div>
      <div className="heading-note"><span className="small-line" /><span>A statistical lens on<br />QKitch’s growth decisions.</span></div>
    </div>
    <div className="network-layout">
      <Network selected={selected} onSelect={setSelected} quarter={quarter} onQuarter={onQuarter} activeQuarter={hovered ?? quarter} onHover={setHovered} reduced={reduced} />
      <aside className="coefficient-panel" style={{ '--accent': details.color } as React.CSSProperties} aria-label="Selected association">
        <div className="panel-kicker"><span className="eyebrow">REGRESSION COEFFICIENT · b</span><span className="association-sign">{c.coefficient > 0 ? '+' : '−'}</span></div>
        <p className="muted tiny">{details.group}</p><h2>{details.label}</h2>
        <div className="coefficient-value" data-testid="coefficient-value">{signed(c.coefficient, 4)}</div>
        <p className="muted small">$k sales / {selected === 'cold' ? 'change from 0 to 1' : `1 ${details.unit} input`}</p>
        <p className="interpretation">{details.interpretation}</p>
        <dl className="coefficient-diagnostics"><div><dt title="Evidence against a zero coefficient under the regression assumptions; not a probability of causation.">p-value</dt><dd>{pValue(c.pValue)}</dd></div><div><dt title="95% interval for this conditional coefficient, under the regression assumptions. Not a sales prediction interval.">95% confidence interval</dt><dd>[{format(c.lower95, 4)}, {format(c.upper95, 4)}]</dd></div><div><dt title="A unitless coefficient scale used for the six line widths. Neither causal importance nor variance explained.">Standardized link scale β*</dt><dd>{signed(c.standardizedBeta, 4)}</dd></div></dl>
        {['prom','adv','prom_lag1','adv_lag1'].includes(selected) && <button className="network-simulator-link" onClick={onSimulate}>Explore spending in the simulator</button>}
        <p className="source-ref">Source: {c.source}</p>
        <details className="precision-details"><summary>Full precision & diagnostics</summary><dl>{[['Coefficient', c.coefficient], ['Standard error', c.standardError], ['t-statistic', c.tStatistic], ['p-value', c.pValue], ['Lower 95%', c.lower95], ['Upper 95%', c.upper95]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></details>
      </aside>
    </div>
    <QuarterExplorer quarter={quarter} activeQuarter={hovered ?? quarter} onQuarter={onQuarter} />
    <div className="network-footnotes">
      <div className="edge-legend"><span><i className="solid-line" />Positive</span><span><i className="dashed-line" />Negative</span><span>Width scales with |β*|</span></div>
      <p>Six model links; fine light trails are decorative. β* = b × SD(input) / SD(sales), quarters 2–24. Neither causal importance nor a share of variance explained.</p>
    </div>
    <details className="method-detail"><summary>How to read this network</summary><p>The hub shows sales estimated by the model for the selected historical quarter. Each surrounding group is one input. The signed coefficient b describes the change in modeled sales for a one-unit input change, holding other inputs fixed; its units differ across predictors. The separate β* label standardizes those coefficients for comparable line widths.</p><p>Only the six main predictor-to-sales connections represent model associations. Fine particle-to-hub trails are decorative light filaments along those same spokes, not additional measured relationships. Each cluster contains 23 historical quarter particles; hovering highlights the same quarter in every cluster. Particle positions, distances, glow and movement are aesthetic. Selecting a quarter changes the hub’s fitted value, not the coefficients or connection widths. Seasonality is binary, so its standardized coefficient needs care when comparing with continuous inputs.</p><p>The intercept is {intercept.coefficient} ($k). R² = {data.stats.rSquared} is in-sample. All predictor interpretations hold the other five predictors fixed.</p></details>
  </>;
}
