import { researchQuestion } from '../lib/presentation';
import { data, format } from '../lib/model';

export default function BusinessQuestion({ onExplore }: { onExplore: () => void }) {
  return <section className="business-question" aria-labelledby="question-title">
    <p className="eyebrow cyan">BUSINESS QUESTION · A 6–7 MINUTE DISCUSSION</p>
    <h1 id="question-title">Sales, <span className="serif-word">connected.</span></h1>
    <p className="research-question">{researchQuestion}</p>
    <p className="question-context">A historical model can help management separate spending timing, market context and seasonal associations—then frame decisions worth testing.</p>
    <div className="question-evidence"><div><strong>24</strong><span>observed quarters</span></div><div><strong>{data.stats.observations}</strong><span>quarters used in the model</span></div><div><strong>{format(data.stats.rSquared*100,2)}%</strong><span>historical variance explained, in-sample</span></div></div>
    <div className="story-preview"><p><span>Understand</span> Explore six conditional sales associations.</p><p><span>Challenge</span> Examine fit and its limits.</p><p><span>Evaluate</span> Compare scenarios and define the next test.</p></div>
    <div className="question-action"><button className="primary-action" onClick={onExplore}>Explore the Sales Network</button><span>Historical associations guide questions; they do not establish causal results.</span></div>
    <p className="source-ref">Sources: Data!A2:L25; Model output!B6, B9. Quarter 1 is excluded from regression because lagged spending is unavailable.</p>
  </section>;
}
