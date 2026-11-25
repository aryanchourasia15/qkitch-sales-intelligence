import { baseline } from './model';
import type { Inputs } from '../types/model';

export const researchQuestion = 'How can QKitch use historical marketing spending and market conditions to better understand sales and evaluate future decisions?';
export type SimulatorMode = 'presentation' | 'advanced';
// A view of the inputs, not a second model. Advanced assumptions remain stored separately.
export function presentationInputs(inputs: Inputs): Inputs {
  return {
    prom: inputs.prom, adv: inputs.adv,
    prom_lag1: baseline.prom_lag1, adv_lag1: baseline.adv_lag1,
    index: baseline.index, cold: baseline.cold,
  };
}
export const chapters = [
  { name: 'Business Question', time: '0:45' },
  { name: 'Sales Network', time: '1:30' },
  { name: 'Model Validation', time: '1:15' },
  { name: 'Decision Simulator', time: '1:45' },
  { name: 'Strategic Insights', time: '1:15' },
] as const;
