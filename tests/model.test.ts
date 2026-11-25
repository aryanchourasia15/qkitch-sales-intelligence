import { describe, it, expect } from 'vitest';
import { baseline, coefficients, contributions, data, predict, predictors, rows } from '../src/lib/model';
import { edgeWidth, particlePosition } from '../src/lib/network';
import { predictorKeys } from '../src/types/model';
import report from '../src/data/validation-report.json';

describe('Excel model fidelity',()=>{
  it('reproduces every authoritative historical fit and residual',()=>{
    expect(rows).toHaveLength(23);
    rows.forEach(row=>{
      expect(predict(row)).toBeCloseTo(row.fitted,9);
      expect(row.sales-predict(row)).toBeCloseTo(row.residual,9);
    });
  });
  it('uses Q24 model prediction as baseline',()=>{
    expect(baseline.obs).toBe(24);
    expect(predict(baseline)).toBeCloseTo(386.231693806404,10);
    expect(predict(baseline)).not.toBe(baseline.sales);
  });
  it('decomposes a mixed scenario exactly into b times input changes',()=>{
    const scenario={prom:25,adv:45,prom_lag1:20,adv_lag1:30,index:105,cold:0};
    const parts=contributions(scenario);
    expect(parts.reduce((sum,c)=>sum+c.delta,0)).toBeCloseTo(predict(scenario)-predict(baseline),10);
    for(const p of predictors) {
      const changed={...baseline,[p.key]:baseline[p.key]+(p.key==='cold'?-1:1)};
      expect(predict(changed)-predict(baseline)).toBeCloseTo(p.coefficient*(p.key==='cold'?-1:1),10);
    }
  });
  it('preserves two-quarter effects and break-even assumptions',()=>{
    const advertising=coefficients[2].coefficient+coefficients[4].coefficient;
    const promotion=coefficients[1].coefficient+coefficients[3].coefficient;
    expect(advertising).toBeCloseTo(data.decision.advertisingTwoQuarter,12);
    expect(promotion).toBeCloseTo(data.decision.promotionTwoQuarter,12);
    expect(1/advertising).toBeCloseTo(data.decision.advertisingBreakEvenMargin,12);
    expect(1/promotion).toBeCloseTo(data.decision.promotionBreakEvenMargin,12);
  });
  it('reconstructs fit statistics from residuals using 16 residual df',()=>{
    const mean=rows.reduce((s,r)=>s+r.sales,0)/23;
    const sse=rows.reduce((s,r)=>s+r.residual**2,0);
    const sst=rows.reduce((s,r)=>s+(r.sales-mean)**2,0);
    expect(1-sse/sst).toBeCloseTo(data.stats.rSquared,12);
    expect(1-(sse/16)/(sst/22)).toBeCloseTo(data.stats.adjustedRSquared,12);
    expect(Math.sqrt(sse/16)).toBeCloseTo(data.stats.residualStandardError,10);
  });
  it('rejects nonfinite predictors and invalid seasonality',()=>{
    expect(()=>predict({...baseline,prom:NaN})).toThrow();
    expect(()=>predict({...baseline,index:Infinity})).toThrow();
    expect(()=>predict({...baseline,cold:.5})).toThrow();
  });
  it('retains a passing extraction report tied to the workbook fingerprint',()=>{
    expect(report.passed).toBe(true);
    expect(report.formulaCellsValidated).toBe(383);
    expect(report.checks.every(c=>c.passed)).toBe(true);
    expect(report.workbookSHA256).toBe(data.source.sha256);
  });
});
describe('Honest network encoding',()=>{
  it('standardizes all coefficients using sample SD on the fitted sample',()=>{
    const sd=(a:number[])=>{const m=a.reduce((s,v)=>s+v,0)/a.length;return Math.sqrt(a.reduce((s,v)=>s+(v-m)**2,0)/(a.length-1));};
    predictors.forEach(p=>expect(p.standardizedBeta).toBeCloseTo(p.coefficient*sd(rows.map(r=>r[p.key]))/sd(rows.map(r=>r.sales)),12));
    expect(edgeWidth(Math.abs(predictors[0].standardizedBeta))).toBeGreaterThan(edgeWidth(Math.abs(predictors[5].standardizedBeta)));
  });
  it('has six predictor clusters with 23 distinct finite observation positions each',()=>{
    expect(predictorKeys).toHaveLength(6);
    for(const key of predictorKeys) {
      const points=rows.map(r=>particlePosition(key,r.obs,0,true));
      expect(new Set(points.map(p=>`${p.x},${p.y}`)).size).toBe(23);
      expect(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))).toBe(true);
      expect(particlePosition(key,24,0,true)).toEqual(particlePosition(key,24,9999,true));
    }
  });
});
