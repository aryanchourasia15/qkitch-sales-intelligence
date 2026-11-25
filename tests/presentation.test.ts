import { describe, expect, it } from 'vitest';
import { baseline, predict, predictors } from '../src/lib/model';
import { chapters, presentationInputs } from '../src/lib/presentation';

describe('Presentation simulator preserves the Excel engine',()=>{
  it('fixes every historical/external predictor at Q24, without mutating advanced inputs',()=>{
    const advanced={prom:25,adv:45,prom_lag1:0,adv_lag1:57,index:96,cold:0};
    const snapshot={...advanced};
    expect(presentationInputs(advanced)).toEqual({prom:25,adv:45,prom_lag1:42.3,adv_lag1:36,index:114,cold:1});
    expect(advanced).toEqual(snapshot);
    expect(predict(advanced)).not.toBe(predict(presentationInputs(advanced)));
  });
  it('reproduces Q24 baseline to full numerical precision',()=>{
    expect(predict(presentationInputs(baseline))).toBeCloseTo(386.231693806404,10);
  });
  it.each([[0,0],[50.1,57],[25,45],[11.4,39]])('matches the unchanged model and exact spending delta at promotion %s, advertising %s',(prom,adv)=>{
    const inputs=presentationInputs({...baseline,prom,adv,prom_lag1:10,adv_lag1:20,index:96,cold:0});
    const promotion=predictors.find(p=>p.key==='prom')!.coefficient;
    const advertising=predictors.find(p=>p.key==='adv')!.coefficient;
    expect(predict(inputs)).toBeCloseTo(predict({...baseline,prom,adv}),12);
    expect(predict(inputs)-predict(baseline)).toBeCloseTo(promotion*(prom-baseline.prom)+advertising*(adv-baseline.adv),10);
  });
  it('provides the requested sequence with a 6:30 recommended duration',()=>{
    expect(chapters.map(c=>c.name)).toEqual(['Business Question','Sales Network','Model Validation','Decision Simulator','Strategic Insights']);
    const seconds=chapters.reduce((s,c)=>{const [m,t]=c.time.split(':').map(Number);return s+m*60+t;},0);
    expect(seconds).toBe(390);
  });
});
